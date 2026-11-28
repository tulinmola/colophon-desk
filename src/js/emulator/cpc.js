import CpcPicture from "./cpc_picture"
import createModule from "./module"
import fetchFirmware from "./firmware"

// A tab hidden for an hour owes an hour of emulation. The machine loses the
// time instead, as one switched off would.
const MAXIMUM_DEBT_MILLISECONDS = 80

// Port B's bits 1 to 3 read "Not option link LK1…LK3", a link fitted reading 0
// [A], SOFT 968: https://archive.org/details/SOFT968TheAmstrad6128FirmwareManual.
// The firmware reads them, inverted, as the number of the name it starts up
// with, past one it never shows: Amstrad's with no link fitted, Schneider's
// with LK2 alone. Bread80's disassembly of the 6128's firmware, Machine.asm at
// &0723: https://github.com/Bread80/CPC6128-Firmware-Source/blob/60cefd64623a91b38657a0c1091385e53c6097df/Machine.asm
const AMSTRAD = 0b111,
  SCHNEIDER = 0b101

// The 6128 in each language its keys were lettered in, with its firmware and
// the maker its board names. The German machines were Schneider's, with the UK
// firmware and keyboard: Schneider's own Handbuch prints the UK key table, Kap.
// 7 S. 22, and starts up "Schneider 128K Microcomputer (v3)" [A],
// https://archive.org/details/Schneider_CPC6128_Handbuch_1985_Schneider_Computer_Division_DE;
// "Amazingly German CPCs didn't have German keyboard layouts" [C],
// https://web.archive.org/web/20210601095905/http://www.cpcwiki.eu/index.php/Schneider
const VERSIONS = {
    en: { image: "cpc6128", maker: AMSTRAD },
    es: { image: "cpc6128es", maker: AMSTRAD },
    fr: { image: "cpc6128fr", maker: AMSTRAD },
    de: { image: "cpc6128", maker: SCHNEIDER }
  },
  DISC_IMAGE = "amsdos"

const BITS_A_LINE = 8

const TEXT = new TextDecoder()

export default class Cpc {
  picture

  // One entry a matrix position, 1 where the machine holds a key down.
  keys

  // The room a disc is given here, which an image must stand inside.
  discCapacity

  // Whether the machine is switched on. One switched off is not a machine
  // standing idle: it is gone, and switching on makes another.
  running = true

  #debt = 0
  #discAt
  #last
  #maker
  #matrix
  #module
  #pendingReleases = new Set()
  #presentCount = 0
  #pressedAt = new Map()
  #soundAt
  #ticksPerFrame
  #ticksPerMillisecond

  static async create(signal, { anisotropy, language }) {
    const { image, maker } = VERSIONS[language],
      module = await createModule(),
      fetching = [fetchFirmware(image, signal), fetchFirmware(DISC_IMAGE, signal)],
      // An image answering to its pin is the length that pin was taken over,
      // so the room it lands in is settled before it is fetched.
      [rom, amsdos] = await Promise.all(fetching),
      romAt = module._desk_rom(),
      amsdosAt = module._desk_amsdos()

    module.HEAPU8.set(rom, romAt)
    module.HEAPU8.set(amsdos, amsdosAt)
    module._desk_make_resampler()
    module._desk_boot_cpc6128(maker)

    return new Cpc(module, { anisotropy, maker })
  }

  constructor(module, { anisotropy, maker }) {
    const framebufferAt = module._desk_framebuffer(),
      columns = module._desk_framebuffer_width(),
      rows = module._desk_framebuffer_height(),
      // The module's memory never grows — desk.c holds all of it in fixed
      // storage — so the view taken here stays good for the machine's life.
      framebuffer = module.HEAPU8.subarray(framebufferAt, framebufferAt + columns * rows),
      rgb = code => module._desk_rgb(code),
      matrixAt = module._desk_keyboard(),
      lines = module._desk_keyboard_lines()

    this.picture = new CpcPicture(framebuffer, { columns, rows, rgb, anisotropy })
    this.keys = new Array(lines * BITS_A_LINE)
    this.#matrix = module.HEAPU8.subarray(matrixAt, matrixAt + lines)
    this.#discAt = module._desk_disc()
    this.#soundAt = module._desk_sound() / Float32Array.BYTES_PER_ELEMENT
    this.discCapacity = module._desk_disc_capacity()
    this.#maker = maker
    this.#module = module
    this.#ticksPerFrame = module._desk_ticks_per_frame()
    this.#ticksPerMillisecond = module._desk_ticks_per_millisecond()
    this.#last = performance.now()
    this.#readKeys()
  }

