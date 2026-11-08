import {
  draw,
  drawRoundedRectangle,
  drawText,
  loadFont,
  makeBox,
  makeCompound,
  makeCylinder,
  makeSphere
} from "replicad"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// x runs across from the recorder's middle, rightward for a reader at its keys, y back from the silver shell's key end and z up from the base's underside, in millimetres.
// What lies on the top is measured as the photographs give it: across from the middle, and along from the shell's grille end as fromRear.

// Sinclair named no recorder for the 48K. Its booklet asks for "a normal domestic cassette recorder" and finds "the cheap portable mono cassette recorders" at least as good as stereo ones [A], https://worldofspectrum.org/ZXSpectrumIntroduction/chapter_six.html, and its 1982 brochure pictures none [A], https://spectrumforeveryone.com/wp-content/uploads/2020/08/Spectrum-Brochure.pdf. The recorder on the desk is the desk's choice.
// It is the Computone CRC-1001, the one model Spanish owners named in their classifieds more than any other, counted in the Spanish Spectrum press [E], from "Spectrum 48 K y cassette COMPUTONE, comprados en enero-85" [B], https://archive.org/download/microhobby-magazine-042.pdf/MicroHobby_042_djvu.txt. Its box reads "I.C. SLIM PORTABLE CASSETTE RECORDER WITH COUNTER" and "MODEL: CRC-1001" [A]: https://www.maltapark.com/asset/itemphotos/9628070/9628070_2.jpg?_ts=2
// The same chassis was sold as the YOKO CRC-1001, alike in every visible detail but its badge [D], https://antique-autoradio-madness.org/Mini-k7/mini-k7-portables/mini-k7-(P)Yoko-80s-CRC-1001_1.htm, whose photographs stand in for the Computone's sides and its open lid. Every unit tied to Spain is silver over black, and so is this one.
// No unit was measured, and no maker's figure exists. Every place on the top is read on a near-square photograph of a silver unit from above, 768 by 1024, scaled by the 42.5 between the hubs of the cassette in its window [A], ECMA-34 Fig. 4: https://ecma-international.org/wp-content/uploads/ECMA-34_3rd_edition_september_1976.pdf, with the camera's lean toward the keys taken out [E]: https://iansretromuseum.co.uk/cassettes/computone/gfx1/l08.jpg, "Ian's view" below.

// Ian's view puts the silver shell 139.6 across, 137 to 142 by how deep the cassette lies under the lid, and 259.6 long [E]. A second view from above, all but square, reads 141.6 by 265 [E]: https://i.pinimg.com/736x/27/ef/63/27ef63fef14db4472ca640062bf91487.jpg. Ian's is taken, since every place on the top is read on it, and the disagreement stands until a unit is measured.
const WIDTH = 139.6,
  LENGTH = 259.6

// The shell's corners in plan turn in about 3 on both views, and its top is flat and parallel to the base [E], on the YOKO seen from either side: https://antique-autoradio-madness.org/Mini-k7/mini-k7-portables/(P)Yoko-CRC-1001/K7-(P)Yoko-CRC-1001_8aam.jpg and https://antique-autoradio-madness.org/Mini-k7/mini-k7-portables/(P)Yoko-CRC-1001/K7-(P)Yoko-CRC-1001_10aam.jpg. Its edges round over by an amount no photograph resolves: 1.5 is a guess.
const PLAN_RADIUS = 3,
  TOP_EDGE_RADIUS = 1.5

// The height is the weakest figure. The left side's sockets, scaled four ways on the YOKO's side seen close and on a Spanish unit's seen from above, give 46, 50, 53 and 59 [E]: https://antique-autoradio-madness.org/Mini-k7/mini-k7-portables/(P)Yoko-CRC-1001/K7-(P)Yoko-CRC-1001_1def-aam.jpg and https://i.pinimg.com/736x/f6/46/0e/f6460e4f5a36d718ca162a1ffd2d3a1a.jpg. The 59 and the 46 scale the DIN socket by its pins' circle, 7.0 across, and by its receptacle for a plug's shield, 13.2 across [C]: https://en.wikipedia.org/wiki/DIN_connector Four C cells lie flat in the base, "DC 6V 4 Batteries UM-2" [A] on the YOKO's plate, ibid., and in its photograph [D]: https://antique-autoradio-madness.org/Mini-k7/mini-k7-portables/(P)Yoko-CRC-1001/K7-(P)Yoko-CRC-1001_2def-aam.jpg. 50 is taken, and it is a guess.
// The silver top shell stands on a black base, parted at a line level all round. The silver is 37% of the side's height on the YOKO's side seen close, the camera level with its top, and 43 to 46% on the Spanish unit seen from above [E], ibid., and 35 to 36% on the YOKO seen from the left [E]: https://antique-autoradio-madness.org/Mini-k7/mini-k7-portables/(P)Yoko-CRC-1001/K7-(P)Yoko-CRC-1001_8aam.jpg. Another reading of the YOKO's side made it a fifth. 37% is taken.
const HEIGHT = 50,
  SILVER_SHARE = 0.37

// "Poignée de transport escamotable" [D], the YOKO's page above: a U-shaped handle slides out of the base at the key end, lying on the desk when pulled out [E], https://antique-autoradio-madness.org/Mini-k7/mini-k7-portables/(P)Yoko-CRC-1001/K7-(P)Yoko-CRC-1001_5aam.jpg. Stowed, its crossbar is the black strip that shows 3.8 beyond the silver at the key end in Ian's view [E], and its arms run inside the base, where they are not drawn. Its section and its length are not measured: 8 tall, and as wide as the shell, are guesses.
// No feet show on any photograph, the YOKO's underside included [E], and none are drawn.
const HANDLE = { reach: 3.8, height: 8 }

// The grille is 35 columns by 28 rows of round holes 2.2 across on a 3.6 pitch both ways, the first row's middles 9.3 from the grille end [E]. The holes are a print on the shell, as dark as what lies behind them reads.
// Across, Ian's view puts the grille, the badge, the lid and the red panel 0.2 to 0.9 right of the shell's middle and the lid's rules 0.6 left of it, as the camera leans one way or the other [E]; each is drawn centred.
const GRILLE = { columns: 35, rows: 28, pitch: 3.6, hole: 2.2, firstRow: 9.3 }

// The badge is a plate of brushed silver in a recess, 125.0 across from 113.3 to 129.1 [E]. On it, from its rear left corner: the counter's window 18.7 to 29.0 by 6.4 to 10.3, three wheels showing through it; "COUNTER" in black capitals 2.1 tall from 17.2 to 32.3 on a baseline at 13.8; and the black reset button 34.35 to 38.7 by 5.3 to 11.7 [E]. The plate's face sinks a little below the top on the YOKO seen close [D]: https://antique-autoradio-madness.org/Mini-k7/mini-k7-portables/(P)Yoko-CRC-1001/K7-(P)Yoko-CRC-1001_15aam.jpg
// How far the plate sinks, how thick it is, how deep the wheels stand behind the window and how far the button stands are not measured: 0.5, 0.5, 1 and 1.5 are guesses.
const BADGE = { width: 125, fromRear: 113.3, toRear: 129.1, sunk: 0.5 },
  COUNTER_WINDOW = { left: 18.7, right: 29, top: 6.4, bottom: 10.3 },
  COUNTER_WORD = {
    word: "COUNTER",
    left: 17.2,
    width: 15.1,
    baseline: 13.8,
    capHeight: 2.1,
    weight: 700
  },
  RESET_BUTTON = { left: 34.35, right: 38.7, top: 5.3, bottom: 11.7, standing: 1.5 },
  COUNTER_WHEELS = ["counter-hundreds", "counter-tens", "counter-units"],
  WHEELS_BEHIND = 1

