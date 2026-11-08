import Machine from "./machine"
import Picture from "./picture"
import cpcSignals from "./cpc_signals"
import createModule from "./module"
import fetchFirmware from "./firmware"
import sentenceAt from "./sentence_at"

// Each machine boots the Spanish firmware its keys are lettered for, and a
// 6128 the disc interface's AMSDOS beside it.
const MACHINES = {
  cpc6128: { firmware: "cpc6128es", disc: "amsdos", boot: module => module._desk_boot_cpc6128() },
  cpc464: { firmware: "cpc464es", disc: null, boot: module => module._desk_boot_cpc464() }
}

export default class Cpc extends Machine {
  // The room a disc is given here, which an image must stand inside.
  discCapacity

  // The room a tape is given here, which an image must stand inside.
  tapeCapacity

  #discAt
  #boot
  #module
  #tapeAt

  static async create(signal, anisotropy, machine) {
    const module = await createModule(),
      { firmware, disc, boot } = MACHINES[machine],
      fetching = [fetchFirmware(firmware, signal), disc ? fetchFirmware(disc, signal) : null],
      // An image answering to its pin is the length that pin was taken over,
      // so the room it lands in is settled before it is fetched.
      [rom, amsdos] = await Promise.all(fetching),
      romAt = module._desk_cpc_rom()

    module.HEAPU8.set(rom, romAt)

    if (amsdos) {
      const amsdosAt = module._desk_cpc_amsdos()

      module.HEAPU8.set(amsdos, amsdosAt)
    }

    boot(module)

    return new Cpc(module, anisotropy, boot)
  }

  constructor(module, anisotropy, boot) {
    const framebufferAt = module._desk_cpc_framebuffer(),
      columns = module._desk_cpc_framebuffer_width(),
      rows = module._desk_cpc_framebuffer_height(),
      // The module's memory never grows — the host holds all of it in fixed
      // storage — so the views taken here stay good for the machine's life.
      framebuffer = module.HEAPU8.subarray(framebufferAt, framebufferAt + columns * rows),
      rgb = code => module._desk_cpc_rgb(code),
      { colourCodes, signals } = cpcSignals(rgb),
      picture = new Picture(framebuffer, { columns, rows, colourCodes, anisotropy, signals }),
      matrixAt = module._desk_cpc_keyboard(),
      lines = module._desk_cpc_keyboard_lines(),
      board = {
        matrix: module.HEAPU8.subarray(matrixAt, matrixAt + lines),
        ticksPerFrame: module._desk_cpc_ticks_per_frame(),
        ticksPerMillisecond: module._desk_cpc_ticks_per_millisecond(),
        runUntilRetrace: limit => module._desk_cpc_run_until_retrace(limit),
        press: key => module._desk_cpc_press(key),
        release: key => module._desk_cpc_release(key),
        releaseAll: () => module._desk_cpc_release_all()
      }

    super(board, picture)
    this.#discAt = module._desk_cpc_disc()
    this.discCapacity = module._desk_cpc_disc_capacity()
    this.#tapeAt = module._desk_cpc_tape()
    this.tapeCapacity = module._desk_cpc_tape_capacity()
    this.#module = module
    this.#boot = boot
  }

  // An image with no room for it is never written: it would run past the
  // disc's buffer into the machine's other storage.
  insertDisc(bytes) {
    const module = this.#module,
      fits = bytes.length <= this.discCapacity

    if (fits) {
      module.HEAPU8.set(bytes, this.#discAt)
    }

    const inserted = module._desk_cpc_insert_disc(bytes.length)

    return inserted != 0
  }

  ejectDisc() {
    this.#module._desk_cpc_eject_disc()
  }

  driveInUse() {
    const working = this.#module._desk_cpc_drive_in_use()

    return working != 0
  }

  discProblem() {
    const at = this.#module._desk_cpc_disc_problem()

    return sentenceAt(this.#module.HEAPU8, at)
  }

  // An image with no room for it is never written, as a disc's is not.
  insertTape(bytes) {
    const module = this.#module,
      fits = bytes.length <= this.tapeCapacity

    if (fits) {
      module.HEAPU8.set(bytes, this.#tapeAt)
    }

    const inserted = module._desk_cpc_insert_tape(bytes.length)

    return inserted != 0
  }

  ejectTape() {
    this.#module._desk_cpc_eject_tape()
  }

  engageTape(engaged) {
    this.#module._desk_cpc_engage_tape(engaged)
  }

  tapeProblem() {
    const at = this.#module._desk_cpc_tape_problem()

    return sentenceAt(this.#module.HEAPU8, at)
  }

  // How far the tape has run since its start, and how long what is recorded on
  // it plays, in milliseconds.
  tapePosition() {
    return this.#module._desk_cpc_tape_position()
  }

  tapeRecorded() {
    return this.#module._desk_cpc_tape_recorded()
  }

  windTape(milliseconds) {
    this.#module._desk_cpc_wind_tape(milliseconds)
  }

  // The machine's own power, which the disc in its drive and the tape in its
  // datacorder outlive.
  switchOff() {
    this.running = false
    this.releaseAllKeys()
    this.#module._desk_cpc_blank_picture()
    this.picture.refresh()
  }

  switchOn() {
    this.running = true
    this.#boot(this.#module)
    this.picture.refresh()
  }
}