  pressKey(key) {
    this.#pendingReleases.delete(key)
    this.#pressedAt.set(key, this.#presentCount)
    this.#module._desk_press(key)
  }

  // The firmware reads the matrix once a frame, so a key pressed and let go
  // between two reads was never pressed at all.
  releaseKey(key) {
    const seen = this.#presentCount > this.#pressedAt.get(key)

    if (seen) {
      this.#pressedAt.delete(key)
      this.#module._desk_release(key)
    } else {
      this.#pendingReleases.add(key)
    }
  }

  releaseAllKeys() {
    this.#pressedAt.clear()
    this.#pendingReleases.clear()
    this.#module._desk_release_all()
    this.#readKeys()
  }

  // An image with no room for it is never written: it would run past the
  // disc's buffer into the machine's other storage.
  insertDisc(bytes) {
    const module = this.#module,
      fits = bytes.length <= this.discCapacity

    if (fits) {
      module.HEAPU8.set(bytes, this.#discAt)
    }

    const inserted = module._desk_insert_disc(bytes.length)

    return inserted != 0
  }

  ejectDisc() {
    this.#module._desk_eject_disc()
  }

  driveInUse() {
    const working = this.#module._desk_drive_in_use()

    return working != 0
  }

  discProblem() {
    const heap = this.#module.HEAPU8,
      at = this.#module._desk_disc_problem(),
      reported = at != 0

    if (!reported) {
      return null
    }

    const end = heap.indexOf(0, at),
      sentence = heap.subarray(at, end)

    return TEXT.decode(sentence)
  }

  // The socket heard from now on, at the rate given in samples a second.
  listen(rate) {
    this.#module._desk_listen(rate)
  }

  stopListening() {
    this.#module._desk_stop_listening()
  }

  setListeningRate(rate) {
    this.#module._desk_set_listening_rate(rate)
  }

  // What the socket sounded since it was last heard, its two sides
  // interleaved, good until the machine next runs.
  hear() {
    const samples = this.#module._desk_hear(),
      start = this.#soundAt

    return this.#module.HEAPF32.subarray(start, start + samples)
  }

  // The machine's own power, which the disc in its drive outlives.
  switchOff() {
    this.running = false
    this.releaseAllKeys()
    this.#module._desk_blank_picture()
    this.picture.refresh()
  }

  switchOn() {
    this.running = true
    this.#debt = 0
    this.#last = performance.now()
    this.#module._desk_boot_cpc6128(this.#maker)
    this.#readKeys()
    this.picture.refresh()
  }

  advance(now) {
    const off = !this.running

    if (off) {
      return
    }

    const owed = (now - this.#last) * this.#ticksPerMillisecond,
      maximum = MAXIMUM_DEBT_MILLISECONDS * this.#ticksPerMillisecond

    this.#debt = Math.min(this.#debt + owed, maximum)
    this.#last = now

    let drew = false
    while (this.#debt > 0) {
      // A frame's worth of slack past the debt lets the frame standing finish,
      // and is what tells a retrace from a limit that simply ran out.
      const limit = Math.ceil(this.#debt) + this.#ticksPerFrame,
        ticks = this.#module._desk_run_until_retrace(limit)

      this.#debt -= ticks
      drew = true
    }

    if (drew) {
      this.#present()
    }
  }

  dispose() {
    this.picture.dispose()
  }

  #present() {
    this.#presentCount++
    // Read before the waiting releases are let go, so the caps stand on what
    // the machine held through the frame now reaching the glass: a key tapped
    // inside one frame is down for exactly that frame.
    this.#readKeys()

    for (const key of this.#pendingReleases) {
      this.#pressedAt.delete(key)
      this.#module._desk_release(key)
    }

    this.#pendingReleases.clear()
    this.picture.refresh()
  }

  #readKeys() {
    for (let line = 0; line < this.#matrix.length; line++) {
      const byte = this.#matrix[line]

      for (let bit = 0; bit < BITS_A_LINE; bit++) {
        const down = (byte & (1 << bit)) == 0

        this.keys[line * BITS_A_LINE + bit] = down ? 1 : 0
      }
    }
  }
}