// COMPUTONE is a squared face set in dots, a dot standing for each square of a letter drawn on a grid of 11 rows: each letter 7 columns wide and M 11, a column apart, read dot by dot on Ian's view and checked on the second [E]. The dots lie 0.687 apart across and 0.680 down and read about 0.45 across; the word's ink runs from 60.9 across the plate and 4.1 down it [E].
const LOGO = { left: 60.9, top: 4.1, pitch: [0.687, 0.68], dot: 0.45 },
  LOGO_LETTERS = {
    C: [
      ".#####.",
      "#######",
      "#######",
      "###.###",
      "###.###",
      "###....",
      "###.###",
      "###.###",
      "#######",
      "#######",
      ".#####."
    ],
    O: [
      ".#####.",
      "#######",
      "#######",
      "###.###",
      "###.###",
      "###.###",
      "###.###",
      "###.###",
      "#######",
      "#######",
      ".#####."
    ],
    M: [
      "##########.",
      "###########",
      "###########",
      "###.###.###",
      "###.###.###",
      "###.###.###",
      "###.###.###",
      "###.###.###",
      "###.###.###",
      "###.###.###",
      "###.###.###"
    ],
    P: [
      "######.",
      "#######",
      "#######",
      "###.###",
      "#######",
      "#######",
      "######.",
      "###....",
      "###....",
      "###....",
      "###...."
    ],
    U: [
      "###.###",
      "###.###",
      "###.###",
      "###.###",
      "###.###",
      "###.###",
      "###.###",
      "###.###",
      "#######",
      "#######",
      ".######"
    ],
    T: [
      "#######",
      "#######",
      "#######",
      "..###..",
      "..###..",
      "..###..",
      "..###..",
      "..###..",
      "..###..",
      "..###..",
      "..###.."
    ],
    N: [
      "######.",
      "#######",
      "#######",
      "###.###",
      "###.###",
      "###.###",
      "###.###",
      "###.###",
      "###.###",
      "###.###",
      "###.###"
    ],
    E: [
      "#######",
      "#######",
      "#######",
      "###....",
      "#######",
      "#######",
      "#######",
      "###....",
      "#######",
      "#######",
      "#######"
    ]
  },
  LOGO_WORD = "COMPUTONE"

// The counter's wheels read light with black figures through the window on Ian's view and on a gold unit's [E]: https://www.maltapark.com/asset/itemphotos/9628070/9628070_2.jpg?_ts=2. The figures stand about 2.5 tall [E]; each wheel carries the ten figures.
const COUNTER_FIGURES = 10,
  FIGURE_HEIGHT = 2.5

// The lid is smoked, brown-tinted plastic, hinged at its grille-end edge, 123.5 across from 130.7 to 206.6 [E], its key-end edge lifting when STOP/EJ. is pressed: open, its grille-end edge stays at the badge on the YOKO seen from either side [E], https://antique-autoradio-madness.org/Mini-k7/mini-k7-portables/(P)Yoko-CRC-1001/K7-(P)Yoko-CRC-1001_11aam.jpg and 8aam above.
// It sits a little below the top, framed by a narrow margin of its own [D], 15aam above. How far below, how thick, how round its corners and where its hinge's axis lies are not measured: its face 1 below the top, 2 thick, corners of 1.5, and an axis along its own rear top edge, are guesses.
const LID = { width: 123.5, fromRear: 130.7, toRear: 206.6, sunk: 1, thickness: 2, radius: 1.5 }

// On it in white, read on Ian's view [E]: two rules round it, the outer 1.0 wide on a line ±58.1 across and from 134.7 to 203.0, the inner 0.5 wide 1.7 inside it, their corners rounded about 2.5 on the outer's line; AUTO STOP in capitals 3.8 tall and 26.2 wide on a baseline at 148.6; and an arrow pointing right with a head on its grille side only, 20.4 long, its shaft from 194.9 to 197.6 and its head 9.95 long rising to 193.0 [E].
// The ink stands on the window as thin solids, not as a print, because a print is only as opaque as the part it lies on. How thick it stands is a guess, 0.05.
const LID_RULES = [
    { width: 116.3, fromRear: 134.7, toRear: 203, line: 1, radius: 2.5 },
    { width: 112.9, fromRear: 136.4, toRear: 201.3, line: 0.5, radius: 0.8 }
  ],
  AUTO_STOP = { word: "AUTO STOP", width: 26.2, capHeight: 3.8, baseline: 148.6 },
  ARROW = { length: 20.4, head: 9.95, top: 193, shaftTop: 194.9, foot: 197.6 },
  INK_THICKNESS = 0.05

// The cassette lies loose in the well under the lid, label up, its long side across and its tape's edge toward the keys, and stays there with the lid open [E], on the YOKO's photographs, 11aam above. Its hubs stand on a row 167.7 from the grille end [E], about the middle; the compact cassette is 63.8 deep with its hubs 34.8 behind its front edge, and 12.1 thick at its front region [A], ECMA-34 above and IEC 94-7 in JIS C 5568:1997: https://kikakurui.com/c5/C5568-1997-01.html
// How deep it lies is not measured: its front region 1 under the lid, and the well's floor 1 under that, are guesses. So are the spindles, a collar 12 across and 1.5 tall about a shaft 7.5 across, inside a hub's teeth, 7.9 across their tips [A], IEC 94-7 ibid., reaching 1 past the cassette's middle.
const CASSETTE = { hubRow: 167.7, depth: 63.8, hubsBehind: 34.8, frontRegion: 12.1, clearance: 1 },
  SPINDLES = { pitch: 42.5, collar: 12, collarHeight: 1.5, shaft: 7.5, pastMiddle: 1 }

// The red panel, with the black strip of the keys' legends along its front, is a plate 113.0 across from 208.4 to 240.0, the strip from 229.2, sunk a little as the badge is [E]. Its sinking and thickness are the badge's guesses.
// On it, from its rear left corner, in white [E]: "AUDIO CASSETTE" from 52.6, 29.8 wide on a baseline at 5.24, and "COMPUTER PROGRAM RECORDER" from 52.4, 57.5 wide on one at 10.19, both 2.8 tall and bold; "MIC." from 4.6, 5.8 wide, and "REC./SAVE" from 19.7, 14.7 wide, on 10.19, over rules running back from under each and turning down toward the left; "SAVE" from 3.7, 7.3 wide, and "LOAD" from 21.4, 7.7 wide, on 18.83, all 2.4 tall; the rules 0.35 wide.
const RED_PANEL = { width: 113, fromRear: 208.4, toRear: 240, strip: 229.2 },
  PANEL_WORDS = [
    {
      word: "AUDIO CASSETTE",
      left: 52.6,
      width: 29.8,
      baseline: 5.24,
      capHeight: 2.8,
      weight: 700
    },
    {
      word: "COMPUTER PROGRAM RECORDER",
      left: 52.4,
      width: 57.5,
      baseline: 10.19,
      capHeight: 2.8,
      weight: 700
    },
    { word: "MIC.", left: 4.6, width: 5.8, baseline: 10.19, capHeight: 2.4, weight: 400 },
    { word: "REC./SAVE", left: 19.7, width: 14.7, baseline: 10.19, capHeight: 2.4, weight: 400 },
    { word: "SAVE", left: 3.7, width: 7.3, baseline: 18.83, capHeight: 2.4, weight: 400 },
    { word: "LOAD", left: 21.4, width: 7.7, baseline: 18.83, capHeight: 2.4, weight: 400 }
  ],
  PANEL_RULES = [
    [
      [10.7, 11.05],
      [4.5, 11.05],
      [1.6, 13.9]
    ],
    [
      [34.4, 11.05],
      [19.75, 11.05],
      [17.8, 12.8]
    ]
  ],
  RULE_WIDTH = 0.35

// The built-in microphone's round hole, 5.6 across at 48.6 and 3.7 on the panel [E], its "CON. MIC" one of the Elta CRC 1001's parts, the same chassis's [A]: https://www.radiomuseum.org/images/schematic-medium/elta_gmbh_rodermark/crc_1001_1915036.png
// "AC/DC LED REC INDICATOR" [A], the box above: a red LED in a round clear bezel 7.1 across about 15.4 and 16.7 on the panel [E]. How far either stands, the bezel's bore and the LED's size are not measured: the bezel 0.3 proud with a bore of 3.2, and a dome 3 across, are guesses, as is how deep either hole runs under the plate, 1.5.
const MICROPHONE = { across: 48.6, down: 3.7, diameter: 5.6 },
  INDICATOR = { across: 15.4, down: 16.7, bezel: 7.1, bore: 3.2, standing: 0.3, dome: 3 },
  HOLE_DEPTH = 1.5

// Five slots each side of the red panel, 1.2 wide on a 3.15 pitch, the first's middle 218.0 from the grille end, running from 61.0 out over the shell's edge [E]. How deep they run is not seen: 3, dark behind, is a guess.
const LOUVRES = { count: 5, width: 1.2, pitch: 3.15, first: 218, inner: 61, depth: 3 }

