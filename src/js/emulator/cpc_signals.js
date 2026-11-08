import Picture from "./picture"

// Every value the Gate Array can put on the cable, which is the five bits the
// INKR command keeps: gate_array_rgb in the emulator's gate_array.c.
const COLOUR_CODES = 32

// The level each code puts on the MONITOR socket's pin 6, LUM, from black to
// bright white, by INKR code as gate_array_rgb is. The board mixes R, G and B
// into it through 3.3 kΩ, 1 kΩ and 10 kΩ [A], CPC464, CTM640 and GT64 Service
// Manual, circuit diagram: https://archive.org/details/amstrad-cpc-464-micro-computer-ctm-640-color-monitor-gt-64-green-monitor-service-manual
// Each level is that network fed with the colour pins a 40007 in a CPC464
// puts out, measured for every code [D], "The Gate Array" (Grim), Appendix I:
// http://web.archive.org/web/20260710174425id_/https://www.grimware.org/doku.php/documentations/devices/gatearray
// The 464's user instructions give the greys' order, the firmware's colour
// numbers rising [A], appendix 1.3: https://archive.org/details/cpc464.en, and
// the levels rise in that order [E].
const LUMINANCE = [
  0.4805, 0.4805, 0.7401, 0.9635, 0.029, 0.2551, 0.3728, 0.6094, 0.2551, 0.9635, 0.9321, 1, 0.225,
  0.2991, 0.5759, 0.6548, 0.029, 0.7401, 0.7057, 0.7773, 0, 0.0688, 0.3329, 0.418, 0.1324, 0.8456,
  0.8143, 0.8832, 0.1004, 0.1741, 0.4468, 0.5252
]

// What a CPC puts on the MONITOR socket, code by code: a colour monitor reads
// the R, G and B pins, decoded as rgb decodes them, and a green one LUM alone.
export default function cpcSignals(rgb) {
  const colours = Picture.coloursOf(rgb, COLOUR_CODES),
    greys = LUMINANCE.map(level => [level, level, level])

  return { colourCodes: COLOUR_CODES, signals: { RGB: colours, LUM: greys } }
}
