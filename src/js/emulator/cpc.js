import CpcPicture from "./cpc_picture"
import createModule from "./module"
import fetchFirmware from "./firmware"

// A tab hidden for an hour owes an hour of emulation. The machine loses the
// time instead, as one switched off would.
const MAXIMUM_DEBT_MILLISECONDS = 80

// The machine on the desk is a Spanish 6128, which is the firmware its keys
// are lettered for.
const MACHINE_IMAGE = "cpc6128es",
  DISC_IMAGE = "amsdos"

export default class Cpc {
  picture

  #debt = 0
  #last
  #module
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
      rgb = code => module._desk_rgb(code)

    this.picture = new CpcPicture(framebuffer, { columns, rows, rgb, anisotropy })
    this.#module = module
    this.#ticksPerFrame = module._desk_ticks_per_frame()
    this.#ticksPerMillisecond = module._desk_ticks_per_millisecond()
    this.#last = performance.now()
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
      this.picture.refresh()
    }
  }

  dispose() {
    this.picture.dispose()
  }
}