// Six piano keys stand between the shell's cheeks from 241.0 to 262.4, their fronts 2.8 beyond the shell's end, RECORD red and the rest black [E]. Their pads' middles stand 18.69 apart, where the second view reads 19.1, and each key 18.2 across [E]. In each top a recessed pad 13.9 across from 249.0 to 258.9, gridded finely, about 0.7 a square [E], 15aam above.
// The tops stand below the cheeks [D], 10aam above, and under the keys' short fronts a dark gap falls to a black ledge of the base [D], 15aam and 5aam above. How far below the top, how tall the fronts, how deep the gap, how deep the pads sink, how round the tops' front edges and where each key turns are not measured: 3, fronts of 5 over a gap of 5, pads of 0.6, edges of 1, and an axis 11 below the top and 215 from the grille end, under the red panel and before the well, are guesses; so are the pads' raised dots, 0.35 across on the grid's 0.7. A key turned so far that its nose meets the ledge stands at the end of its travel.
const KEY = {
    pitch: 18.69,
    width: 18.2,
    fromRear: 241,
    toRear: 262.4,
    sunk: 3,
    front: 5,
    gap: 5,
    frontRound: 1,
    pivot: { fromRear: 215, below: 11 }
  },
  PAD = { width: 13.9, fromRear: 249, toRear: 258.9, depth: 0.6, grid: 0.7, dot: 0.35 }

// The keys and their legends, printed on the strip over each in light grey, each symbol over its word [A], the unit's own: "● RECORD", "▶ PLAY", "◀◀ REWIND", "▶▶ ADVANCE", "■ ▼ STOP/EJ." and "II PAUSE". Each word is centred over its key, its width as read, 2.3 tall on a baseline 28.27 down the panel, and each symbol about 1.5 across about 23.56 down it, STOP/EJ.'s square 2.9 left of its key's middle and its triangle 4.2 right [E].
const KEYS = [
    { name: "record-key", word: "RECORD", width: 13.25, red: true },
    { name: "play-key", word: "PLAY", width: 7.05 },
    { name: "rewind-key", word: "REWIND", width: 12.38 },
    { name: "advance-key", word: "ADVANCE", width: 14.12 },
    { name: "stop-eject-key", word: "STOP/EJ.", width: 12.8 },
    { name: "pause-key", word: "PAUSE", width: 9.28 }
  ],
  LEGEND = {
    capHeight: 2.3,
    baseline: 28.27,
    symbolMiddle: 23.56,
    symbol: 1.5,
    ejectSquare: -2.9,
    ejectTriangle: 4.2
  }

// On the left side, in a recessed panel of the base, from the grille end: the mains inlet AC IN, a 5-pin DIN socket, EAR IN, a thumbwheel under VOLUME, REM and MIC OUT, "COMPUTER" joining EAR IN to MIC OUT [A], the unit's own legends on the Spanish unit's photograph and the YOKO's above.
// Along, by the Spanish unit's near top edge mapped through its ends and the lid's corners: AC IN 56, DIN 105, EAR IN 123, VOLUME 141, REM 163 and MIC OUT 173; and on the YOKO's side seen close, between AC IN and MIC OUT so placed, its perspective read from the side's height growing toward the camera: DIN 108, EAR IN 126, VOLUME 135 to 155 and REM 164 [E]. Their means are taken.
// Up the side, as shares of its height on the YOKO's: AC IN's middle 0.34, DIN's 0.32, the jacks' 0.24 and the wheel's slot 0.17 to 0.32; and so the inlet's opening 14 by 12, DIN's 13.3 across and the slot 20 long [E]. The legends stand 2.5 tall about the heights given, each by what it names, with VOLUME's rule and COMPUTER's bracket [E].
// The panel's ends stand 9 beyond the outer sockets' middles [E]. Its depth, its foot, how far the openings run into the base, the jacks' bores and rings, the wheel and how far it stands are not measured: 1.5 deep, 1 above the base's foot, openings 6 deep past its plate, bores of 3.5 and REM's 2.5 in rings of 5.4 and 3.6, and a wheel 24 across and 5 thick standing 1 proud, are guesses.
// Inside its opening the inlet shows a figure-8 receptacle, lying along the side, and DIN a hollow about its pins [D], 1def above. Their bodies stand 1 behind the panel's plate, the receptacle two lobes 7 across 4.5 apart joined by a waist of 5, 4 deep, and DIN's hollow 9.5 across and 2 deep, which are guesses.
// A Computone owner remembers "las ruedecitas Volume y Tone" [C], https://www.elmundodelspectrum.com/cuentanos-tu-primer-contacto-con-un-spectrum/, where every photographed face shows VOLUME alone. The right side is never seen clearly, and the Elta's schematic has an "EARPHONE JACK" [A], above, that may stand on it; it is drawn plain, as is the grille-end face.
const SOCKET_PANEL = { fromRear: 47, toRear: 182, foot: 1, depth: 1.5 },
  AC_INLET = { middle: 56, share: 0.34, length: 14, height: 12 },
  DIN_SOCKET = { middle: 106.6, share: 0.32, diameter: 13.3 },
  JACKS = [
    { middle: 124.9, share: 0.24, bore: 3.5, ring: 5.4 },
    { middle: 163.3, share: 0.24, bore: 2.5, ring: 3.6 },
    { middle: 173, share: 0.24, bore: 3.5, ring: 5.4 }
  ],
  VOLUME_SLOT = { middle: 143, length: 20, bottomShare: 0.17, topShare: 0.32 },
  WHEEL = { diameter: 24, thickness: 5, standing: 1 },
  INLET_CAVITY = { lobe: 7, lobes: 4.5, waist: 5, depth: 4 },
  DIN_CAVITY = { diameter: 9.5, depth: 2 },
  SOCKET_DEPTH = 6,
  SOCKET_BODY_INSET = 1,
  SIDE_LEGENDS = [
    { word: "AC", along: 51.9, height: 3.9 },
    { word: "IN", along: 62, height: 3.9 },
    { word: "DIN", along: 99.6, height: 7.3 },
    { word: "EAR", along: 123.8, height: 18.1 },
    { word: "IN", along: 124.5, height: 6.3 },
    { word: "VOLUME", along: 143, height: 21.1 },
    { word: "COMPUTER", along: 144.1, height: 6.7 },
    { word: "REM", along: 162.6, height: 18.5 },
    { word: "MIC", along: 174, height: 18.1 },
    { word: "OUT", along: 172.8, height: 7.8 }
  ],
  SIDE_CAP_HEIGHT = 2.5,
  VOLUME_RULE = { from: 135.2, to: 150.8, height: 18.3 },
  COMPUTER_LINES = [
    [
      [126.6, 6.3],
      [128.5, 5.4],
      [134.4, 5.4]
    ],
    [
      [153.8, 5.4],
      [168.6, 5.4],
      [170.4, 7.2]
    ]
  ]

// Colours read by eye between uncalibrated photographs that disagree widely, as medians of each patch, or of its brightest or darkest tenth where an ink or a hole is thinner than the blur [E]: the silver #acb1b4 to #c1c4c1 on Ian's view and #7b7d7a on the second; the badge #acada7 to #c4c6bf and #acada8 to #bec4c4, about the silver's own grey, from which its recess and its brushed grain, not drawn, tell it; the base #060607 to #20221d; the red panel #6b2e2e on Ian's, #e33d57 on the second and #d9273c to #df454f on the YOKO's, and its white words #d9bcbc, #fff2f8 and #f3c7c9; the legends' strip #090909, #46413f and #1d1e19, and its words #6b6a6a, #d2c9c5 and #d5d6d4; the black keys #07090a, #434647 and #34352a, and RECORD #761c1b, #fd4a63 and #d81e2a.
// On the badge its black reads #0b0b09 in COUNTER and #1c1c1b to #2c2c28 in the logotype's dots; the counter's wheels #a09f98, #f0f9f2 and, on the gold unit, #aba8ac, and their figures #413e37, #44453e and #222124; the grille's holes #0e100f and #080908; the lid's ink #dcd3c9, #e9f4f6 and #e6e5e1; and the reset button #1a1a1b [E]. The REC indicator's lens reads red, #57171b on Ian's view and #a03332 to #cb4d49 on the YOKO's, with no glow on any of them: it is its lens's own red, unlit, and its clear bezel reads the panel's red through it, #703a36 and #a45b56. On the YOKO's side the black panel reads #464136, and the inlet, DIN's face and the wheel darker, #201d14, #1d1d15 and #21211d: they are drawn as much darker than the base as they read than the panel [E].
// Each is taken between its readings, or as read where it has one, and is good for the hue and no more.
// The rest are guesses: the window, drawn brown, #5a4030, over 45% of what lies behind it, through which a cassette's black reads #2a201d to #615144 and its light parts tan [E]; the dark of the well, under the louvres and behind the keys, and the spindles, which no photograph shows; the pads' dots, which read lighter than their keys on Ian's view and the YOKO's by no measure the blur allows; the side's legends, white letters too thin for the YOKO's photograph to keep their white, read #95958d to #a8a8a0; and the jacks' rings, which read #e3dcd0 to #ece0d2 at their brightest, drawn a bright grey as the page draws no surroundings to shine in them. The window and the rings are drawn smooth, roughness 0.1 and 0.3, and the rest matte.
const SHELL = { name: "top-shell", colour: "#b4b7b5" },
  BASE = { name: "base", colour: "#1f201d" },
  BADGE_PLATE = { name: "badge", colour: "#b9bcb8" },
  RED_PANEL_PLATE = { name: "red-panel", colour: "#b23a40" },
  SOCKET_PANEL_PLATE = { name: "socket-panel", colour: BASE.colour },
  WINDOW = { name: "cassette-window", colour: "#5a4030", opacity: 0.45, roughness: 0.1 },
  INK = { name: "lid-ink", colour: "#e6e5e1" },
  INTERIOR = { name: "interior", colour: "#141414" },
  SPINDLE_PLASTIC = { name: "spindles", colour: "#2b2b2b" },
  BLACK_PLASTIC = { name: "black-plastic", colour: "#1a1a1b" },
  KEY_BLACK = { name: "key", colour: "#1d1d1d" },
  KEY_RED = { name: "key-red", colour: "#c0282e" },
  LED = { name: "rec-indicator", colour: "#8b2c2d" },
  BEZEL = { name: "indicator-bezel", colour: "#8a4a46" },
  JACK_METAL = { name: "jack-rings", colour: "#a9aba8", roughness: 0.3 },
  SIDE_DARK = { name: "side-dark", colour: "#0e0e0c" },
  GRILLE_DARK = "#0b0c0b",
  LOGO_INK = "#1a1a1a",
  WHEEL_WHITE = "#dedcd4",
  FIGURE_INK = "#333230",
  STRIP_BLACK = "#141414",
  PANEL_WHITE = "#ecebe6",
  LEGEND_GREY = "#c2c3be",
  PAD_BLACK = "#3b3b3b",
  PAD_RED = "#da4d50",
  SIDE_WHITE = "#e6e6e1"

