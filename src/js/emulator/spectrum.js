import Machine from "./machine"
import Picture from "./picture"
import createModule from "./module"
import fetchFirmware from "./firmware"
import sentenceAt from "./sentence_at"

// Brightness on or off over eight colours: ula_rgb in the emulator's ula.c.
const COLOUR_CODES = 16

export default class Spectrum extends Machine {
  // The room a tape is given here, which an image must stand inside.
  tapeCapacity

  #module
  #tapeAt

  static async create(signal, anisotropy) {
    const module = await createModule(),
      rom = await fetchFirmware("spectrum48", signal),
      romAt = module._desk_spectrum_rom()

    module.HEAPU8.set(rom, romAt)
    module._desk_boot_spectrum48()

    return new Spectrum(module, anisotropy)
  }

  // A Spectrum has no socket of its own for a monitor: what it gives is the
  // aerial signal on its TV socket, which a television reads for the colour
  // each code is. Those colours are the emulator's ula_rgb, whose levels its
  // ula.h calls chosen and not measured.
  constructor(module, anisotropy) {
    const framebufferAt = module._desk_spectrum_framebuffer(),
      columns = module._desk_spectrum_framebuffer_width(),
      rows = module._desk_spectrum_framebuffer_height(),
      // The module's memory never grows — the host holds all of it in fixed
      // storage — so the views taken here stay good for the machine's life.
      framebuffer = module.HEAPU8.subarray(framebufferAt, framebufferAt + columns * rows),
      rgb = code => module._desk_spectrum_rgb(code),
      colours = Picture.coloursOf(rgb, COLOUR_CODES),
      signals = { RF: colours },
      picture = new Picture(framebuffer, {
        columns,
        rows,
        colourCodes: COLOUR_CODES,
        anisotropy,
        signals
      }),
      matrixAt = module._desk_spectrum_keyboard(),
      lines = module._desk_spectrum_keyboard_lines(),
      board = {
        matrix: module.HEAPU8.subarray(matrixAt, matrixAt + lines),
        ticksPerFrame: module._desk_spectrum_ticks_per_frame(),
        ticksPerMillisecond: module._desk_spectrum_ticks_per_millisecond(),
        runUntilRetrace: limit => module._desk_spectrum_run_until_retrace(limit),
        press: key => module._desk_spectrum_press(key),
        release: key => module._desk_spectrum_release(key),
        releaseAll: () => module._desk_spectrum_release_all()
      }

    super(board, picture)
    this.#tapeAt = module._desk_spectrum_tape()
    this.tapeCapacity = module._desk_spectrum_tape_capacity()
    this.#module = module
  }

  // An image with no room for it is never written: it would run past the
  // tape's buffer into the machine's other storage.
  insertTape(bytes) {
    const module = this.#module,
      fits = bytes.length <= this.tapeCapacity

    if (fits) {
      module.HEAPU8.set(bytes, this.#tapeAt)
    }

    const inserted = module._desk_spectrum_insert_tape(bytes.length)

    return inserted != 0
  }

  ejectTape() {
    this.#module._desk_spectrum_eject_tape()
  }

  engageTape(engaged) {
    this.#module._desk_spectrum_engage_tape(engaged)
  }

  // Whether the tape stands where the image marks a stop, with PLAY still down.
  tapeAtMark() {
    const marked = this.#module._desk_spectrum_tape_at_mark()

    return marked != 0
  }

  tapeProblem() {
    const at = this.#module._desk_spectrum_tape_problem()

    return sentenceAt(this.#module.HEAPU8, at)
  }

  // How far the tape has run since its start, and how long what is recorded on
  // it plays, in milliseconds.
  tapePosition() {
    return this.#module._desk_spectrum_tape_position()
  }

  tapeRecorded() {
    return this.#module._desk_spectrum_tape_recorded()
  }

  windTape(milliseconds) {
    this.#module._desk_spectrum_wind_tape(milliseconds)
  }
}
