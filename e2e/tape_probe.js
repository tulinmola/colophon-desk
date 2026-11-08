import createModule from "../src/js/emulator/module.js"
import fetchFirmware from "../src/js/emulator/firmware.js"

// A key's number in the matrix is its line times eight and its bit [A], SOFT 968, Appendix III: https://archive.org/details/SOFT968TheAmstrad6128FirmwareManual
// CONTROL is line 2's bit 7, the small ENTER line 0's bit 6 and SPACE line 5's bit 7.
const CONTROL = 23,
  SMALL_ENTER = 6,
  SPACE = 47

// A place in the raster where the GT64 shows the border and not the paper.
const BORDER_ROW = 40,
  BORDER_COLUMN = 250

const FRAMES_A_SECOND = 50,
  CHANNEL_MAX = 0xff

function runFor(module, seconds) {
  const frames = seconds * FRAMES_A_SECOND,
    limit = module._desk_cpc_ticks_per_frame() * 2

  for (let frame = 0; frame < frames; frame++) {
    module._desk_cpc_run_until_retrace(limit)
  }
}

// A key is held for a tenth of a second, which the firmware's scan of the matrix cannot miss.
function tap(module, key) {
  module._desk_cpc_press(key)
  runFor(module, 0.1)
  module._desk_cpc_release(key)
}

// A 464 given a tape wound to a place, asked to RUN", given PLAY and a key, and left to run: the brightest channel of the border it leaves.
export default async function borderAfterWinding(tape, windTo, seconds) {
  const module = await createModule(),
    rom = await fetchFirmware("cpc464es"),
    romAt = module._desk_cpc_rom(),
    tapeAt = module._desk_cpc_tape(),
    bytes = Uint8Array.from(tape)

  module.HEAPU8.set(rom, romAt)
  module._desk_boot_cpc464()
  runFor(module, 2)
  module.HEAPU8.set(bytes, tapeAt)
  module._desk_cpc_insert_tape(bytes.length)
  module._desk_cpc_wind_tape(windTo)
  module._desk_cpc_press(CONTROL)
  tap(module, SMALL_ENTER)
  module._desk_cpc_release(CONTROL)
  runFor(module, 1)
  module._desk_cpc_engage_tape(true)
  tap(module, SPACE)
  runFor(module, seconds)

  const framebufferAt = module._desk_cpc_framebuffer(),
    columns = module._desk_cpc_framebuffer_width(),
    code = module.HEAPU8[framebufferAt + BORDER_ROW * columns + BORDER_COLUMN],
    packed = module._desk_cpc_rgb(code)

  return Math.max((packed >> 16) & CHANNEL_MAX, (packed >> 8) & CHANNEL_MAX, packed & CHANNEL_MAX)
}