// A printed part carries a material of its own, because the page inks its print over the material it finds.
const COUNTER_WHEEL_PLASTICS = COUNTER_WHEELS.map(name => ({ name, colour: WHEEL_WHITE }))

// How finely a print is rendered: the shell's whole top at 8 pixels to the millimetre, the rest at 12.
const TOP_PIXELS = 8,
  PLATE_PIXELS = 12

const LANGUAGE = "en",
  TOP_PRINT = "top-shell",
  BADGE_PRINT = "badge",
  DIGITS_PRINT = "counter-digits",
  RED_PANEL_PRINT = "red-panel",
  KEYS_PRINT = "keys",
  SOCKET_PANEL_PRINT = "socket-panel"

// TeX Gyre Heros stands in for the recorder's grotesque, on the prints and in the lid's ink: https://www.gust.org.pl/projects/e-foundry/tex-gyre/heros
const HEROS = "TeX Gyre Heros",
  HEROS_CAP_HEIGHT = 0.729,
  HEROS_FILE = resolve(import.meta.dirname, "../fonts/texgyreheros-regular.otf"),
  HEROS_BYTES = readFileSync(HEROS_FILE),
  HEROS_DATA = new Uint8Array(HEROS_BYTES).buffer

await loadFont(HEROS_DATA, HEROS)

// A plate's thickness, where a part carries a print and nothing measures how thick it is.
const PLATE_THICKNESS = 0.5

// A cut runs this far past the faces it opens, so the kernel is never left two coplanar faces to join.
const OVERRUN = 1

// Where one part lies in another's recess or opening, a hairline holds the two apart, so that no face of either stands in the plane of a face of the other.
const HAIRLINE = 0.1

// How thick the dark behind an opening is drawn.
const BACK_THICKNESS = 0.5

// How far the triangles may stray from a curved face, in millimetres, and turn from one another along it, in radians: a choice of how finely to draw, not a figure of the machine.
const TESSELLATION = { tolerance: 0.25, angularTolerance: 1 }

const PARTING = HEIGHT * (1 - SILVER_SHARE),
  LID_TOP = HEIGHT - LID.sunk,
  LID_UNDER = LID_TOP - LID.thickness,
  CASSETTE_MIDDLE = LID_UNDER - CASSETTE.clearance - CASSETTE.frontRegion / 2,
  WELL_FLOOR = CASSETTE_MIDDLE - CASSETTE.frontRegion / 2 - CASSETTE.clearance,
  BADGE_FACE = HEIGHT - BADGE.sunk,
  PANEL_FACE = BADGE_FACE,
  HOLE_BOTTOM = PANEL_FACE - PLATE_THICKNESS - HOLE_DEPTH,
  KEY_TOP = HEIGHT - KEY.sunk,
  LEDGE_TOP = KEY_TOP - KEY.front - KEY.gap,
  SIDE = -WIDTH / 2,
  PANEL_HEIGHT = PARTING - SOCKET_PANEL.foot,
  CENTRING = [0, -LENGTH / 2, 0]

// How far back of the shell's key end a place stands that is measured from its grille end.
function backOf(fromRear) {
  return LENGTH - fromRear
}

function centred(place) {
  return [place[0] + CENTRING[0], place[1] + CENTRING[1], place[2] + CENTRING[2]]
}

function across(width) {
  return { left: -width / 2, right: width / 2 }
}

// The size Heros is set at for its capitals to stand the given height.
function fontSize(capHeight) {
  return capHeight / HEROS_CAP_HEIGHT
}

// A box over an outline on the top, from a height to a height.
function planBox({ left, right, fromRear, toRear }, bottom, top) {
  const front = backOf(toRear),
    rear = backOf(fromRear)

  return makeBox([left, front, bottom], [right, rear, top])
}

function grown({ left, right, fromRear, toRear }, margin) {
  return {
    left: left - margin,
    right: right + margin,
    fromRear: fromRear - margin,
    toRear: toRear + margin
  }
}

// The rectangle a print is laid over, in the frame its part is built in, shifted by the given origin.
function faceOf({ left, right, fromRear, toRear }, origin) {
  const [x, y] = origin

  return {
    left: left - x,
    right: right - x,
    front: backOf(toRear) - y,
    rear: backOf(fromRear) - y
  }
}

// An outline measured on a plate from its rear left corner, on the top.
function onPlate(plate, { left, right, top, bottom }) {
  const { left: plateLeft } = across(plate.width)

  return {
    left: plateLeft + left,
    right: plateLeft + right,
    fromRear: plate.fromRear + top,
    toRear: plate.fromRear + bottom
  }
}

function plateOutline(plate) {
  return { ...across(plate.width), fromRear: plate.fromRear, toRear: plate.toRear }
}

function planOutline() {
  return drawRoundedRectangle(WIDTH, LENGTH, PLAN_RADIUS).translate(0, LENGTH / 2)
}

function buildShellBody() {
  const plan = planOutline(),
    body = plan.sketchOnPlane("XY", PARTING).extrude(HEIGHT - PARTING)

  return body.fillet(TOP_EDGE_RADIUS, edge => edge.inPlane("XY", HEIGHT))
}

// The well is the lid's own outline, from above the top down past the lining of its floor.
function buildWell() {
  const lid = plateOutline(LID),
    outline = grown(lid, HAIRLINE),
    bottom = WELL_FLOOR - BACK_THICKNESS - HAIRLINE

  return planBox(outline, bottom, HEIGHT + OVERRUN)
}

function buildPlateRecess(plate, face) {
  const plateRoom = plateOutline(plate),
    outline = grown(plateRoom, HAIRLINE),
    floor = face - PLATE_THICKNESS - HAIRLINE

  return planBox(outline, floor, HEIGHT + OVERRUN)
}

// Behind the counter's window the wheels stand in a pocket of their own under the badge.
function buildCounterPocket() {
  const opening = onPlate(BADGE, COUNTER_WINDOW),
    window = grown(opening, HAIRLINE),
    floor = BADGE_FACE - WHEELS_BEHIND - PLATE_THICKNESS - HAIRLINE

  return planBox(window, floor, BADGE_FACE)
}

// A point measured on the red panel from its rear left corner, on the top.
function onPanel(fromLeft, down) {
  const { left } = across(RED_PANEL.width)

  return [left + fromLeft, backOf(RED_PANEL.fromRear + down)]
}

