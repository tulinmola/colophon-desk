import createModule from "../src/js/emulator/module.js"
import fetchFirmware from "../src/js/emulator/firmware.js"

// A key's number in the matrix is its half-row times eight and its bit, as spectrum.h numbers them: J is half-row 6's bit 3, P half-row 5's bit 0, SYMBOL SHIFT half-row 7's bit 1 and ENTER half-row 6's bit 0.
const J = 51,
  P = 40,
  SYMBOL_SHIFT = 57,
  ENTER = 48

// A place in the raster where the TV shows the border above the paper, which starts on line 56.
const BORDER_ROW = 30,
  BORDER_COLUMN = 200

const FRAMES_A_SECOND = 50

function runFor(module, seconds) {
  const frames = seconds * FRAMES_A_SECOND,
    limit = module._desk_spectrum_ticks_per_frame() * 2

  for (let frame = 0; frame < frames; frame++) {
    module._desk_spectrum_run_until_retrace(limit)
  }
}

// A key is held for a tenth of a second, which the ROM's scan of the keyboard cannot miss, and let go for as long.
function tap(module, key) {
  module._desk_spectrum_press(key)
  runFor(module, 0.1)
  module._desk_spectrum_release(key)
  runFor(module, 0.1)
}

function shifted(module, key) {
  module._desk_spectrum_press(SYMBOL_SHIFT)
  tap(module, key)
  module._desk_spectrum_release(SYMBOL_SHIFT)
  runFor(module, 0.1)
}

function insert(module, tape) {
  const tapeAt = module._desk_spectrum_tape(),
    bytes = Uint8Array.from(tape)

  module.HEAPU8.set(bytes, tapeAt)
  module._desk_spectrum_insert_tape(bytes.length)
}

function borderCode(module) {
  const framebufferAt = module._desk_spectrum_framebuffer(),
    columns = module._desk_spectrum_framebuffer_width()

  return module.HEAPU8[framebufferAt + BORDER_ROW * columns + BORDER_COLUMN]
}

// A 48K given a tape, asked to LOAD "", given PLAY and left to run for so long; then given PLAY again, as a hand would press it once the tape had stopped, and left to run as long again: whether the tape stood at a mark and the border's colour code after each.
async function playedTwice(tape, seconds) {
  const module = await createModule(),
    rom = await fetchFirmware("spectrum48"),
    romAt = module._desk_spectrum_rom()

  module.HEAPU8.set(rom, romAt)
  module._desk_boot_spectrum48()
  runFor(module, 3)
  insert(module, tape)
  tap(module, J)
  shifted(module, P)
  shifted(module, P)
  tap(module, ENTER)
  module._desk_spectrum_engage_tape(true)
  runFor(module, seconds)

  const first = { marked: module._desk_spectrum_tape_at_mark() != 0, border: borderCode(module) }

  module._desk_spectrum_engage_tape(false)
  module._desk_spectrum_engage_tape(true)
  runFor(module, seconds)

  const second = { marked: module._desk_spectrum_tape_at_mark() != 0, border: borderCode(module) }

  return [first, second]
}

// How long what is recorded on a tape plays, in milliseconds, as the deck measures it.
async function recordedLength(tape) {
  const module = await createModule()

  insert(module, tape)

  return module._desk_spectrum_tape_recorded()
}

export { playedTwice, recordedLength }
