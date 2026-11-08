import CpcPicture from "./cpc_picture"
import createModule from "./module"
import fetchFirmware from "./firmware"

// A tab hidden for an hour owes an hour of emulation. The machine loses the
// time instead, as one switched off would.
const MAXIMUM_DEBT_MILLISECONDS = 80

// Each machine boots the Spanish firmware its keys are lettered for, and AMSDOS
// beside it where it has a disc interface: a 6128 has its own soldered in, and
// a 464 has one only when it is given one.
const MACHINES = {
    cpc6128: { firmware: "cpc6128es", disc: "amsdos", boot: module => module._desk_boot_cpc6128() },
    cpc464: { firmware: "cpc464es", disc: null, boot: module => module._desk_boot_cpc464(false) }
  },
  // The disc interfaces each machine may be given, by the names a desk names
  // them under: a 464 takes the DDI-1's on its FLOPPY DISC edge connector.
  DISC_INTERFACES = {
    cpc6128: {},
    cpc464: { ddi1: { disc: "amsdos", boot: module => module._desk_boot_cpc464(true) } }
  }

const BITS_A_LINE = 8

const TEXT = new TextDecoder()

export default class Cpc {
  picture

  // One entry a matrix position, 1 where the machine holds a key down.
  keys

  // The room a disc is given here, which an image must stand inside.
  discCapacity

  // The room a tape is given here, which an image must stand inside.
  tapeCapacity

  // Whether the machine is switched on. One switched off is not a machine
  // standing idle: it is gone, and switching on makes another.
  running = true

  #debt = 0
  #discAt
  #boot
  #last
  #matrix
  #module
  #pendingReleases = new Set()
  #presentCount = 0
  #pressedAt = new Map()
  #tapeAt
  #ticksPerFrame
  #ticksPerMillisecond

  static async create(signal, anisotropy, machine, discInterface) {
    const module = await createModule(),
      { firmware } = MACHINES[machine],
      fitted = discInterface != null,
      { disc, boot } = fitted ? DISC_INTERFACES[machine][discInterface] : MACHINES[machine],
      fetching = [fetchFirmware(firmware, signal), disc ? fetchFirmware(disc, signal) : null],
      // An image answering to its pin is the length that pin was taken over,
      // so the room it lands in is settled before it is fetched.
      [rom, amsdos] = await Promise.all(fetching),
      romAt = module._desk_rom()

    module.HEAPU8.set(rom, romAt)

    if (amsdos) {
      const amsdosAt = module._desk_amsdos()

      module.HEAPU8.set(amsdos, amsdosAt)
    }

    boot(module)

    return new Cpc(module, anisotropy, boot)
  }

  constructor(module, anisotropy, boot) {
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
    this.discCapacity = module._desk_disc_capacity()
    this.#tapeAt = module._desk_tape()
    this.tapeCapacity = module._desk_tape_capacity()
    this.#module = module
    this.#boot = boot
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
    const at = this.#module._desk_disc_problem()

    return this.#sentenceAt(at)
  }

  // An image with no room for it is never written, as a disc's is not.
  insertTape(bytes) {
    const module = this.#module,
      fits = bytes.length <= this.tapeCapacity

    if (fits) {
      module.HEAPU8.set(bytes, this.#tapeAt)
    }

    const inserted = module._desk_insert_tape(bytes.length)

    return inserted != 0
  }

  ejectTape() {
    this.#module._desk_eject_tape()
  }

  engageTape(engaged) {
    this.#module._desk_engage_tape(engaged)
  }

  tapeProblem() {
    const at = this.#module._desk_tape_problem()

    return this.#sentenceAt(at)
  }

  // How far the tape has run since its start, and how long what is recorded on
  // it plays, in milliseconds.
  tapePosition() {
    return this.#module._desk_tape_position()
  }

  tapeRecorded() {
    return this.#module._desk_tape_recorded()
  }

  windTape(milliseconds) {
    this.#module._desk_wind_tape(milliseconds)
  }

  // The machine's own power, which the disc in its drive and the tape in its
  // datacorder outlive.
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
    this.#boot(this.#module)
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

  #sentenceAt(at) {
    const heap = this.#module.HEAPU8,
      reported = at != 0

    if (!reported) {
      return null
    }

    const end = heap.indexOf(0, at),
      sentence = heap.subarray(at, end)

    return TEXT.decode(sentence)
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