function buildMicrophoneHole() {
  const [x, y] = onPanel(MICROPHONE.across, MICROPHONE.down)

  return makeCylinder(MICROPHONE.diameter / 2, HEIGHT + OVERRUN - HOLE_BOTTOM, [x, y, HOLE_BOTTOM])
}

function buildIndicatorHole() {
  const [x, y] = onPanel(INDICATOR.across, INDICATOR.down)

  return makeCylinder(INDICATOR.bezel / 2 + HAIRLINE, HEIGHT + OVERRUN - HOLE_BOTTOM, [
    x,
    y,
    HOLE_BOTTOM
  ])
}

function louvreSlots() {
  const slots = []

  for (const side of [-1, 1]) {
    for (let index = 0; index < LOUVRES.count; index++) {
      const middle = LOUVRES.first + index * LOUVRES.pitch,
        inner = side * LOUVRES.inner,
        outer = side * (WIDTH / 2 + OVERRUN),
        left = Math.min(inner, outer),
        right = Math.max(inner, outer),
        slot = planBox(
          {
            left,
            right,
            fromRear: middle - LOUVRES.width / 2,
            toRear: middle + LOUVRES.width / 2
          },
          HEIGHT - LOUVRES.depth,
          HEIGHT + OVERRUN
        )

      slots.push(slot)
    }
  }

  return slots
}

// The keys stand in a notch between the cheeks, open at the front and down to the parting line.
function buildKeyNotch() {
  const notch = { ...across(RED_PANEL.width), fromRear: RED_PANEL.toRear, toRear: LENGTH + OVERRUN }

  return planBox(notch, PARTING, HEIGHT + OVERRUN)
}

// Cuts whose tools overlap lose them without a word, so each is cut on its own.
function buildTopShell() {
  const cuts = [
    buildPlateRecess(BADGE, BADGE_FACE),
    buildCounterPocket(),
    buildWell(),
    buildPlateRecess(RED_PANEL, PANEL_FACE),
    buildMicrophoneHole(),
    buildIndicatorHole(),
    ...louvreSlots(),
    buildKeyNotch()
  ]

  let shell = buildShellBody()

  for (const cut of cuts) {
    shell = shell.cut(cut)
  }

  const outline = { ...across(WIDTH), fromRear: 0, toRear: LENGTH }

  return {
    name: "top-shell",
    shape: shell.translate(CENTRING),
    material: SHELL,
    face: faceOf(outline, [0, -CENTRING[1]]),
    print: TOP_PRINT
  }
}

function sideHeight(share) {
  return share * HEIGHT
}

// The left side's panel and its openings are cut inward from the side's face, x growing into the base.
function sideBox({ from, to, bottom, top }, inward) {
  const front = backOf(to),
    rear = backOf(from)

  return makeBox([SIDE - OVERRUN, front, bottom], [SIDE + inward, rear, top])
}

function buildSocketRecess() {
  const inward = SOCKET_PANEL.depth + PLATE_THICKNESS + HAIRLINE

  return sideBox(
    {
      from: SOCKET_PANEL.fromRear,
      to: SOCKET_PANEL.toRear,
      bottom: SOCKET_PANEL.foot,
      top: PARTING + OVERRUN
    },
    inward
  )
}

// A round opening in the side, its middle at a share of the side's height.
function sideCylinder(diameter, middle, share, inward) {
  const length = inward + OVERRUN,
    y = backOf(middle),
    height = sideHeight(share)

  return makeCylinder(diameter / 2, length, [SIDE - OVERRUN, y, height], [1, 0, 0])
}

// The sockets' openings, through the panel's plate and into the base.
function socketOpenings(inward) {
  const inletHeight = sideHeight(AC_INLET.share),
    slotBottom = sideHeight(VOLUME_SLOT.bottomShare),
    slotTop = sideHeight(VOLUME_SLOT.topShare),
    inlet = sideBox(
      {
        from: AC_INLET.middle - AC_INLET.length / 2,
        to: AC_INLET.middle + AC_INLET.length / 2,
        bottom: inletHeight - AC_INLET.height / 2,
        top: inletHeight + AC_INLET.height / 2
      },
      inward
    ),
    din = sideCylinder(DIN_SOCKET.diameter, DIN_SOCKET.middle, DIN_SOCKET.share, inward),
    jacks = JACKS.map(jack => sideCylinder(jack.bore, jack.middle, jack.share, inward)),
    slot = sideBox(
      {
        from: VOLUME_SLOT.middle - VOLUME_SLOT.length / 2,
        to: VOLUME_SLOT.middle + VOLUME_SLOT.length / 2,
        bottom: slotBottom,
        top: slotTop
      },
      inward
    )

  return [inlet, din, ...jacks, slot]
}

// The jacks' rings stand in openings of their own, as wide as the rings.
function ringOpenings(inward) {
  return JACKS.map(jack => sideCylinder(jack.ring + 2 * HAIRLINE, jack.middle, jack.share, inward))
}

// Under the keys the base rises to a ledge in the notch, a hairline inside it.
function buildBase() {
  const recess = buildSocketRecess(),
    sockets = socketOpenings(SOCKET_PANEL.depth + PLATE_THICKNESS + SOCKET_DEPTH),
    cuts = [recess, ...sockets],
    plan = planOutline(),
    body = plan.sketchOnPlane("XY", 0).extrude(PARTING),
    ledgeOutline = {
      ...across(RED_PANEL.width - 2 * HAIRLINE),
      fromRear: RED_PANEL.toRear + HAIRLINE,
      toRear: LENGTH
    },
    ledge = planBox(ledgeOutline, PARTING - OVERRUN, LEDGE_TOP)

  let base = body.fuse(ledge)

  for (const cut of cuts) {
    base = base.cut(cut)
  }

  return { name: "base", shape: base.translate(CENTRING), material: BASE }
}

// The handle's crossbar stands before the base's key end on the desk.
function buildHandle() {
  const bar = makeBox([-WIDTH / 2, -HANDLE.reach, 0], [WIDTH / 2, -HAIRLINE, HANDLE.height])

  return { name: "handle", shape: bar.translate(CENTRING), material: BASE }
}

// The panel's print is laid as the side is read, the grille end at its left and the parting line at its top.
function socketPanelMapping([, y, z]) {
  const fromRear = LENGTH - (y - CENTRING[1]),
    length = SOCKET_PANEL.toRear - SOCKET_PANEL.fromRear

  return [(fromRear - SOCKET_PANEL.fromRear) / length, (PARTING - z) / PANEL_HEIGHT]
}

// The socket panel's plate lies in its recess, its face the recess's depth in from the side, pierced where the sockets and the rings stand.
function buildSocketPanel() {
  const face = SIDE + SOCKET_PANEL.depth,
    front = backOf(SOCKET_PANEL.toRear - HAIRLINE),
    rear = backOf(SOCKET_PANEL.fromRear + HAIRLINE),
    plate = makeBox(
      [face, front, SOCKET_PANEL.foot + HAIRLINE],
      [face + PLATE_THICKNESS, rear, PARTING - HAIRLINE]
    ),
    inward = SOCKET_PANEL.depth + PLATE_THICKNESS + OVERRUN,
    openings = [...socketOpenings(inward), ...ringOpenings(inward)]

  let pierced = plate

  for (const opening of openings) {
    pierced = pierced.cut(opening)
  }

  return {
    name: SOCKET_PANEL_PRINT,
    shape: pierced.translate(CENTRING),
    material: SOCKET_PANEL_PLATE,
    mapping: socketPanelMapping,
    print: SOCKET_PANEL_PRINT
  }
}

