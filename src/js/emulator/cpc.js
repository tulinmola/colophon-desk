import CpcPicture from "./cpc_picture"
import createModule from "./module"
import fetchFirmware from "./firmware"

// A tab hidden for an hour owes an hour of emulation. The machine loses the
// time instead, as one switched off would.
const MAXIMUM_DEBT_MILLISECONDS = 80

// The machine on the desk is a Spanish 6128, and this is the firmware its
// keys are lettered for.
const MACHINE_IMAGE = "cpc6128es",
  DISC_IMAGE = "amsdos"

const BITS_A_LINE = 8

export default class Cpc {
  picture

  // One entry a matrix position, 1 where the machine holds a key down.
  keys

  #debt = 0
  #last
  #matrix
  #module
  #pendingReleases = new Set()
  #presentCount = 0
  #pressedAt = new Map()
  #ticksPerFrame
  #ticksPerMillisecond

  static async create(signal, anisotropy) {
    const module = await createModule(),
      fetching = [fetchFirmware(MACHINE_IMAGE, signal), fetchFirmware(DISC_IMAGE, signal)],
      // An image answering to its pin is the length that pin was taken over,
      // so the room it lands in is settled before it is fetched.
      [rom, amsdos] = await Promise.all(fetching),
      romAt = module._desk_rom(),
      amsdosAt = module._desk_amsdos()

    module.HEAPU8.set(rom, romAt)
    module.HEAPU8.set(amsdos, amsdosAt)
    module._desk_boot_cpc6128()

    return new Cpc(module, anisotropy)
  }

  constructor(module, anisotropy) {
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

  advance(now) {
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