// The inlet's lobes and waist overlap, so they are fused before they are cut.
function buildSocketBodies() {
  const front = SIDE + SOCKET_PANEL.depth + PLATE_THICKNESS + SOCKET_BODY_INSET,
    back = SIDE + SOCKET_PANEL.depth + PLATE_THICKNESS + SOCKET_DEPTH - HAIRLINE,
    inletHeight = sideHeight(AC_INLET.share),
    inletMiddle = backOf(AC_INLET.middle),
    inlet = makeBox(
      [
        front,
        inletMiddle - AC_INLET.length / 2 + HAIRLINE,
        inletHeight - AC_INLET.height / 2 + HAIRLINE
      ],
      [
        back,
        inletMiddle + AC_INLET.length / 2 - HAIRLINE,
        inletHeight + AC_INLET.height / 2 - HAIRLINE
      ]
    ),
    cavityLength = INLET_CAVITY.depth + OVERRUN,
    lobes = [-1, 1].map(side =>
      makeCylinder(
        INLET_CAVITY.lobe / 2,
        cavityLength,
        [front - OVERRUN, inletMiddle + (side * INLET_CAVITY.lobes) / 2, inletHeight],
        [1, 0, 0]
      )
    ),
    waist = makeBox(
      [front - OVERRUN, inletMiddle - INLET_CAVITY.lobes / 2, inletHeight - INLET_CAVITY.waist / 2],
      [
        front + INLET_CAVITY.depth,
        inletMiddle + INLET_CAVITY.lobes / 2,
        inletHeight + INLET_CAVITY.waist / 2
      ]
    )

  let receptacle = waist

  for (const lobe of lobes) {
    receptacle = receptacle.fuse(lobe)
  }

  const dinHeight = sideHeight(DIN_SOCKET.share),
    dinMiddle = backOf(DIN_SOCKET.middle),
    din = makeCylinder(
      DIN_SOCKET.diameter / 2 - HAIRLINE,
      back - front,
      [front, dinMiddle, dinHeight],
      [1, 0, 0]
    ),
    hollow = makeCylinder(
      DIN_CAVITY.diameter / 2,
      DIN_CAVITY.depth + OVERRUN,
      [front - OVERRUN, dinMiddle, dinHeight],
      [1, 0, 0]
    ),
    inletBody = inlet.cut(receptacle),
    dinBody = din.cut(hollow),
    bodies = makeCompound([inletBody, dinBody])

  return { name: "sockets", shape: bodies.translate(CENTRING), material: SIDE_DARK }
}

function buildJackRings() {
  const face = SIDE + SOCKET_PANEL.depth,
    rings = JACKS.map(function (jack) {
      const height = sideHeight(jack.share),
        y = backOf(jack.middle),
        outer = makeCylinder(jack.ring / 2, PLATE_THICKNESS, [face, y, height], [1, 0, 0]),
        bore = sideCylinder(
          jack.bore,
          jack.middle,
          jack.share,
          SOCKET_PANEL.depth + PLATE_THICKNESS + OVERRUN
        )

      return outer.cut(bore)
    }),
    all = makeCompound(rings)

  return { name: "jack-rings", shape: all.translate(CENTRING), material: JACK_METAL }
}

// The wheel turns about an upright axis inside the side, its rim standing proud through the slot only at the slot's middle.
function buildVolumeWheel() {
  const radius = WHEEL.diameter / 2,
    face = SIDE + SOCKET_PANEL.depth,
    middle = (sideHeight(VOLUME_SLOT.bottomShare) + sideHeight(VOLUME_SLOT.topShare)) / 2,
    axis = [
      face - WHEEL.standing + radius,
      backOf(VOLUME_SLOT.middle),
      middle - WHEEL.thickness / 2
    ],
    disc = makeCylinder(radius, WHEEL.thickness, axis),
    slot = sideBox(
      {
        from: VOLUME_SLOT.middle - VOLUME_SLOT.length / 2 + HAIRLINE,
        to: VOLUME_SLOT.middle + VOLUME_SLOT.length / 2 - HAIRLINE,
        bottom: middle - WHEEL.thickness / 2,
        top: middle + WHEEL.thickness / 2
      },
      SOCKET_PANEL.depth + PLATE_THICKNESS + SOCKET_DEPTH
    ),
    seen = disc.intersect(slot)

  return { name: "volume-wheel", shape: seen.translate(CENTRING), material: SIDE_DARK }
}

// A plate laid on the top in its own recess, its face where given and its print laid over its outline.
function buildTopPlate({ name, outline, face, material, print, holes = [] }) {
  const plate = planBox(outline, face - PLATE_THICKNESS, face)

  let pierced = plate

  for (const hole of holes) {
    pierced = pierced.cut(hole)
  }

  return {
    name,
    shape: pierced.translate(CENTRING),
    material,
    face: faceOf(outline, [0, -CENTRING[1]]),
    print
  }
}

function buildBadge() {
  const outline = plateOutline(BADGE),
    windowOutline = onPlate(BADGE, COUNTER_WINDOW),
    buttonOutline = onPlate(BADGE, RESET_BUTTON),
    windowRoom = grown(windowOutline, HAIRLINE),
    buttonRoom = grown(buttonOutline, HAIRLINE),
    window = planBox(windowRoom, 0, HEIGHT + OVERRUN),
    button = planBox(buttonRoom, 0, HEIGHT + OVERRUN)

  return buildTopPlate({
    name: BADGE_PRINT,
    outline,
    face: BADGE_FACE - HAIRLINE,
    material: BADGE_PLATE,
    print: BADGE_PRINT,
    holes: [window, button]
  })
}

function buildResetButton() {
  const outline = onPlate(BADGE, RESET_BUTTON),
    button = planBox(outline, BADGE_FACE - PLATE_THICKNESS, BADGE_FACE + RESET_BUTTON.standing)

  return { name: "reset-button", shape: button.translate(CENTRING), material: BLACK_PLASTIC }
}

// Each wheel shows through its third of the window, as a plate whose print the page rolls past it.
function buildCounterWheels() {
  const window = onPlate(BADGE, COUNTER_WINDOW),
    width = (window.right - window.left) / COUNTER_WHEELS.length,
    face = BADGE_FACE - WHEELS_BEHIND

  return COUNTER_WHEELS.map(function (name, index) {
    const left = window.left + index * width

    return buildTopPlate({
      name,
      outline: { ...window, left, right: left + width },
      face,
      material: COUNTER_WHEEL_PLASTICS[index],
      print: DIGITS_PRINT
    })
  })
}

function buildRedPanel() {
  const outline = plateOutline(RED_PANEL),
    microphone = buildMicrophoneHole(),
    indicator = buildIndicatorHole()

  return buildTopPlate({
    name: RED_PANEL_PRINT,
    outline,
    face: PANEL_FACE - HAIRLINE,
    material: RED_PANEL_PLATE,
    print: RED_PANEL_PRINT,
    holes: [microphone, indicator]
  })
}

function buildIndicator() {
  const [x, y] = onPanel(INDICATOR.across, INDICATOR.down),
    bottom = HOLE_BOTTOM + HAIRLINE,
    top = PANEL_FACE + INDICATOR.standing,
    ring = makeCylinder(INDICATOR.bezel / 2, top - bottom, [x, y, bottom]),
    bore = makeCylinder(INDICATOR.bore / 2, top - bottom + 2 * OVERRUN, [x, y, bottom - OVERRUN]),
    bezel = ring.cut(bore),
    radius = INDICATOR.dome / 2,
    sphere = makeSphere(radius),
    upper = makeBox([-radius, -radius, 0], [radius, radius, radius]),
    dome = sphere.intersect(upper).translate([x, y, PANEL_FACE]),
    stem = makeCylinder(radius, PANEL_FACE - bottom, [x, y, bottom]),
    led = dome.fuse(stem)

  return [
    { name: "indicator-bezel", shape: bezel.translate(CENTRING), material: BEZEL },
    { name: "rec-indicator", shape: led.translate(CENTRING), material: LED }
  ]
}

// What shows dark: the well's floor and walls, a hairline inside it; under the louvres; behind the microphone's hole; and behind the keys, before the notch's rear wall.
function buildInterior() {
  const well = plateOutline(LID),
    room = grown(well, -BACK_THICKNESS),
    tray = planBox(well, WELL_FLOOR - BACK_THICKNESS, LID_UNDER - HAIRLINE),
    hollow = planBox(room, WELL_FLOOR, HEIGHT + OVERRUN),
    lining = tray.cut(hollow),
    louvreFloors = [-1, 1].map(function (side) {
      const inner = side * (LOUVRES.inner - HAIRLINE),
        edge = side * (WIDTH / 2 - HAIRLINE),
        first = LOUVRES.first - LOUVRES.width,
        last = LOUVRES.first + (LOUVRES.count - 1) * LOUVRES.pitch + LOUVRES.width,
        floor = HEIGHT - LOUVRES.depth,
        left = Math.min(inner, edge),
        right = Math.max(inner, edge)

      return planBox(
        {
          left,
          right,
          fromRear: first,
          toRear: last
        },
        floor - BACK_THICKNESS,
        floor + HAIRLINE
      )
    }),
    [x, y] = onPanel(MICROPHONE.across, MICROPHONE.down),
    microphone = makeCylinder(MICROPHONE.diameter / 2 + HAIRLINE, BACK_THICKNESS, [
      x,
      y,
      HOLE_BOTTOM - BACK_THICKNESS / 2
    ]),
    keyBackOutline = {
      ...across(RED_PANEL.width - 2 * HAIRLINE),
      fromRear: RED_PANEL.toRear + HAIRLINE,
      toRear: RED_PANEL.toRear + HAIRLINE + BACK_THICKNESS
    },
    keyBack = planBox(keyBackOutline, LEDGE_TOP, PANEL_FACE - PLATE_THICKNESS - 2 * HAIRLINE),
    whole = makeCompound([lining, ...louvreFloors, microphone, keyBack])

  return { name: "interior", shape: whole.translate(CENTRING), material: INTERIOR }
}

function buildSpindles() {
  const along = backOf(CASSETTE.hubRow),
    top = CASSETTE_MIDDLE + SPINDLES.pastMiddle,
    spindles = [-1, 1].map(function (side) {
      const x = (side * SPINDLES.pitch) / 2,
        collar = makeCylinder(SPINDLES.collar / 2, SPINDLES.collarHeight, [
          x,
          along,
          WELL_FLOOR - HAIRLINE
        ]),
        shaft = makeCylinder(SPINDLES.shaft / 2, top - WELL_FLOOR, [x, along, WELL_FLOOR])

      return collar.fuse(shaft)
    }),
    both = makeCompound(spindles)

  return { name: "spindles", shape: both.translate(CENTRING), material: SPINDLE_PLASTIC }
}

// A rule round the lid is the band between two rounded outlines a line's width apart.
function lidRule({ width, fromRear, toRear, line, radius }) {
  const depth = toRear - fromRear,
    middle = backOf((fromRear + toRear) / 2),
    outer = drawRoundedRectangle(width + line, depth + line, radius + line / 2),
    inner = drawRoundedRectangle(width - line, depth - line, radius - line / 2)

  return outer.cut(inner).translate(0, middle)
}

// The kernel stretches a drawing across the axis it is given, so a stretch along x is about an upright one.
function autoStop() {
  const size = fontSize(AUTO_STOP.capHeight),
    text = drawText(AUTO_STOP.word, { startX: 0, startY: 0, fontSize: size, fontFamily: HEROS }),
    [[left], [right]] = text.boundingBox.bounds,
    stretched = text.stretch(AUTO_STOP.width / (right - left), [0, 1], [left, 0]),
    baseline = backOf(AUTO_STOP.baseline)

  return stretched.translate(-left - AUTO_STOP.width / 2, baseline)
}

function arrow() {
  const tail = -ARROW.length / 2,
    neck = tail + ARROW.length - ARROW.head,
    tip = ARROW.length / 2,
    foot = backOf(ARROW.foot),
    top = backOf(ARROW.top),
    shaftTop = backOf(ARROW.shaftTop)

  return draw([tail, foot])
    .lineTo([tip, foot])
    .lineTo([neck, top])
    .lineTo([neck, shaftTop])
    .lineTo([tail, shaftTop])
    .close()
}

// The lid swings on its hinge, so each of its parts is given from the hinge's line.
function buildLid() {
  const hinge = [0, backOf(LID.fromRear), LID_TOP],
    toHinge = hinge.map(value => -value),
    middle = backOf((LID.fromRear + LID.toRear) / 2),
    depth = LID.toRear - LID.fromRear,
    outline = drawRoundedRectangle(LID.width, depth, LID.radius).translate(0, middle),
    window = outline.sketchOnPlane("XY", LID_UNDER).extrude(LID.thickness),
    inkFoot = LID_TOP + HAIRLINE,
    drawings = [...LID_RULES.map(lidRule), autoStop(), arrow()],
    ink = drawings.map(drawing => drawing.sketchOnPlane("XY", inkFoot).extrude(INK_THICKNESS)),
    allInk = makeCompound(ink)

  return {
    name: "cassette-lid",
    place: centred(hinge),
    parts: [
      { name: "cassette-window", shape: window.translate(toHinge), material: WINDOW },
      { name: "lid-ink", shape: allInk.translate(toHinge), material: INK }
    ]
  }
}

// A seated cassette's origin stands at its middle, on its middle plane, its axes the recorder's: its tape's edge toward the keys.
function cassetteSeat() {
  const middle = CASSETTE.hubRow + CASSETTE.hubsBehind - CASSETTE.depth / 2,
    seat = [0, backOf(middle), CASSETTE_MIDDLE]

  return { name: "cassette-seat", place: centred(seat), parts: [] }
}

function keyMiddle(index) {
  return (index - (KEYS.length - 1) / 2) * KEY.pitch
}

// A key's body seen from its side, its top's front edge rounded, extruded across it; its pad sunk in its top.
function buildKeyShape(x) {
  const front = backOf(KEY.toRear),
    rear = backOf(KEY.fromRear),
    bottom = KEY_TOP - KEY.front,
    profile = draw([front, bottom])
      .lineTo([front, KEY_TOP])
      .customCorner(KEY.frontRound)
      .lineTo([rear, KEY_TOP])
      .lineTo([rear, bottom])
      .close(),
    body = profile.sketchOnPlane("YZ", x - KEY.width / 2).extrude(KEY.width),
    padOutline = { ...across(PAD.width), fromRear: PAD.fromRear, toRear: PAD.toRear },
    pad = planBox(padOutline, KEY_TOP - PAD.depth, KEY_TOP + OVERRUN).translate([x, 0, 0])

  return body.cut(pad)
}

// The six keys share one print, each one's face reaching across the whole of it so that its own top lands on its own sixth. Each key stands on its axis, so that the page turns it there.
function buildKeys() {
  const margin = (KEY.pitch - KEY.width) / 2,
    keyOutline = { fromRear: KEY.fromRear, toRear: KEY.toRear }

  return KEYS.map(function (key, index) {
    const x = keyMiddle(index),
      pivot = [x, backOf(KEY.pivot.fromRear), KEY_TOP - KEY.pivot.below],
      toPivot = pivot.map(value => -value),
      shape = buildKeyShape(x).translate(toPivot),
      left = x - KEY.width / 2 - margin - index * KEY.pitch,
      face = faceOf({ ...keyOutline, left, right: left + KEYS.length * KEY.pitch }, pivot)

    return {
      name: key.name,
      shape,
      material: key.red ? KEY_RED : KEY_BLACK,
      face,
      place: centred(pivot),
      print: KEYS_PRINT
    }
  })
}

function svgOpen(width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${HEROS}">`
}

function drawRect(left, top, width, height, fill) {
  return `<rect x="${left}" y="${top}" width="${width}" height="${height}" fill="${fill}"/>`
}

// A word fitted to its measured width from its left edge.
function drawFitted({ word, left, width, baseline, capHeight, weight }, ink) {
  return `<text x="${left}" y="${baseline}" font-size="${fontSize(capHeight)}" font-weight="${weight}" fill="${ink}" textLength="${width}" lengthAdjust="spacingAndGlyphs">${word}</text>`
}

// A word centred on a point, at its own width.
function drawCentred(word, [x, baseline], capHeight, ink) {
  return `<text x="${x}" y="${baseline}" font-size="${fontSize(capHeight)}" fill="${ink}" text-anchor="middle">${word}</text>`
}

function drawPolyline(points, ink, width) {
  const listed = points.map(([x, y]) => `${x},${y}`)

  return `<polyline points="${listed.join(" ")}" fill="none" stroke="${ink}" stroke-width="${width}"/>`
}

function drawTopShell() {
  const holes = [],
    first = WIDTH / 2 - ((GRILLE.columns - 1) / 2) * GRILLE.pitch

  for (let row = 0; row < GRILLE.rows; row++) {
    for (let column = 0; column < GRILLE.columns; column++) {
      const x = first + column * GRILLE.pitch,
        y = GRILLE.firstRow + row * GRILLE.pitch

      holes.push(`<circle cx="${x}" cy="${y}" r="${GRILLE.hole / 2}"/>`)
    }
  }

  return [
    svgOpen(WIDTH, LENGTH),
    drawRect(0, 0, WIDTH, LENGTH, SHELL.colour),
    `<g fill="${GRILLE_DARK}">`,
    ...holes,
    "</g>",
    "</svg>"
  ].join("\n")
}

function drawLogo() {
  const dots = [],
    [pitchAcross, pitchDown] = LOGO.pitch,
    radius = LOGO.dot / 2

  let column = 0

  for (const letter of LOGO_WORD) {
    const rows = LOGO_LETTERS[letter]

    for (const [row, line] of rows.entries()) {
      for (const [offset, mark] of [...line].entries()) {
        const inked = mark == "#",
          x = LOGO.left + radius + (column + offset) * pitchAcross,
          y = LOGO.top + radius + row * pitchDown

        if (inked) {
          dots.push(`<circle cx="${x}" cy="${y}" r="${radius}"/>`)
        }
      }
    }

    const [firstRow] = rows

    column += firstRow.length + 1
  }

  return [`<g fill="${LOGO_INK}">`, ...dots, "</g>"].join("\n")
}

function drawBadge() {
  const depth = BADGE.toRear - BADGE.fromRear

  return [
    svgOpen(BADGE.width, depth),
    drawRect(0, 0, BADGE.width, depth, BADGE_PLATE.colour),
    drawFitted(COUNTER_WORD, LOGO_INK),
    drawLogo(),
    "</svg>"
  ].join("\n")
}

// One wheel's figures, 0 to 9 down a strip a window's depth apiece, which the page rolls past the window; which way a real wheel's figures run is not seen, and is a guess.
function drawCounterDigits() {
  const width = (COUNTER_WINDOW.right - COUNTER_WINDOW.left) / COUNTER_WHEELS.length,
    cell = COUNTER_WINDOW.bottom - COUNTER_WINDOW.top,
    depth = cell * COUNTER_FIGURES,
    figures = []

  for (let figure = 0; figure < COUNTER_FIGURES; figure++) {
    const baseline = (figure + 0.5) * cell + FIGURE_HEIGHT / 2,
      label = String(figure),
      drawn = drawCentred(label, [width / 2, baseline], FIGURE_HEIGHT, FIGURE_INK)

    figures.push(drawn)
  }

  return [
    svgOpen(width, depth),
    drawRect(0, 0, width, depth, WHEEL_WHITE),
    ...figures,
    "</svg>"
  ].join("\n")
}

// The keys' symbols, drawn about a middle: a dot, triangles pointing the way the tape runs, a square, a triangle pointing down and two bars.
function drawDot([x, y]) {
  return `<circle cx="${x}" cy="${y}" r="${LEGEND.symbol / 3}"/>`
}

// Triangles side by side about a middle, a turn of 1 pointing them right and of -1 left.
function drawTriangles([x, y], turn, count) {
  const half = LEGEND.symbol / 2,
    drawn = []

  for (let index = 0; index < count; index++) {
    const middle = x + (index - (count - 1) / 2) * LEGEND.symbol,
      tip = middle + turn * half,
      foot = middle - turn * half

    drawn.push(`<polygon points="${tip},${y} ${foot},${y - half} ${foot},${y + half}"/>`)
  }

  return drawn.join("")
}

function drawSquareAndDown([x, y]) {
  const half = LEGEND.symbol / 2,
    square = drawRect(
      x + LEGEND.ejectSquare - half,
      y - half,
      LEGEND.symbol,
      LEGEND.symbol,
      LEGEND_GREY
    ),
    downX = x + LEGEND.ejectTriangle

  return `${square}<polygon points="${downX - half},${y - half} ${downX + half},${y - half} ${downX},${y + half}"/>`
}

function drawBars([x, y]) {
  const half = LEGEND.symbol / 2,
    bar = LEGEND.symbol / 4

  return (
    drawRect(x - half, y - half, bar, LEGEND.symbol, LEGEND_GREY) +
    drawRect(x + half - bar, y - half, bar, LEGEND.symbol, LEGEND_GREY)
  )
}

const SYMBOLS = new Map([
  ["record-key", drawDot],
  ["play-key", middle => drawTriangles(middle, 1, 1)],
  ["rewind-key", middle => drawTriangles(middle, -1, 2)],
  ["advance-key", middle => drawTriangles(middle, 1, 2)],
  ["stop-eject-key", drawSquareAndDown],
  ["pause-key", drawBars]
])

function drawRedPanel() {
  const depth = RED_PANEL.toRear - RED_PANEL.fromRear,
    strip = RED_PANEL.strip - RED_PANEL.fromRear,
    middle = RED_PANEL.width / 2,
    words = PANEL_WORDS.map(word => drawFitted(word, PANEL_WHITE)),
    rules = PANEL_RULES.map(points => drawPolyline(points, PANEL_WHITE, RULE_WIDTH)),
    legends = []

  for (const [index, key] of KEYS.entries()) {
    const x = middle + keyMiddle(index),
      symbol = SYMBOLS.get(key.name),
      left = x - key.width / 2,
      word = {
        word: key.word,
        left,
        width: key.width,
        baseline: LEGEND.baseline,
        capHeight: LEGEND.capHeight,
        weight: 400
      },
      drawnSymbol = symbol([x, LEGEND.symbolMiddle]),
      drawnWord = drawFitted(word, LEGEND_GREY)

    legends.push(drawnSymbol, drawnWord)
  }

  return [
    svgOpen(RED_PANEL.width, depth),
    drawRect(0, 0, RED_PANEL.width, strip, RED_PANEL_PLATE.colour),
    drawRect(0, strip, RED_PANEL.width, depth - strip, STRIP_BLACK),
    ...words,
    ...rules,
    `<g fill="${LEGEND_GREY}">`,
    ...legends,
    "</g>",
    "</svg>"
  ].join("\n")
}

function drawPad(left, ink) {
  const top = PAD.fromRear - KEY.fromRear,
    depth = PAD.toRear - PAD.fromRear,
    columns = Math.floor(PAD.width / PAD.grid),
    rows = Math.floor(depth / PAD.grid),
    first = left + (PAD.width - (columns - 1) * PAD.grid) / 2,
    firstRow = top + (depth - (rows - 1) * PAD.grid) / 2,
    dots = []

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = first + column * PAD.grid,
        y = firstRow + row * PAD.grid

      dots.push(`<circle cx="${x}" cy="${y}" r="${PAD.dot / 2}"/>`)
    }
  }

  return [`<g fill="${ink}">`, ...dots, "</g>"].join("\n")
}

function drawKeys() {
  const width = KEYS.length * KEY.pitch,
    depth = KEY.toRear - KEY.fromRear,
    drawn = [svgOpen(width, depth)]

  for (const [index, key] of KEYS.entries()) {
    const left = index * KEY.pitch,
      ground = key.red ? KEY_RED.colour : KEY_BLACK.colour,
      ink = key.red ? PAD_RED : PAD_BLACK,
      padLeft = left + (KEY.pitch - PAD.width) / 2,
      top = drawRect(left, 0, KEY.pitch, depth, ground),
      pad = drawPad(padLeft, ink)

    drawn.push(top, pad)
  }

  drawn.push("</svg>")

  return drawn.join("\n")
}

function drawSocketPanel() {
  const length = SOCKET_PANEL.toRear - SOCKET_PANEL.fromRear,
    toPrint = ([along, height]) => [along - SOCKET_PANEL.fromRear, PARTING - height],
    words = SIDE_LEGENDS.map(function ({ word, along, height }) {
      const [x, y] = toPrint([along, height])

      return drawCentred(word, [x, y + SIDE_CAP_HEIGHT / 2], SIDE_CAP_HEIGHT, SIDE_WHITE)
    }),
    rule = [
      [VOLUME_RULE.from, VOLUME_RULE.height],
      [VOLUME_RULE.to, VOLUME_RULE.height]
    ],
    lines = [rule, ...COMPUTER_LINES].map(function (points) {
      const printed = points.map(toPrint)

      return drawPolyline(printed, SIDE_WHITE, RULE_WIDTH)
    })

  return [
    svgOpen(length, PANEL_HEIGHT),
    drawRect(0, 0, length, PANEL_HEIGHT, SOCKET_PANEL_PLATE.colour),
    ...words,
    ...lines,
    "</svg>"
  ].join("\n")
}

export function buildCrc1001() {
  const prints = [
    [TOP_PRINT, drawTopShell(), TOP_PIXELS],
    [BADGE_PRINT, drawBadge(), PLATE_PIXELS],
    [DIGITS_PRINT, drawCounterDigits(), PLATE_PIXELS],
    [RED_PANEL_PRINT, drawRedPanel(), PLATE_PIXELS],
    [KEYS_PRINT, drawKeys(), PLATE_PIXELS],
    [SOCKET_PANEL_PRINT, drawSocketPanel(), PLATE_PIXELS]
  ]

  return {
    tessellation: TESSELLATION,
    parts: [
      buildTopShell(),
      buildBase(),
      buildHandle(),
      buildInterior(),
      buildSpindles(),
      buildBadge(),
      ...buildCounterWheels(),
      buildResetButton(),
      buildLid(),
      cassetteSeat(),
      buildRedPanel(),
      ...buildIndicator(),
      ...buildKeys(),
      buildSocketPanel(),
      buildSocketBodies(),
      buildJackRings(),
      buildVolumeWheel()
    ],
    prints: prints.map(([name, svg, pixels]) => ({ name, language: LANGUAGE, svg, pixels }))
  }
}
