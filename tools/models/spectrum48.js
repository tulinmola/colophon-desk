import { draw, drawRoundedRectangle, makeBox, makeCompound, makeCylinder } from "replicad"
import { Resvg } from "@resvg/resvg-js"
import { resolve } from "node:path"

// x runs from the left end, y back from the front edge and z up from the lower case's base, in millimetres. The feet stand below it, under a negative z.
// Depths are measured forward from the rear outline, as fromRear, and the keys' grid in pitches: u right from key 1's middle, rows forward from the number row.

// "Width 233 mm / Depth 144 mm / Height 30 mm" [A], Sinclair's 1982 leaflet as transcribed: https://rk.nvg.ntnu.no/sinclair/computers/zxspectrum/spec_technical.htm, and "233x144x30mm" on PCW's production prototype [B]: https://www.tebbo.com/archive/pw8206.htm
// The Bibliothèque nationale's public-domain studio photographs of unit 022-007502 give 232.0 to 232.5 across the rear, scaled on the edge connector's 2.54 pitch [E], https://commons.wikimedia.org/wiki/File:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Sinclair_-_ZX_Spectrum._Micro-ordinateur_Sinclair_ZX_Spectrum,_n%C2%B0_de_s%C3%A9rie_022-007502_-_btv1b55013033m_(07_of_43).jpg, and 233.1 to 234.6 by 144.1 to 145.0 underneath, scaled on its five screws fitted to the Issue 3B board's mounting holes [E], https://commons.wikimedia.org/wiki/File:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Sinclair_-_ZX_Spectrum._Micro-ordinateur_Sinclair_ZX_Spectrum,_n%C2%B0_de_s%C3%A9rie_022-007502_-_btv1b55013033m_(10_of_43).jpg
// A replacement case made to fit the original's holes and feet measures 234.0 by 144.0 [D]: https://www.printables.com/model/700687-replacement-zx-spectrum-48k-case-key-caps-for-mech
const WIDTH = 233,
  DEPTH = 144

// The rear face stands 28.3 ±0.6 above the base, feet excluded, on the photograph from behind, its vertical scale taken from a camera 20 to 22° above the keys by their rows' foreshortening [E].
// Sinclair's 30 [A] is first the designer's ceiling, "MAX HEIGHT 30mm @ RE[AR]" [A]: https://www.flickr.com/photos/9574086@N02/697761930/; the design patent's side views scaled to 233 wide give 30.2 to 31.1 [E], https://patentimages.storage.googleapis.com/6b/3e/70/86c196895b83f5/USD277484.pdf; the Science Museum measures 32 and 33 [B], https://collection.sciencemuseumgroup.org.uk/objects/co8421531/sinclair-zx-spectrum-microcomputer-1982-1985 and https://collection.sciencemuseumgroup.org.uk/objects/co8192867/sinclair-zx-spectrum-computer-in-original-packaging, Rotterdam 32, http://museumrotterdam.nl/collectie/item/77523-1-14, and Valencia 30 and 29, http://ceres.mcu.es/pages/Main?idt=121833&inventary=CE2017/020/003&table=FMUS&museum=MUPV and http://ceres.mcu.es/pages/Main?idt=125153&inventary=CE2023/009/046&table=FMUS&museum=MUPV, none saying whether its figure takes in the feet. 28.3 is taken; the disagreement stands until a real unit is measured.
const REAR_HEIGHT = 28.3

// "a flatter design with a raised rear section and rounded sides" [B]: https://www.theregister.com/2012/04/23/retro_week_sinclair_zx_spectrum_at_30?page=2
// The cases part at a fine groove 11.1 above the base across the rear [E], where the patent draws it at 11.9 to 12.2 [E]. The raised section's flat top runs forward 41.1 from the rear and steps down to the deck at 44.9, on the photograph from above scaled by the case's outline [E]: https://commons.wikimedia.org/wiki/File:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Sinclair_-_ZX_Spectrum._Micro-ordinateur_Sinclair_ZX_Spectrum,_n%C2%B0_de_s%C3%A9rie_022-007502_-_btv1b55013033m_(09_of_43).jpg
// The deck's height and slope are guesses, read roughly: it stands about 22 at the front on the photograph from in front [E], https://commons.wikimedia.org/wiki/File:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Sinclair_-_ZX_Spectrum._Micro-ordinateur_Sinclair_ZX_Spectrum,_n%C2%B0_de_s%C3%A9rie_022-007502_-_btv1b55013033m_(05_of_43).jpg, where the patent's proportions give 22.8 to 24.1 [E], and rises 1° toward the rear on the patent's side views, which read 0.8 to 1.1° [E]. The raised section so stands 4.6 above it at the step, where the photograph reads 4.3 to 5.1 and a second reading of the patent 7.5, and the step falls over 3.8 at about 50°, where the photograph reads 47° over 4 and the patent 32° over 6.
// The raised top dips from the ends to the middle by 0.25 to 0.8 on the photographs [E], and is drawn flat.
const PARTING = 11.1,
  RAISED_TOP_FRONT = 41.1,
  STEP_FOOT = 44.9,
  DECK_FRONT = 22,
  DECK_RISE = 1

// Above the parting line the ends lean in 0.6, 1.1, 1.5, 2.1 and 2.5 at 16.4, 19.7, 22.2, 23.8 and 25.5, on the rear photograph's silhouettes [E]; a plane through the parting line leaning 8.8° stands within 0.3 of them. The tops round over into the ends, the raised top's reaching 4 to 5 in and the deck's 4.1 to 5.9, where the template's bend begins on the photograph from above [E]: a round of 3 meets both.
// The corners in plan read 1 to 2 from above [E], where the patent draws them square; 1.5 is taken. How far the front's top edge and the rear's round over is not read: 2 and 1.5 are taken.
const END_LEAN = 8.8,
  TOP_EDGE_RADIUS = 3,
  PLAN_RADIUS = 1.5,
  NOSE_RADIUS = 2,
  REAR_TOP_RADIUS = 1.5

// The lower case is a tray flush with the upper at the rear. At the ends it rounds in from the parting line to stand 5.0 in from 5.8 down, reading 0.3, 0.9, 1.6, 3.0 and 4.6 in at 10.7, 9.0, 8.2, 7.4 and 6.6, and its bottom edge rounds over about 2.5, on the rear photograph's silhouettes [E]; the round in is drawn as the arc through the parting line, 1.6 in at 8.2 and 5.0 at 5.8, and the other readings stand within 0.6 of it.
// At the front it stands back 5.8 on the photograph from underneath, 6 to 8 on the photograph from in front and 7.9 on the patent [E]; 6 is taken, its round the end's stretched to it, which no photograph reads.
const BASE_STEP = 5.8,
  END_SET_IN = 5,
  FRONT_SET_BACK = 6,
  END_ARC_THROUGH = [1.6, 8.2],
  BOTTOM_RADIUS = 2.5

// Four rubber feet on the photograph from underneath [E], the rear pair long front to back and the front pair across. Replacements made to fit stand 2.5 [D], https://www.retroleum.co.uk/spectrum-fittings, where a collector says they add 2 [C], https://www.sinclaircollection.site/?p=418; 2.5 is taken.
const FOOT_HEIGHT = 2.5,
  FEET = [
    { left: 13.8, right: 24.3, fromRear: 20.2, toRear: 34.1 },
    { left: 208.7, right: 219, fromRear: 19.9, toRear: 33.8 },
    { left: 20.1, right: 34.2, fromRear: 121, toRear: 131.3 },
    { left: 199, right: 213, fromRear: 120.5, toRear: 130.8 }
  ]

// "turn the computer upside-down to reveal five self-tapping screws" [A], service manual §2: https://spectrumcomputing.co.uk/pub/sinclair/technical-docs/ZXSpectrum48K_ServiceManual.pdf, black and countersunk on a replacement set [D], https://www.dataserve-retro.co.uk/contents/en-uk/p2433_Sinclair-ZX-Spectrum-16K-_-48K-Replacement-Case-Screws-_-Rubber-Feet.html
// They stand on the Issue 3B board's mounting holes, the board's left edge 9.8 from the left end and its rear edge 5.9 forward of the rear, which the photograph from underneath fits within 0.33, each in a round recess about 5.6 across [D, E]: https://github.com/liveboxandy/ZX-Spectrum-48K-Issue-3B---Based-on-Gerbers-by-PABB-on-PCBWay. An Issue 4B recreation puts its sockets and slot 1.8 to 3.5 from the 3B's [D], https://github.com/iansbremner/ZX-Spectrum-Issue-4B-KiCAD, and the photographs side with the 3B.
// The speaker's grille is eight holes 2.4 across on a circle of 11.0 about a middle at 200.3 and 120.4 from the rear, one every 30° but in the front right quarter, where the foot stands; the case made to fit puts the ring's middle at 200.2 and 119.2 [D]. Ten vent slots 5.1 by 1.5 run along the right end from 218.2 to 223.3, the first 56.6 from the rear and one every 6.96 [E].
// The recessed panel behind the slot that carries the serial number in red, from 122.9 to 200.4 and 3 to 16.1 from the rear, and the moulded lettering by the left rear foot are not drawn.
// How deep the recesses, holes and slots run is not read: 2 is taken, and the screws' heads 5 across.
const SCREWS = [
    { middle: 14.2, fromRear: 131.3 },
    { middle: 218.5, fromRear: 130.7 },
    { middle: 14.1, fromRear: 50.7 },
    { middle: 218.6, fromRear: 50.2 },
    { middle: 116.4, fromRear: 10.5 }
  ],
  SCREW = { recess: 5.6, head: 5, depth: 2 },
  SPEAKER = {
    middle: 200.3,
    fromRear: 120.4,
    radius: 11,
    hole: 2.4,
    turns: [30, 60, 90, 120, 150, 180, 210, 240]
  },
  VENTS = { left: 218.2, right: 223.3, width: 1.5, first: 56.6, pitch: 6.96, count: 10 },
  UNDERSIDE_DEPTH = 2

// Seen from the front, the rear carries the TV socket, EAR, MIC, the expansion slot and 9V DC: "three jack sockets (marked 9V DC IN, EAR and MIC), one TV socket, and an edge connector on the back" [A], https://worldofspectrum.org/ZXSpectrumIntroduction/chapter_one.html; EAR and MIC are 3.5 mm jacks and the power socket a 2.1 mm coaxial one [A], service manual parts list.
// Their openings, rounded oblongs straddling the parting line, on the rear photograph scaled on the edge connector [E], where the Issue 3B board puts the jacks' middles within 0.6 and the case made to fit puts its openings' middles within 1.5, though it makes them narrower, EAR and MIC 10 wide and 9V DC 210.5 to 220.0 [D]. Their corners read about 2 round, the TV recess's 1.5 [E].
// The TV socket stands in a recess of its own, its bore at 22.3 and seen 16.3 up, a bright ring 7.1 across about a hole 3 across [E], on the modulator behind it. How deep the recess runs, how far the ring stands in it and where the modulator's face stands are not read: 1.5, flush with the recess's floor, and 4 in, are taken.
const OPENINGS = [
    { left: 62.6, right: 74.6, bottom: 3.8, top: 15.5, radius: 2 },
    { left: 76.9, right: 89.1, bottom: 3.8, top: 15.5, radius: 2 },
    { left: 207.9, right: 219.6, bottom: 4.1, top: 17.2, radius: 2 }
  ],
  TV_RECESS = { left: 16, right: 30.4, bottom: 7.8, top: 21.9, radius: 1.5, depth: 1.5 },
  TV_SOCKET = { middle: 22.3, seen: 16.3, ring: 7.1, bore: 3 },
  MODULATOR_FACE = 4

// The expansion slot is a notch in the lower case's rear wall from 124.0 to 199.4 and up to 10.7, its sill the floor at 1.6 standing 1.4 inside, so that underneath it opens along the rear edge [E]; the case made to fit has it 123.8 to 199.2 [D].
const SLOT = { left: 124, right: 199.4, top: 10.7, sill: 1.6, inside: 1.4 }

// Behind the openings the board's rear edge stands 5.9 forward of the rear, the jacks' mouths at it, their bores at 68.0 and 82.6 for EAR and MIC and at 214.5 for 9V DC [D, E]. Its edge connector carries 2.54 pitch fingers, four, a polarising slot 2.0 wide and 8.5 deep, then 23, their middles 117.1 to 185.7 along the board [D].
// On the rear photograph the board is seen from 6.6 to 8.2 up and the bores at 11.9, 11.9 and 13.3, but the camera stands 21° above them, so that each reads higher on the face than it stands by its depth behind the face times tan 21° [E]: drawn so lowered, the jacks stand in the middles of their openings, and the board in the slot's.
// The rear wall's thickness, the room behind it, the fingers' width and length, and the sockets' bodies are not measured: a wall of 2, a room reaching 16 in between the floor at 1.6 and 24, fingers 1.8 wide and 8 long, jacks' bodies 7.2 wide with a boss 6 across standing 1.2 proud about a 3.5 bore, a power socket's body 9 wide about a 6.3 bore and a 2 pin standing 1 inside its mouth, each body centred on its bore, and the modulator a dark block behind the TV recess, are taken.
const REAR_WALL = 2,
  ROOM = { left: 12, right: 221, toRear: 16, floor: 1.6, top: 24 },
  CAMERA_ELEVATION = 21,
  BOARD = { left: 9.8, fromRear: 5.9, seenBottom: 6.6, seenTop: 8.2 },
  FINGERS = { first: 117.1, pitch: 2.54, count: 28, polarising: 4, width: 1.8, length: 8 },
  POLARISING_SLOT = { width: 2, depth: 8.5 },
  JACKS = [
    { middle: 68, seen: 11.9 },
    { middle: 82.6, seen: 11.9 }
  ],
  JACK = { width: 7.2, boss: 6, bossDepth: 1.2, bore: 3.5 },
  POWER_SOCKET = { middle: 214.5, seen: 13.3, width: 9, bore: 6.3, pin: 2, pinInside: 1 },
  SOCKET_BORE_DEPTH = 5

// The labels are printed in red capitals on the rear face over their sockets [E]: "9V DC" 11.6 wide about 214.6, from 21.7 to 24.4; MIC 7.1 wide about 82.6 and EAR 7.7 wide over its socket's middle at 68.0, from 17.6 to 20.5; and TV 5.2 wide about 21.0, from 21.8 to 24.6, which the photograph shows standing on the TV recess's top: it is drawn just clear of it, from 22.1. Each is set from its capitals' height and spaced out to its width.
const REAR_LABELS = [
  { word: "TV", middle: 21, width: 5.2, bottom: 22.1, top: 24.9 },
  { word: "EAR", middle: 68, width: 7.7, bottom: 17.6, top: 20.5 },
  { word: "MIC", middle: 82.6, width: 7.1, bottom: 17.6, top: 20.5 },
  { word: "9V DC", middle: 214.6, width: 11.6, bottom: 21.7, top: 24.4 }
]

// "sinclair" is moulded in smooth relief on the raised top's grain, and "ZX Spectrum" printed white under it, both from 10.6 [E], on the photograph from above at 17.85 pixels to the millimetre about the case's middle.
// The logotype is eight blocks 8.0 tall from 5.0 behind the rear, where another reading of the same photograph has it reach 14.1, parted by gaps 0.56 wide; the i's dots and the l's stem rise 3.08 above them, the dots standing 0.67 clear. Measured from its left edge: s 0 to 14.45, grooved 2.58 down from 2.41 to its right edge and 5.55 down from its left edge to 11.93; i 15.01 to 17.37; n 17.93 to 32.77, open below from 20.73 to 30.25 under a bar 2.24 deep; c 33.33 to 48.18, open to the right from 35.85 between 2.24 and 5.83 down; l 48.63 to 50.98; a 51.54 to 66.33, grooved 2.58 down from its left edge to 63.75 and 5.55 down from 54.23 to 63.75; i 66.89 to 69.47; and r 70.03 to 84.76, a bar 2.24 deep over a stem to 72.66. The grooves read about 0.45 wide [E]; the dark edge each block is drawn with, 0.15 wide, stands for the light falling off its relief and is a guess.
// "ZX Spectrum" stands 32.3 wide, its capitals 3.87 tall from 17.5 behind the rear, in a bold grotesque TeX Gyre Heros stands in for [E].
const SINCLAIR = {
    left: 10.6,
    fromRear: 5,
    height: 8,
    gap: 0.56,
    rise: 3.08,
    dotGap: 0.67,
    groove: 0.45,
    edge: 0.15
  },
  SINCLAIR_BLOCKS = [
    {
      left: 0,
      right: 14.45,
      grooves: [
        { left: 2.41, right: 14.45, middle: 2.58 },
        { left: 0, right: 11.93, middle: 5.55 }
      ]
    },
    { left: 15.01, right: 17.37, dot: true },
    { left: 17.93, right: 32.77, opening: { left: 20.73, right: 30.25, top: 2.24, bottom: 8 } },
    { left: 33.33, right: 48.18, opening: { left: 35.85, right: 48.18, top: 2.24, bottom: 5.83 } },
    { left: 48.63, right: 50.98, stem: true },
    {
      left: 51.54,
      right: 66.33,
      grooves: [
        { left: 51.54, right: 63.75, middle: 2.58 },
        { left: 54.23, right: 63.75, middle: 5.55 }
      ]
    },
    { left: 66.89, right: 69.47, dot: true },
    { left: 70.03, right: 84.76, opening: { left: 72.66, right: 84.76, top: 2.24, bottom: 8 } }
  ],
  MODEL_NAME = { word: "ZX Spectrum", left: 10.6, width: 32.3, fromRear: 17.5, capHeight: 3.87 }

// The "Keyboard Template" [A], service manual table 5.1, an "Ano coil printed keyboard overlay" [A] on the designer's sketch, https://www.flickr.com/photos/9574086@N02/697782712/, and "a black metal plate" to PCW [B], held by double-sided tape "around all four edges" [A].
// It runs forward from the step's foot 96.6 to 97.2 on the photograph from above and 95.6 to 97.6 on two more scaled by the key pitch [E]: Nico Kaiser's, https://commons.wikimedia.org/wiki/File:Sinclair_ZX_Spectrum_48k_(7160141482).jpg, and William Warby's, https://commons.wikimedia.org/wiki/File:Sinclair_ZX_Spectrum_(16801824525)_(2).jpg. 96.5 is taken, leaving 2.6 of the nose before it, where a sheet made to lie on it is 92 deep [D], https://www.printables.com/model/891085-zx-spectrum-keyboard-overlay-for-48k-rubber-key-mo, and a printed case's recess for it 87.2 [D], https://www.thingiverse.com/thing:1240780
// It wraps the ends: on the right end's photograph the rainbow's stripes run down over the round to a straight edge on the end face [E], https://commons.wikimedia.org/wiki/File:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Sinclair_-_ZX_Spectrum._Micro-ordinateur_Sinclair_ZX_Spectrum,_n%C2%B0_de_s%C3%A9rie_022-007502_-_btv1b55013033m_(08_of_43).jpg, the patent draws that edge about 7 below the deck, rising at the step [E], and the designer's dropped wedge already meant to "continue Aluminium bezel over Radius" [A], https://www.flickr.com/photos/9574086@N02/696905353/. A flat plate with a rim of 1.8 beyond it, as Kaiser's photograph and the flat sheets made to fit read it, is the other reading [E, D], and one look at a real unit's end settles it.
// Its rear corners read rounded 3 to 4.5 on the photograph from above, about 2 on Kaiser's and 4.0 on the sheet made to fit [E, D]; drawn, they are where the step cuts the bend, unrounded in plan.
// Its thickness is not found; 0.4 is taken, lying flush with the nose in a recess of its own depth, which no source gives either.
const TEMPLATE_DEPTH = 96.5,
  FLANGE_DEPTH = 7,
  TEMPLATE_THICKNESS = 0.4

// "KEY TOP 14 × 10" and "20 c/c" [A], on the designer's sketch: https://www.flickr.com/photos/9574086@N02/697768028/. A replacement membrane's locating holes stand 20.00 apart across the rows and 19.9 along them [D], https://oldcomputer.info/hacks/zxkeyb/index.htm, and the sheet made to fit puts its holes on a 20.0 grid [D]. Three photographs put the row pitch at 1.001, 1.013 and 1.027 of the column pitch [E]; a square 20 is taken.
// The rows stand ½, ¾ and 1¼ pitch right of the number row, alike to ±0.005 on three photographs [E]. Key 1's middle stands 15.2 in front of the template's rear edge on Kaiser's photograph, and 19.0 from the left end with the keys' field centred on the case, as the photograph from above shows it [E], ±1.
// CAPS SHIFT is about 19 wide with its left edge on key 1's, and BREAK SPACE about 24 with its right edge on ENTER's, on two photographs and the sheet made to fit [E, D]; ENTER and SYMBOL SHIFT are ordinary.
const KEY_PITCH = 20,
  KEY_ONE = { middle: 19, fromRear: STEP_FOOT + 15.2 },
  CAPS_SHIFT_WIDTH = 19,
  BREAK_SPACE_WIDTH = 24

// The keys' field in pitches about key 1's middle, which the legends' atlas covers.
const KEY_FIELD = { left: -0.5, top: -0.5, keys: 11, rows: 4 }

// Every key by its number in the emulator's key matrix: the address line that selects its half row, counted from A8, times eight, and the bit that reads it [C], https://sinclair.wiki.zxnet.co.uk/wiki/Keyboard, as colophon-emulator's SPECTRUM_KEY numbers it.
// What each prints is read on the photographs from above, not on a table of what each key does [E]: each key its character, its keyword and, on 1 to 8, the graphic the GRAPHICS mode gives it, its inked quarters left unprinted, and a number key its red symbol.
const KEYS = [
  { number: 24, u: 0, row: 0, digit: "1", symbol: "!", graphic: [0, 1, 0, 0] },
  { number: 25, u: 1, row: 0, digit: "2", symbol: "@", graphic: [1, 0, 0, 0] },
  { number: 26, u: 2, row: 0, digit: "3", symbol: "#", graphic: [1, 1, 0, 0] },
  { number: 27, u: 3, row: 0, digit: "4", symbol: "$", graphic: [0, 0, 0, 1] },
  { number: 28, u: 4, row: 0, digit: "5", symbol: "%", graphic: [0, 1, 0, 1] },
  { number: 36, u: 5, row: 0, digit: "6", symbol: "&", graphic: [1, 0, 0, 1] },
  { number: 35, u: 6, row: 0, digit: "7", symbol: "'", graphic: [1, 1, 0, 1] },
  { number: 34, u: 7, row: 0, digit: "8", symbol: "(", graphic: [0, 0, 0, 0] },
  { number: 33, u: 8, row: 0, digit: "9", symbol: ")" },
  { number: 32, u: 9, row: 0, digit: "0", symbol: "_" },
  { number: 16, u: 0.5, row: 1, letter: "Q", keyword: "PLOT" },
  { number: 17, u: 1.5, row: 1, letter: "W", keyword: "DRAW" },
  { number: 18, u: 2.5, row: 1, letter: "E", keyword: "REM" },
  { number: 19, u: 3.5, row: 1, letter: "R", keyword: "RUN" },
  { number: 20, u: 4.5, row: 1, letter: "T", keyword: "RAND" },
  { number: 44, u: 5.5, row: 1, letter: "Y", keyword: "RETURN" },
  { number: 43, u: 6.5, row: 1, letter: "U", keyword: "IF" },
  { number: 42, u: 7.5, row: 1, letter: "I", keyword: "INPUT" },
  { number: 41, u: 8.5, row: 1, letter: "O", keyword: "POKE" },
  { number: 40, u: 9.5, row: 1, letter: "P", keyword: "PRINT" },
  { number: 8, u: 0.75, row: 2, letter: "A", keyword: "NEW" },
  { number: 9, u: 1.75, row: 2, letter: "S", keyword: "SAVE" },
  { number: 10, u: 2.75, row: 2, letter: "D", keyword: "DIM" },
  { number: 11, u: 3.75, row: 2, letter: "F", keyword: "FOR" },
  { number: 12, u: 4.75, row: 2, letter: "G", keyword: "GOTO" },
  { number: 52, u: 5.75, row: 2, letter: "H", keyword: "GOSUB" },
  { number: 51, u: 6.75, row: 2, letter: "J", keyword: "LOAD" },
  { number: 50, u: 7.75, row: 2, letter: "K", keyword: "LIST" },
  { number: 49, u: 8.75, row: 2, letter: "L", keyword: "LET" },
  { number: 48, u: 9.75, row: 2, lines: "enter" },
  { number: 0, u: 0.125, row: 3, width: CAPS_SHIFT_WIDTH, lines: "capsShift" },
  { number: 1, u: 1.25, row: 3, letter: "Z", keyword: "COPY" },
  { number: 2, u: 2.25, row: 3, letter: "X", keyword: "CLEAR" },
  { number: 3, u: 3.25, row: 3, letter: "C", keyword: "CONT" },
  { number: 4, u: 4.25, row: 3, letter: "V", keyword: "CLS" },
  { number: 60, u: 5.25, row: 3, letter: "B", keyword: "BORDER" },
  { number: 59, u: 6.25, row: 3, letter: "N", keyword: "NEXT" },
  { number: 58, u: 7.25, row: 3, letter: "M", keyword: "PAUSE" },
  { number: 57, u: 8.25, row: 3, lines: "symbolShift" },
  { number: 56, u: 9.5, row: 3, width: BREAK_SPACE_WIDTH, lines: "breakSpace" }
]

// The red symbol-shift legend on each letter key, by its number, with its ink's right edge and a word's width as Kaiser's photograph measures them about the key's middle [E]; a word is fitted to its width, which Heros Bold at the same capitals inks 3 to 14 per cent wider.
const SYMBOL_SHIFT_LEGENDS = new Map([
  [16, { symbol: "<=", right: 4.12 }],
  [17, { symbol: "<>", right: 4.43 }],
  [18, { symbol: ">=", right: 4.18 }],
  [19, { symbol: "<", right: 3.8 }],
  [20, { symbol: ">", right: 3.97 }],
  [44, { word: "AND", right: 5.22, width: 4.88 }],
  [43, { word: "OR", right: 5.28, width: 3.16 }],
  [42, { word: "AT", right: 5.4, width: 2.64 }],
  [41, { symbol: ";", right: 4.93 }],
  [40, { symbol: '"', right: 4.73 }],
  [8, { word: "STOP", right: 4.46, width: 6.2 }],
  [9, { word: "NOT", right: 4.28, width: 4.68 }],
  [10, { word: "STEP", right: 4.66, width: 6.04 }],
  [11, { word: "TO", right: 4.71, width: 3.14 }],
  [12, { word: "THEN", right: 5.17, width: 6.3 }],
  [52, { symbol: "↑", right: 4.7 }],
  [51, { symbol: "−", right: 5.33 }],
  [50, { symbol: "+", right: 5.62 }],
  [49, { symbol: "=", right: 5.3 }],
  [1, { symbol: ":", right: 3.64 }],
  [2, { symbol: "£", right: 4.43 }],
  [3, { symbol: "?", right: 4.67 }],
  [4, { symbol: "/", right: 4.93 }],
  [60, { symbol: "*", right: 4.63 }],
  [59, { symbol: ",", right: 4.71 }],
  [58, { symbol: ".", right: 4.7 }]
])

// What the template prints about each key, by its number: the colour names, the caps-shifted words and the green keywords above it and the red keywords below; nothing about ENTER and the shifts and BREAK SPACE.
const TEMPLATE_WORDS = new Map([
  [24, { colour: "BLUE", above: "EDIT", below: "DEF FN" }],
  [25, { colour: "RED", above: "CAPS LOCK", below: "FN" }],
  [26, { colour: "MAGENTA", above: "TRUE VIDEO", below: "LINE" }],
  [27, { colour: "GREEN", above: "INV. VIDEO", below: "OPEN #" }],
  [28, { colour: "CYAN", arrow: "left", below: "CLOSE #" }],
  [36, { colour: "YELLOW", arrow: "down", below: "MOVE" }],
  [35, { colour: "WHITE", arrow: "up", below: "ERASE" }],
  [34, { arrow: "right", below: "POINT" }],
  [33, { above: "GRAPHICS", below: "CAT" }],
  [32, { colour: "BLACK", above: "DELETE", below: "FORMAT" }],
  [16, { above: "SIN", below: "ASN" }],
  [17, { above: "COS", below: "ACS" }],
  [18, { above: "TAN", below: "ATN" }],
  [19, { above: "INT", below: "VERIFY" }],
  [20, { above: "RND", below: "MERGE" }],
  [44, { above: "STR $", below: "[" }],
  [43, { above: "CHR $", below: "]" }],
  [42, { above: "CODE", below: "IN" }],
  [41, { above: "PEEK", below: "OUT" }],
  [40, { above: "TAB", below: "©" }],
  [8, { above: "READ", below: "~" }],
  [9, { above: "RESTORE", below: "|" }],
  [10, { above: "DATA", below: "\\" }],
  [11, { above: "SGN", below: "{" }],
  [12, { above: "ABS", below: "}" }],
  [52, { above: "SQR", below: "CIRCLE" }],
  [51, { above: "VAL", below: "VAL $" }],
  [50, { above: "LEN", below: "SCREEN $" }],
  [49, { above: "USR", below: "ATTR" }],
  [1, { above: "LN", below: "BEEP" }],
  [2, { above: "EXP", below: "INK" }],
  [3, { above: "L PRINT", below: "PAPER" }],
  [4, { above: "L LIST", below: "FLASH" }],
  [60, { above: "BIN", below: "BRIGHT" }],
  [59, { above: "IN KEY $", below: "OVER" }],
  [58, { above: "PI", below: "INVERSE" }]
])

// "The rubber keyboard is moulded in one part, with the keys in relief. Each key projects through an individual rectangular opening" [B], https://api.vam.ac.uk/v2/object/O1300970. On Kaiser's photograph a key shows 14.0 by 9.4 from above, Warby's 13.7 by 10.2, its flat top 13.1 by 8.5 with corners rounded about 0.6 and its top edges 0.5 to 1.2, through a hole 15.6 by 11.4 with corners rounded 0.8 [E]; the sheet made to fit has its holes 15 by 11 [D].
// A key is drawn upright, the designer's 14 by 10 with its top edges rounded 0.6, which leaves its flat top 12.8 by 8.8 with corners of 0.6, and each hole 1.6 wider and deeper than its key.
// How far a key stands proud is read only on one oblique photograph, 2 to 3 [E], https://commons.wikimedia.org/wiki/File:Sinclair_ZX_Spectrum_48k_(7160143184).jpg, and 2.5 is taken. Below the template it runs down 4 into a well 5 deep under the field, neither of them a figure of the machine.
const KEY = { width: 14, depth: 10, corner: 1.2, round: 0.6, relief: 2.5, root: 4 },
  HOLE_MARGIN = 0.8,
  HOLE_CORNER = 0.8,
  WELL_DEPTH = 5

// Where each class of legend stands about its key's middle, x right and y forward, on Kaiser's photograph mapped through the keys' grid [E], ±0.4: on the template every word from a margin 6.0 left of the middle, the colour names' capitals 2.15 tall about 10.6 behind it, the caps-shifted words and the green keywords 2.1 about 7.2 behind it, and the red keywords from 5.4 left, 2.05 tall about 7.6 in front; BLACK sits in a white box 6.2 left to 4.6 right and 12.9 to 9.3 behind. Nothing is printed on the colour line over 8 and 9.
// On a key its character's capitals stand 3.6 tall from 5.5 left, about 1.4 behind the middle on a letter and level with it on a digit; its keyword 1.8 tall ending 5.0 right, about 2.8 in front; its red symbol-shift legend about 1.2 behind, a word 1.8 tall and a symbol 2.6; on a number key the graphic a box 2.8 by 2.2 about 2.6 right and 2.2 behind, its border thin, and the red symbol about 2.6 right and 2.4 in front, 0's a bar 3.9 by 0.28 about 2.26 right and 2.08 in front. The number keys' symbols are drawn as tall as the letter keys', 2.6, which no reading gives them.
// Every edge and width is the ink's, as the photograph measures it; the Bibliothèque nationale's unit's legends stand about 1 further left of its keys than Kaiser's.
const TEMPLATE_LEGEND = {
    margin: -6,
    colour: { middle: -10.6, capHeight: 2.15 },
    above: { middle: -7.2, capHeight: 2.1 },
    below: { margin: -5.4, middle: 7.6, capHeight: 2.05 },
    blackBox: { left: -6.2, right: 4.6, top: -12.9, bottom: -9.3 }
  },
  KEY_LEGEND = {
    character: { left: -5.5, capHeight: 3.6, letterMiddle: -1.4, digitMiddle: 0 },
    keyword: { right: 5, middle: 2.8, capHeight: 1.8 },
    symbol: { middle: -1.2, wordHeight: 1.8, symbolHeight: 2.6 },
    graphic: { middle: [2.6, -2.2], width: 2.8, height: 2.2, border: 0.25 },
    numberSymbol: { middle: [2.6, 2.4], capHeight: 2.6 },
    underscore: { middle: [2.26, 2.08], width: 3.9, height: 0.28 }
  }

// The special keys' words, read on the Bibliothèque nationale's photograph from above about each key's middle [E]: CAPS over SHIFT in white, capitals 2.55 and 2.5 tall, about 0.8 left and 1.7 behind and 2.0 in front; SYMBOL over SHIFT in red, 1.75 tall, about 0.85 right and 1.4 behind and 1.55 in front; ENTER in white 1.85 tall, about 0.2 in front; BREAK 1.85 tall over SPACE 3.1 tall in white, about 0.3 right and 1.7 behind and 1.8 in front.
const KEY_LINES = {
  capsShift: [
    { word: "CAPS", middle: [-0.8, -1.7], capHeight: 2.55, ink: "white" },
    { word: "SHIFT", middle: [-0.8, 2], capHeight: 2.5, ink: "white" }
  ],
  symbolShift: [
    { word: "SYMBOL", middle: [0.85, -1.4], capHeight: 1.75, ink: "red" },
    { word: "SHIFT", middle: [0.85, 1.55], capHeight: 1.75, ink: "red" }
  ],
  enter: [{ word: "ENTER", middle: [0, 0.2], capHeight: 1.85, ink: "white" }],
  breakSpace: [
    { word: "BREAK", middle: [0.3, -1.7], capHeight: 1.85, ink: "white" },
    { word: "SPACE", middle: [0.3, 1.8], capHeight: 3.1, ink: "white" }
  ]
}

// The caps-shifted arrows over 5 to 8 are hollow, drawn about a 0.3 stroke, on the photograph from above [E]: ⇦ and ⇨ 4.5 long, their heads 2.0 tall and 1.9 long on a shaft 1.1 tall; ⇩ and ⇧ 4.0 wide and 2.1 tall, their heads 4.0 wide and 1.4 tall on a shaft 2.4 wide.
const ARROWS = {
    level: { length: 4.5, head: 2, headLength: 1.9, shaft: 1.1 },
    upright: { length: 2.1, head: 4, headLength: 1.4, shaft: 2.4 },
    stroke: 0.3
  },
  ARROW_TURNS = { left: 0, up: 90, right: 180, down: 270 }

// The keys are set in a Helvetica Bold by their glyphs, at their own widths on the keys and on the template tracked about −0.05 em with a word space about a third of its own, so that TRUE VIDEO reads nearly TRUEVIDEO [E]. TeX Gyre Heros Bold stands in for it, its capitals 0.729 of its size and its p's tail 0.218 below the line: https://www.gust.org.pl/projects/e-foundry/tex-gyre/heros
// The zero's slash is read on no photograph closely enough to give figures; it is drawn across the counter from a fifth in from the zero's ink at its foot to a fifth in at its head, an eighth of the capital thick, a guess.
const HEROS = "TeX Gyre Heros",
  HEROS_BOLD = resolve(import.meta.dirname, "../fonts/texgyreheros-bold.otf"),
  HEROS_CAP_HEIGHT = 0.729,
  HEROS_DESCENDER = 0.218,
  TRACKING = -0.05,
  WORD_SPACE = -0.135,
  SLASH = { inset: 0.18, foot: 0.12, head: 0.88, stroke: 0.13 }

// The rainbow crosses the template's front right corner in four stripes, red, yellow, green and cyan toward the corner, each boundary running 0.432 pitch left for every row forward, 66.6° to the rows, and crossing key 1's row 10.632, 10.807, 10.936, 11.097 and 11.307 pitches right of key 1 [E], on Kaiser's photograph; Warby's reads it at 66.3 to 66.6°. Whether the stripes are truly equal is not settled.
const RAINBOW = { lean: 0.432, boundaries: [10.632, 10.807, 10.936, 11.097, 11.307] }

// Colours on the Bibliothèque nationale's studio photographs with the backdrop's cast taken out [E]: the case's grained plastic #303030, the smooth relief of its logotype #252526 against #2e2d2f beside it and its gaps #171617, "ZX Spectrum" #ced0d0, the template #121314, the feet #242426, the inside of the TV recess #191919, taken for the room behind the rear, the board's edge #6d684d and the TV socket's ring #aca592. No frame holds a card: each is good for the hue and no more, and a guess.
// The keys, neutral-checked on Warby's photograph #4a5f67, on the studio's #4b5966 and on the bare mat's #46524f [E], their mean #49595f taken, https://commons.wikimedia.org/wiki/File:ZX_Spectrum_showing_rubber_key_mat.jpg; Sinclair calls them "grey", the first issue's "very pale brown" [A], service manual.
// The template's inks on Kaiser's photograph [E]: white #fbfffd, red #cf433e to #d65653, green #54c926 to #63d13e, and the colour names each in its own; the rainbow red #fb372a, yellow #e9af1e, green #45d315 and cyan #009cd8, which Warby's photograph reads paler, red #c35251, yellow #cab025 and cyan #00a5cf. The rear labels' brightest strokes read #95362e on a face the light grazes, and the template's red is taken for them.
// The template's satin sheen, the metal's shine, the screws' black and how the fingers and the sockets' bodies read are not measured: roughness 0.5 and 0.3, #1a1a1a, the fingers the ring's metal and the bodies the room's dark, are guesses.
const CASE = { name: "case", colour: "#303030" },
  KEY_RUBBER = { name: "key", colour: "#49595f" },
  RUBBER_FOOT = { name: "rubber-foot", colour: "#242426" },
  ROOM_DARK = { name: "inside", colour: "#191919" },
  SCREW_HEAD = { name: "screw", colour: "#1a1a1a" },
  METAL = { name: "metal", colour: "#aca592", roughness: 0.3 },
  TEMPLATE_BLACK = "#121314",
  RELIEF_FACE = "#252526",
  RELIEF_GAP = "#171617",
  NAME_WHITE = "#ced0d0",
  BOARD_EDGE = "#6d684d",
  INKS = { white: "#fbfffd", red: "#d65653", green: "#54c926" },
  COLOUR_NAMES = {
    BLUE: "#0075b2",
    RED: "#d65653",
    MAGENTA: "#bf4a9f",
    GREEN: "#58db2a",
    CYAN: "#0aa2e0",
    YELLOW: "#f6bb3e",
    WHITE: "#f4fcfb"
  },
  RAINBOW_INKS = ["#fb372a", "#e9af1e", "#45d315", "#009cd8"]

// A printed part carries a material of its own, because the page inks its print over the material it finds.
const TEMPLATE_METAL = { name: "keyboard-template", colour: TEMPLATE_BLACK, roughness: 0.5 },
  SINCLAIR_PLATE = { name: "sinclair", colour: CASE.colour },
  NAME_PLATE = { name: "zx-spectrum", colour: CASE.colour },
  LABEL_PLATE = { name: "rear-labels", colour: CASE.colour },
  BOARD_PLATE = { name: "board", colour: BOARD_EDGE }

// How finely a print is rendered: the legends' atlas, a tile a key across the whole field, stands 3520 wide at 16 pixels to the millimetre, inside the 4096 a mobile GPU may hold; the template 12, the case's own words 16, and the board 8.
const LEGEND_PIXELS = 16,
  TEMPLATE_PIXELS = 12,
  WORD_PIXELS = 16,
  BOARD_PIXELS = 8

const LANGUAGE = "en",
  LEGENDS_PRINT = "legends",
  TEMPLATE_PRINT = "keyboard-template",
  SINCLAIR_PRINT = "sinclair",
  NAME_PRINT = "zx-spectrum",
  LABELS_PRINT = "rear-labels",
  BOARD_PRINT = "board"

// A cut runs this far past the faces it opens, so the kernel is never left two coplanar faces to join.
const OVERRUN = 1

// Where one part lies in another's recess or opening, a hairline holds the two apart, so that no face of either stands in the plane of a face of the other.
const HAIRLINE = 0.1

// A printed plate set into the case, the margin a print runs past what it carries, and the dark lining of the room behind the rear: choices of drawing, not figures of the machine.
const PLATE_THICKNESS = 0.3,
  PRINT_MARGIN = 0.3,
  LINING = 0.5

// How far the triangles may stray from a curved face, in millimetres, and turn from one another along it, in radians: a choice of how finely to draw, not a figure of the machine.
const TESSELLATION = { tolerance: 0.2, angularTolerance: 0.8 }

const RADIANS = Math.PI / 180,
  LEAN = END_LEAN * RADIANS,
  RISE = DECK_RISE * RADIANS,
  FOOT_Y = DEPTH - STEP_FOOT,
  RAISED_Y = DEPTH - RAISED_TOP_FRONT,
  TEMPLATE_FRONT = FOOT_Y - TEMPLATE_DEPTH,
  LEGEND_ATLAS_WIDTH = KEY_FIELD.keys * KEY_PITCH,
  LEGEND_ATLAS_DEPTH = KEY_FIELD.rows * KEY_PITCH,
  CENTRING = [-WIDTH / 2, -DEPTH / 2, FOOT_HEIGHT]

function fromRear(distance) {
  return DEPTH - distance
}

function deckHeightAt(y) {
  return DECK_FRONT + y * Math.tan(RISE)
}

// How far in from its end an end wall stands at a height, drawn in by the given depth.
function insetAt(z, depth = 0) {
  return (z - PARTING) * Math.tan(LEAN) + depth / Math.cos(LEAN)
}

// Where a part seen on the rear photograph at a height on the face stands, the given depth behind it.
function heightBehind(seen, depth) {
  return seen - depth * Math.tan(CAMERA_ELEVATION * RADIANS)
}

const BOARD_BOTTOM = heightBehind(BOARD.seenBottom, BOARD.fromRear),
  BOARD_TOP = heightBehind(BOARD.seenTop, BOARD.fromRear),
  TV_HEIGHT = heightBehind(TV_SOCKET.seen, TV_RECESS.depth)

// The board as far as the room behind the rear shows it, inside the room's lining.
const BOARD_PLAN = {
  left: ROOM.left + LINING + 2 * HAIRLINE,
  right: ROOM.right - LINING - 2 * HAIRLINE,
  front: fromRear(ROOM.toRear - LINING - 2 * HAIRLINE),
  rear: fromRear(BOARD.fromRear)
}

function near(value, target) {
  return Math.abs(value - target) < 0.01
}

function centred(place) {
  return [place[0] + CENTRING[0], place[1] + CENTRING[1], place[2] + CENTRING[2]]
}

function centredFace({ left, right, front, rear }) {
  return {
    left: left + CENTRING[0],
    right: right + CENTRING[0],
    front: front + CENTRING[1],
    rear: rear + CENTRING[1]
  }
}

function sketchAcross(profile, left = -OVERRUN, width = WIDTH + 2 * OVERRUN) {
  return profile.sketchOnPlane("YZ", left).extrude(width)
}

// A point given on the deck — across, along it from the front edge and out of it — in the case's own terms.
function onDeckAt(x, along, above) {
  const cosine = Math.cos(RISE),
    sine = Math.sin(RISE)

  return [x, along * cosine - above * sine, DECK_FRONT + along * sine + above * cosine]
}

// A shape built on the deck's plane, carried onto the deck.
function onDeck(shape) {
  return shape.rotate(DECK_RISE, [0, 0, 0], [1, 0, 0]).translate([0, 0, DECK_FRONT])
}

function alongDeck(y) {
  return y / Math.cos(RISE)
}

function sideProfile() {
  return draw([0, PARTING])
    .lineTo([0, DECK_FRONT])
    .lineTo([FOOT_Y, deckHeightAt(FOOT_Y)])
    .lineTo([RAISED_Y, REAR_HEIGHT])
    .lineTo([DEPTH, REAR_HEIGHT])
    .lineTo([DEPTH, PARTING])
    .close()
}

// Each end is cut away beyond a plane through the parting line's end, leaning in at the ends' lean, drawn in by the given depth.
function buildEndCut(atLeft, depth = 0) {
  const reach = 1000,
    offset = depth / Math.cos(LEAN),
    left = atLeft ? -reach : WIDTH,
    halfSpace = makeBox([left, -reach, -reach], [left + reach, reach, reach]),
    pivot = [atLeft ? offset : WIDTH - offset, 0, PARTING],
    turn = atLeft ? END_LEAN : -END_LEAN,
    moved = halfSpace.translate([atLeft ? offset : -offset, 0, 0])

  return moved.rotate(turn, pivot, [0, 1, 0])
}

// The upper case's edges by where they stand: an end's with the tops, its corners in plan, the nose and the rear top edge.
function caseEdgeRadius(edge) {
  const middle = edge.pointAt(0.5),
    inset = insetAt(middle.z),
    onEnd = near(middle.x, inset) || near(middle.x, WIDTH - inset),
    atFront = near(middle.y, 0),
    atRear = near(middle.y, DEPTH),
    atParting = near(middle.z, PARTING),
    atCorner = atFront || atRear,
    atNose = atFront && near(middle.z, DECK_FRONT),
    atRearTop = atRear && near(middle.z, REAR_HEIGHT)

  if (atParting) {
    return null
  }

  if (onEnd) {
    return atCorner ? PLAN_RADIUS : TOP_EDGE_RADIUS
  }

  if (atNose) {
    return NOSE_RADIUS
  }

  if (atRearTop) {
    return REAR_TOP_RADIUS
  }

  return null
}

function buildCaseBody() {
  const profile = sideProfile(),
    side = sketchAcross(profile),
    leftCut = buildEndCut(true),
    rightCut = buildEndCut(false),
    ends = side.cut(leftCut).cut(rightCut)

  return ends.fillet(caseEdgeRadius)
}

// The deck alone, carried back to the rear and drawn in by the given depth, its ends rounding over as the case's own do: the template is the skin between it and the same a template's thickness in.
function buildDeck(depth, reach) {
  const front = -reach,
    rear = DEPTH + reach,
    profile = draw([front, PARTING - reach])
      .lineTo([front, deckHeightAt(front) - depth])
      .lineTo([rear, deckHeightAt(rear) - depth])
      .lineTo([rear, PARTING - reach])
      .close(),
    side = sketchAcross(profile, -reach, WIDTH + 2 * reach),
    leftCut = buildEndCut(true, depth),
    rightCut = buildEndCut(false, depth),
    ends = side.cut(leftCut).cut(rightCut)

  return ends.fillet(function (edge) {
    const middle = edge.pointAt(0.5),
      start = edge.startPoint,
      end = edge.endPoint,
      onTop = near(middle.z, deckHeightAt(middle.y) - depth),
      lengthwise = Math.abs(end.y - start.y) > 1,
      rounded = onTop && lengthwise

    return rounded ? TOP_EDGE_RADIUS - depth : null
  })
}

// Where the template lies: behind its front edge, in front of the step and above its flanges' edge, which follows the deck 7 below it and rises at the step; grown or shrunk by the given margins.
function buildTemplateExtent({ front, back, below }) {
  const footZ = deckHeightAt(FOOT_Y),
    climb = (REAR_HEIGHT - footZ) / (RAISED_Y - FOOT_Y),
    slope = Math.tan(RISE),
    cornerY = FOOT_Y - (below + climb * back) / (climb - slope),
    top = REAR_HEIGHT + OVERRUN,
    topY = FOOT_Y - back + (top - footZ) / climb,
    outline = draw([front, deckHeightAt(front) - below])
      .lineTo([cornerY, deckHeightAt(cornerY) - below])
      .lineTo([topY, top])
      .lineTo([front, top])
      .close()

  return sketchAcross(outline)
}

function keyWidth(key) {
  return key.width ?? KEY.width
}

function keyMiddle({ u, row }) {
  return {
    x: KEY_ONE.middle + u * KEY_PITCH,
    y: fromRear(KEY_ONE.fromRear + row * KEY_PITCH)
  }
}

function buildHoles() {
  const holes = KEYS.map(function (key) {
    const { x, y } = keyMiddle(key),
      width = keyWidth(key) + 2 * HOLE_MARGIN,
      length = KEY.depth + 2 * HOLE_MARGIN,
      depth = TEMPLATE_THICKNESS + OVERRUN,
      outline = drawRoundedRectangle(width, length, HOLE_CORNER),
      prism = outline
        .translate(x, alongDeck(y))
        .sketchOnPlane("XY", -depth)
        .extrude(depth + OVERRUN)

    return onDeck(prism)
  })

  return makeCompound(holes)
}

// The well under the holes the keys sink into, reaching up into the template's own recess.
function buildWell() {
  const edges = KEYS.map(function (key) {
      const { x, y } = keyMiddle(key),
        across = keyWidth(key) / 2 + HOLE_MARGIN + HAIRLINE,
        along = KEY.depth / 2 + HOLE_MARGIN + HAIRLINE

      return { left: x - across, right: x + across, front: y - along, rear: y + along }
    }),
    left = Math.min(...edges.map(edge => edge.left)),
    right = Math.max(...edges.map(edge => edge.right)),
    front = Math.min(...edges.map(edge => edge.front)),
    rear = Math.max(...edges.map(edge => edge.rear)),
    well = makeBox([left, alongDeck(front), -WELL_DEPTH], [right, alongDeck(rear), OVERRUN])

  return onDeck(well)
}

function buildTemplate() {
  const outer = buildDeck(0, OVERRUN),
    inner = buildDeck(TEMPLATE_THICKNESS, 2 * OVERRUN),
    extent = buildTemplateExtent({
      front: TEMPLATE_FRONT,
      back: 2 * HAIRLINE,
      below: FLANGE_DEPTH
    }),
    skin = outer.cut(inner).intersect(extent),
    holes = buildHoles()

  return skin.cut(holes)
}

function buildTemplateRecess() {
  const inner = buildDeck(TEMPLATE_THICKNESS + HAIRLINE, 2 * OVERRUN),
    extent = buildTemplateExtent({
      front: TEMPLATE_FRONT - HAIRLINE,
      back: HAIRLINE,
      below: FLANGE_DEPTH + HAIRLINE
    })

  return extent.cut(inner)
}

// How far across the template's own sheet a point of it lies, the sheet unrolled from its bends: on the deck it is x itself, and over the round and down the flange it runs on from where the deck ends.
function unrolledFromEnd(fromEnd, y, z) {
  const centreZ = deckHeightAt(y) - TOP_EDGE_RADIUS,
    centreX = insetAt(centreZ) + TOP_EDGE_RADIUS / Math.cos(LEAN),
    bend = Math.PI / 2 - LEAN,
    onDeckTop = fromEnd >= centreX,
    turned = Math.atan2(centreX - fromEnd, z - centreZ),
    onRound = turned <= bend

  if (onDeckTop) {
    return fromEnd
  }

  if (onRound) {
    return centreX - TOP_EDGE_RADIUS * turned
  }

  const wallTopX = centreX - TOP_EDGE_RADIUS * Math.cos(LEAN),
    wallTopZ = centreZ + TOP_EDGE_RADIUS * Math.sin(LEAN),
    down = (wallTopX - fromEnd) * Math.sin(LEAN) + (wallTopZ - z) * Math.cos(LEAN)

  return centreX - TOP_EDGE_RADIUS * bend - down
}

function unrolledAcross(x, y, z) {
  const atRight = x > WIDTH / 2,
    fromEnd = atRight ? WIDTH - x : x,
    across = unrolledFromEnd(fromEnd, y, z)

  return atRight ? WIDTH - across : across
}

const FLANGE_FOOT = deckHeightAt(TEMPLATE_FRONT) - FLANGE_DEPTH,
  FLANGE_FOOT_INSET = insetAt(FLANGE_FOOT),
  SHEET_LEFT = unrolledFromEnd(FLANGE_FOOT_INSET, TEMPLATE_FRONT, FLANGE_FOOT) - PRINT_MARGIN,
  SHEET_WIDTH = WIDTH - 2 * SHEET_LEFT

// The template's print is its sheet unrolled, the rear edge at its top.
function templateMapping([x, y, z]) {
  const caseX = x - CENTRING[0],
    caseY = y - CENTRING[1],
    caseZ = z - CENTRING[2],
    across = unrolledAcross(caseX, caseY, caseZ)

  return [(across - SHEET_LEFT) / SHEET_WIDTH, (FOOT_Y - caseY) / TEMPLATE_DEPTH]
}

function endProfile() {
  const [throughInset, throughZ] = END_ARC_THROUGH

  return draw([0, PARTING])
    .threePointsArcTo([END_SET_IN, BASE_STEP], [throughInset, throughZ])
    .lineTo([END_SET_IN, 0])
    .customCorner(BOTTOM_RADIUS)
    .lineTo([WIDTH - END_SET_IN, 0])
    .customCorner(BOTTOM_RADIUS)
    .lineTo([WIDTH - END_SET_IN, BASE_STEP])
    .threePointsArcTo([WIDTH, PARTING], [WIDTH - throughInset, throughZ])
    .close()
}

function frontProfile() {
  const [throughInset, throughZ] = END_ARC_THROUGH,
    stretch = FRONT_SET_BACK / END_SET_IN

  return draw([0, PARTING])
    .threePointsArcTo([FRONT_SET_BACK, BASE_STEP], [throughInset * stretch, throughZ])
    .lineTo([FRONT_SET_BACK, 0])
    .customCorner(BOTTOM_RADIUS)
    .lineTo([DEPTH + OVERRUN, 0])
    .lineTo([DEPTH + OVERRUN, PARTING + OVERRUN])
    .lineTo([0, PARTING + OVERRUN])
    .close()
}

function buildLowerCaseBody() {
  const ends = endProfile(),
    front = frontProfile(),
    across = ends.sketchOnPlane("XZ", OVERRUN).extrude(-DEPTH - 2 * OVERRUN),
    along = sketchAcross(front),
    plan = drawRoundedRectangle(WIDTH, DEPTH, PLAN_RADIUS)
      .translate(WIDTH / 2, DEPTH / 2)
      .sketchOnPlane("XY", -OVERRUN)
      .extrude(PARTING + 2 * OVERRUN)

  return across.intersect(along).intersect(plan)
}

// A rounded oblong opening on the rear face, from the given distance in to the given depth.
function rearOblong({ left, right, bottom, top, radius }, from, to) {
  const outline = drawRoundedRectangle(right - left, top - bottom, radius).translate(
    (left + right) / 2,
    (bottom + top) / 2
  )

  return outline.sketchOnPlane("XZ", -fromRear(from)).extrude(to - from)
}

// A cylinder running forward from one depth behind the rear face to another, about a point across and up.
function cylinderFromRear(radius, middle, height, from, to) {
  return makeCylinder(radius, to - from, [middle, fromRear(from), height], [0, -1, 0])
}

// The jacks' and the power socket's openings run through the wall into the room; the TV recess stops in the wall, the ring's hole running on.
function buildRearOpenings() {
  const jacks = OPENINGS.map(opening => rearOblong(opening, -OVERRUN, ROOM.toRear)),
    tvRecess = rearOblong(TV_RECESS, -OVERRUN, TV_RECESS.depth),
    tvHole = cylinderFromRear(
      TV_SOCKET.ring / 2 + HAIRLINE,
      TV_SOCKET.middle,
      TV_HEIGHT,
      0,
      ROOM.toRear
    ),
    tv = tvRecess.fuse(tvHole)

  return makeCompound([...jacks, tv])
}

function buildRoom(margin = 0) {
  return makeBox(
    [ROOM.left + margin, fromRear(ROOM.toRear - margin), ROOM.floor + margin],
    [ROOM.right - margin, fromRear(REAR_WALL + margin), ROOM.top - margin]
  )
}

function buildSlot() {
  const notch = makeBox(
      [SLOT.left, fromRear(ROOM.toRear), SLOT.sill],
      [SLOT.right, DEPTH + OVERRUN, SLOT.top]
    ),
    underneath = makeBox(
      [SLOT.left, fromRear(SLOT.inside), -OVERRUN],
      [SLOT.right, DEPTH + OVERRUN, SLOT.top]
    )

  return notch.fuse(underneath)
}

function buildUndersideCuts() {
  const recesses = SCREWS.map(screw =>
      makeCylinder(SCREW.recess / 2, SCREW.depth + OVERRUN, [
        screw.middle,
        fromRear(screw.fromRear),
        -OVERRUN
      ])
    ),
    holes = SPEAKER.turns.map(function (turn) {
      const x = SPEAKER.middle + SPEAKER.radius * Math.cos(turn * RADIANS),
        y = fromRear(SPEAKER.fromRear) + SPEAKER.radius * Math.sin(turn * RADIANS)

      return makeCylinder(SPEAKER.hole / 2, UNDERSIDE_DEPTH + OVERRUN, [x, y, -OVERRUN])
    }),
    vents = []

  for (let index = 0; index < VENTS.count; index++) {
    const middle = fromRear(VENTS.first + index * VENTS.pitch),
      vent = makeBox(
        [VENTS.left, middle - VENTS.width / 2, -OVERRUN],
        [VENTS.right, middle + VENTS.width / 2, UNDERSIDE_DEPTH]
      )

    vents.push(vent)
  }

  return makeCompound([...recesses, ...holes, ...vents])
}

// A plate set flush into the raised top, its print laid on it from above, and the room cut for it.
function raisedTopPlate({ left, right, fromRear: rearDistance, toRear }) {
  const front = fromRear(toRear),
    rear = fromRear(rearDistance),
    top = REAR_HEIGHT - HAIRLINE,
    plate = makeBox([left, front, top - PLATE_THICKNESS], [right, rear, top]),
    room = makeBox(
      [left - HAIRLINE, front - HAIRLINE, top - PLATE_THICKNESS - HAIRLINE],
      [right + HAIRLINE, rear + HAIRLINE, REAR_HEIGHT + OVERRUN]
    )

  return { plate, room, face: centredFace({ left, right, front, rear }) }
}

const SINCLAIR_OUTLINE = {
    left: SINCLAIR.left - PRINT_MARGIN,
    right: SINCLAIR.left + SINCLAIR_BLOCKS.at(-1).right + PRINT_MARGIN,
    fromRear: SINCLAIR.fromRear - SINCLAIR.rise - PRINT_MARGIN,
    toRear: SINCLAIR.fromRear + SINCLAIR.height + PRINT_MARGIN
  },
  NAME_OUTLINE = {
    left: MODEL_NAME.left - PRINT_MARGIN,
    right: MODEL_NAME.left + MODEL_NAME.width + PRINT_MARGIN,
    fromRear: MODEL_NAME.fromRear - PRINT_MARGIN,
    toRear:
      MODEL_NAME.fromRear +
      MODEL_NAME.capHeight * (1 + HEROS_DESCENDER / HEROS_CAP_HEIGHT) +
      PRINT_MARGIN
  }

// The labels' plates are set flush into the rear face, each from its capitals' foot, and their print runs across the face as it is read from behind.
const LABELS_LEFT = REAR_LABELS[0].middle - REAR_LABELS[0].width / 2 - PRINT_MARGIN,
  LABELS_RIGHT = REAR_LABELS.at(-1).middle + REAR_LABELS.at(-1).width / 2 + PRINT_MARGIN,
  LABELS_BOTTOM = Math.min(...REAR_LABELS.map(label => label.bottom)),
  LABELS_TOP = Math.max(...REAR_LABELS.map(label => label.top)) + PRINT_MARGIN

function buildLabelPlates() {
  const plates = [],
    rooms = []

  for (const { middle, width, bottom, top } of REAR_LABELS) {
    const left = middle - width / 2 - PRINT_MARGIN,
      right = middle + width / 2 + PRINT_MARGIN,
      face = DEPTH - HAIRLINE,
      plate = makeBox([left, face - PLATE_THICKNESS, bottom], [right, face, top + PRINT_MARGIN]),
      room = makeBox(
        [left - HAIRLINE, face - PLATE_THICKNESS - HAIRLINE, bottom - HAIRLINE],
        [right + HAIRLINE, DEPTH + OVERRUN, top + PRINT_MARGIN + HAIRLINE]
      )

    plates.push(plate)
    rooms.push(room)
  }

  return { plates: makeCompound(plates), rooms: makeCompound(rooms) }
}

function labelMapping([x, , z]) {
  const caseX = x - CENTRING[0],
    caseZ = z - CENTRING[2]

  return [
    (LABELS_RIGHT - caseX) / (LABELS_RIGHT - LABELS_LEFT),
    (LABELS_TOP - caseZ) / (LABELS_TOP - LABELS_BOTTOM)
  ]
}

function buildUpperCase(cuts) {
  const body = buildCaseBody(),
    recess = buildTemplateRecess(),
    well = buildWell()

  const recessed = body.cut(recess).cut(well)

  return cuts.reduce((shape, cut) => shape.cut(cut), recessed)
}

function buildFeet() {
  const feet = FEET.map(foot =>
      makeBox(
        [foot.left, fromRear(foot.toRear), -FOOT_HEIGHT],
        [foot.right, fromRear(foot.fromRear), 0]
      )
    ),
    standing = makeCompound(feet)

  return { name: "rubber-feet", shape: standing.translate(CENTRING), material: RUBBER_FOOT }
}

function buildScrews() {
  const heads = SCREWS.map(screw =>
      makeCylinder(SCREW.head / 2, HAIRLINE, [
        screw.middle,
        fromRear(screw.fromRear),
        SCREW.depth - 2 * HAIRLINE
      ])
    ),
    all = makeCompound(heads)

  return { name: "screws", shape: all.translate(CENTRING), material: SCREW_HEAD }
}

// The room behind the rear is lined dark, the openings cut through its lining as through the wall.
function buildInside(openings, slot) {
  const room = buildRoom(HAIRLINE),
    hollow = buildRoom(HAIRLINE + LINING),
    lining = room.cut(hollow).cut(openings).cut(slot)

  return { name: "inside", shape: lining.translate(CENTRING), material: ROOM_DARK }
}

function buildBoard() {
  const { left, right, front, rear } = BOARD_PLAN,
    slab = makeBox([left, front, BOARD_BOTTOM], [right, rear, BOARD_TOP]),
    slotMiddle = BOARD.left + FINGERS.first + FINGERS.polarising * FINGERS.pitch,
    notch = makeBox(
      [
        slotMiddle - POLARISING_SLOT.width / 2,
        rear - POLARISING_SLOT.depth,
        BOARD_BOTTOM - OVERRUN
      ],
      [slotMiddle + POLARISING_SLOT.width / 2, rear + OVERRUN, BOARD_TOP + OVERRUN]
    ),
    board = slab.cut(notch)

  return {
    name: "board",
    shape: board.translate(CENTRING),
    material: BOARD_PLATE,
    face: centredFace(BOARD_PLAN),
    print: BOARD_PRINT
  }
}

// The sockets' black bodies stand on the board behind their mouths, and the modulator behind the TV socket.
function buildSockets() {
  const mouth = BOARD.fromRear,
    back = ROOM.toRear - LINING - 2 * HAIRLINE,
    jacks = JACKS.map(function ({ middle, seen }) {
      const height = heightBehind(seen, mouth),
        body = makeBox(
          [middle - JACK.width / 2, fromRear(back), BOARD_TOP + HAIRLINE],
          [middle + JACK.width / 2, fromRear(mouth), 2 * height - BOARD_TOP]
        ),
        bossFront = mouth - JACK.bossDepth,
        boss = cylinderFromRear(JACK.boss / 2, middle, height, bossFront, mouth + HAIRLINE),
        bore = cylinderFromRear(
          JACK.bore / 2,
          middle,
          height,
          bossFront - OVERRUN,
          mouth + SOCKET_BORE_DEPTH
        )

      return body.fuse(boss).cut(bore)
    }),
    { middle, seen, width, bore } = POWER_SOCKET,
    height = heightBehind(seen, mouth),
    powerBody = makeBox(
      [middle - width / 2, fromRear(back), BOARD_TOP + HAIRLINE],
      [middle + width / 2, fromRear(mouth), 2 * height - BOARD_TOP]
    ),
    powerBore = cylinderFromRear(
      bore / 2,
      middle,
      height,
      mouth - OVERRUN,
      mouth + SOCKET_BORE_DEPTH
    ),
    power = powerBody.cut(powerBore),
    modulator = makeBox(
      [TV_RECESS.left, fromRear(back), BOARD_TOP + HAIRLINE],
      [TV_RECESS.right, fromRear(MODULATOR_FACE), TV_RECESS.top]
    ),
    all = makeCompound([...jacks, power, modulator])

  return { name: "sockets", shape: all.translate(CENTRING), material: ROOM_DARK }
}

// The metal that shows at the rear: the TV socket's ring, from its recess's floor into the modulator, and the power socket's pin.
function buildRearMetal() {
  const floor = TV_RECESS.depth,
    ring = cylinderFromRear(
      TV_SOCKET.ring / 2,
      TV_SOCKET.middle,
      TV_HEIGHT,
      floor,
      MODULATOR_FACE + OVERRUN
    ),
    bore = cylinderFromRear(TV_SOCKET.bore / 2, TV_SOCKET.middle, TV_HEIGHT, 0, ROOM.toRear),
    { middle, seen, pin, pinInside } = POWER_SOCKET,
    height = heightBehind(seen, BOARD.fromRear),
    pinShape = cylinderFromRear(
      pin / 2,
      middle,
      height,
      BOARD.fromRear + pinInside,
      BOARD.fromRear + SOCKET_BORE_DEPTH + HAIRLINE
    ),
    metal = makeCompound([ring.cut(bore), pinShape])

  return { name: "rear-metal", shape: metal.translate(CENTRING), material: METAL }
}

function buildKeyShape(width) {
  const outline = drawRoundedRectangle(width, KEY.depth, KEY.corner),
    body = outline.sketchOnPlane("XY", -KEY.root).extrude(KEY.root + KEY.relief)

  return body.fillet(KEY.round, edge => edge.inPlane("XY", KEY.relief))
}

// Each key stands at its middle on the template's face, turned with the deck, and carries its tile of the legends' atlas.
function layKey(key) {
  const width = keyWidth(key),
    { x, y } = keyMiddle(key),
    place = onDeckAt(x, alongDeck(y), 0),
    atlasX = (key.u - KEY_FIELD.left) * KEY_PITCH,
    atlasY = (key.row - KEY_FIELD.top) * KEY_PITCH,
    legend = [
      (atlasX - width / 2) / LEGEND_ATLAS_WIDTH,
      (atlasY - KEY.depth / 2) / LEGEND_ATLAS_DEPTH,
      width / LEGEND_ATLAS_WIDTH,
      KEY.depth / LEGEND_ATLAS_DEPTH
    ]

  return { ...key, width, place: centred(place), legend, printedAt: [atlasX, atlasY] }
}

const KEY_SHAPES = [
  { name: "keys", width: KEY.width },
  { name: "caps-shift-key", width: CAPS_SHIFT_WIDTH },
  { name: "break-space-key", width: BREAK_SPACE_WIDTH }
]

function buildKeys(laid) {
  return KEY_SHAPES.map(function ({ name, width }) {
    const keys = laid.filter(key => key.width == width),
      shape = buildKeyShape(width),
      face = { left: -width / 2, right: width / 2, front: -KEY.depth / 2, rear: KEY.depth / 2 }

    return {
      name,
      shape,
      material: KEY_RUBBER,
      face,
      tilt: DECK_RISE,
      legends: LEGENDS_PRINT,
      keys: keys.map(key => ({ number: key.number, place: key.place, legend: key.legend }))
    }
  })
}

function fontSize(capHeight) {
  return capHeight / HEROS_CAP_HEIGHT
}

function escapeXml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

function svgOpen(width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${HEROS}" font-weight="700">`
}

function drawGround(width, height, colour) {
  return `<rect width="${width}" height="${height}" fill="${colour}"/>`
}

function textStyle(capHeight, { tracked = false, letterSpacing = 0 } = {}) {
  const size = fontSize(capHeight)

  return {
    size,
    letters: tracked ? TRACKING * size : letterSpacing,
    words: tracked ? WORD_SPACE * size : 0
  }
}

function textElement(text, { size, letters, words }, placing) {
  const escaped = escapeXml(text)

  return `<text font-family="${HEROS}" font-weight="700" font-size="${size}" letter-spacing="${letters}" word-spacing="${words}"${placing}>${escaped}</text>`
}

// Where a text set in Heros Bold inks, across from its origin: the legends are measured to their ink, which stands in from the glyphs' advances by their side bearings.
function inkOf(text, style) {
  const element = textElement(text, style, ""),
    svg = `<svg xmlns="http://www.w3.org/2000/svg">${element}</svg>`,
    setting = new Resvg(svg, { font: { loadSystemFonts: false, fontFiles: [HEROS_BOLD] } }),
    box = setting.getBBox()

  return { left: box.x, right: box.x + box.width }
}

// A text set from its capitals' height, the left or right edge or the middle of its ink at x, and squeezed or stretched to a given width.
function drawText(
  text,
  { x, middle, capHeight, ink, anchor = "start", tracked = false, letterSpacing = 0, width = null }
) {
  const style = textStyle(capHeight, { tracked, letterSpacing }),
    { left, right } = inkOf(text, style),
    scale = width ? width / (right - left) : 1,
    anchors = { start: left, middle: (left + right) / 2, end: right },
    origin = x - scale * anchors[anchor],
    baseline = middle + capHeight / 2

  return textElement(
    text,
    style,
    ` transform="translate(${origin} ${baseline}) scale(${scale} 1)" fill="${ink}"`
  )
}

function drawRectangle(
  { left, right, top, bottom },
  { fill, stroke = null, thickness = 0, radius = 0 }
) {
  const outline = stroke ? ` stroke="${stroke}" stroke-width="${thickness}"` : ""

  return `<rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" rx="${radius}" fill="${fill}"${outline}/>`
}

function rectanglePath({ left, right, top, bottom }) {
  return `M ${left} ${top} H ${right} V ${bottom} H ${left} Z`
}

function isUpright(way) {
  return way == "up" || way == "down"
}

// A hollow arrow about its middle, pointing left and turned to its way; the upright ones are squatter than the level ones turned.
function drawArrow(way, [x, y]) {
  const upright = isUpright(way),
    { length, head, headLength, shaft } = upright ? ARROWS.upright : ARROWS.level,
    tip = -length / 2,
    tail = length / 2,
    neck = tip + headLength,
    points = [
      [tip, 0],
      [neck, -head / 2],
      [neck, -shaft / 2],
      [tail, -shaft / 2],
      [tail, shaft / 2],
      [neck, shaft / 2],
      [neck, head / 2]
    ],
    listed = points.map(([pointX, pointY]) => `${pointX},${pointY}`)

  return `<polygon transform="translate(${x} ${y}) rotate(${ARROW_TURNS[way]})" points="${listed.join(" ")}" fill="none" stroke="${INKS.white}" stroke-width="${ARROWS.stroke}"/>`
}

// Where a point of the keys' grid falls on the template's print.
function templateAt(u, row) {
  const { x, y } = keyMiddle({ u, row })

  return [x - SHEET_LEFT, FOOT_Y - y]
}

function drawBlackBox(x, y) {
  const { blackBox, colour } = TEMPLATE_LEGEND,
    box = {
      left: x + blackBox.left,
      right: x + blackBox.right,
      top: y + blackBox.top,
      bottom: y + blackBox.bottom
    },
    word = drawText("BLACK", {
      x: (box.left + box.right) / 2,
      middle: (box.top + box.bottom) / 2,
      capHeight: colour.capHeight,
      ink: TEMPLATE_BLACK,
      anchor: "middle",
      tracked: true
    }),
    ground = drawRectangle(box, { fill: COLOUR_NAMES.WHITE })

  return ground + word
}

function drawTemplateLegends(key) {
  const words = TEMPLATE_WORDS.get(key.number),
    [x, y] = templateAt(key.u, key.row),
    { margin, colour, above, below } = TEMPLATE_LEGEND,
    left = x + margin,
    blackened = words.colour == "BLACK",
    inkAbove = key.row == 0 ? INKS.white : INKS.green,
    drawn = []

  if (blackened) {
    const box = drawBlackBox(x, y)

    drawn.push(box)
  } else if (words.colour) {
    const name = drawText(words.colour, {
      x: left,
      middle: y + colour.middle,
      capHeight: colour.capHeight,
      ink: COLOUR_NAMES[words.colour],
      tracked: true
    })

    drawn.push(name)
  }

  if (words.arrow) {
    const upright = isUpright(words.arrow),
      { length, head } = upright ? ARROWS.upright : ARROWS.level,
      reach = upright ? head : length,
      arrow = drawArrow(words.arrow, [left + reach / 2, y + above.middle])

    drawn.push(arrow)
  }

  if (words.above) {
    const word = drawText(words.above, {
      x: left,
      middle: y + above.middle,
      capHeight: above.capHeight,
      ink: inkAbove,
      tracked: true
    })

    drawn.push(word)
  }

  if (words.below) {
    const word = drawText(words.below, {
      x: x + below.margin,
      middle: y + below.middle,
      capHeight: below.capHeight,
      ink: INKS.red,
      tracked: true
    })

    drawn.push(word)
  }

  return drawn.join("\n")
}

function drawRainbow() {
  const [x, y] = templateAt(0, 0),
    top = -OVERRUN,
    bottom = TEMPLATE_DEPTH + OVERRUN,
    across = (pitches, down) => x + pitches * KEY_PITCH - RAINBOW.lean * (down - y),
    stripes = []

  for (const [index, ink] of RAINBOW_INKS.entries()) {
    const from = RAINBOW.boundaries[index],
      to = RAINBOW.boundaries[index + 1],
      corners = [
        [across(from, top), top],
        [across(to, top), top],
        [across(to, bottom), bottom],
        [across(from, bottom), bottom]
      ],
      points = corners.map(([cornerX, cornerY]) => `${cornerX},${cornerY}`)

    stripes.push(`<polygon points="${points.join(" ")}" fill="${ink}"/>`)
  }

  return stripes.join("\n")
}

function drawTemplate() {
  const worded = KEYS.filter(key => TEMPLATE_WORDS.has(key.number)),
    legends = worded.map(drawTemplateLegends)

  return [
    svgOpen(SHEET_WIDTH, TEMPLATE_DEPTH),
    drawGround(SHEET_WIDTH, TEMPLATE_DEPTH, TEMPLATE_BLACK),
    drawRainbow(),
    ...legends,
    "</svg>"
  ].join("\n")
}

function drawSlashedZero({ capHeight, middle, x }) {
  const style = textStyle(capHeight),
    { left, right } = inkOf("0", style),
    width = right - left,
    zero = drawText("0", { x, middle, capHeight, ink: INKS.white }),
    inset = width * SLASH.inset,
    baseline = middle + capHeight / 2

  return `${zero}<line x1="${x + inset}" y1="${baseline - capHeight * SLASH.foot}" x2="${x + width - inset}" y2="${baseline - capHeight * SLASH.head}" stroke="${INKS.white}" stroke-width="${capHeight * SLASH.stroke}"/>`
}

// The graphic's box is white with its inked quarters left out inside its border, so that the key shows through them.
function drawGraphic(quarters) {
  const { middle, width, height, border } = KEY_LEGEND.graphic,
    [x, y] = middle,
    box = {
      left: x - width / 2,
      right: x + width / 2,
      top: y - height / 2,
      bottom: y + height / 2
    },
    quarterWidth = (width - 2 * border) / 2,
    quarterHeight = (height - 2 * border) / 2,
    paths = [rectanglePath(box)]

  for (const [index, inked] of quarters.entries()) {
    const left = box.left + border + (index % 2) * quarterWidth,
      top = box.top + border + Math.floor(index / 2) * quarterHeight,
      quarter = { left, right: left + quarterWidth, top, bottom: top + quarterHeight }

    if (inked) {
      const hole = rectanglePath(quarter)

      paths.push(hole)
    }
  }

  return `<path d="${paths.join(" ")}" fill="${INKS.white}" fill-rule="evenodd"/>`
}

function drawNumberSymbol(symbol) {
  const { numberSymbol, underscore } = KEY_LEGEND,
    [x, y] = numberSymbol.middle,
    [barX, barY] = underscore.middle,
    bar = {
      left: barX - underscore.width / 2,
      right: barX + underscore.width / 2,
      top: barY - underscore.height / 2,
      bottom: barY + underscore.height / 2
    },
    underscored = symbol == "_"

  if (underscored) {
    return drawRectangle(bar, { fill: INKS.red })
  }

  return drawText(symbol, {
    x,
    middle: y,
    capHeight: numberSymbol.capHeight,
    ink: INKS.red,
    anchor: "middle"
  })
}

function drawNumberKey(key) {
  const { character } = KEY_LEGEND,
    place = { x: character.left, middle: character.digitMiddle, capHeight: character.capHeight },
    slashed = key.digit == "0",
    digit = slashed ? drawSlashedZero(place) : drawText(key.digit, { ...place, ink: INKS.white }),
    graphic = key.graphic ? drawGraphic(key.graphic) : "",
    symbol = drawNumberSymbol(key.symbol)

  return digit + graphic + symbol
}

function drawLetterKey(key) {
  const { character, keyword, symbol } = KEY_LEGEND,
    shifted = SYMBOL_SHIFT_LEGENDS.get(key.number),
    letter = drawText(key.letter, {
      x: character.left,
      middle: character.letterMiddle,
      capHeight: character.capHeight,
      ink: INKS.white
    }),
    word = drawText(key.keyword, {
      x: keyword.right,
      middle: keyword.middle,
      capHeight: keyword.capHeight,
      ink: INKS.white,
      anchor: "end"
    }),
    red = drawText(shifted.word ?? shifted.symbol, {
      x: shifted.right,
      middle: symbol.middle,
      capHeight: shifted.word ? symbol.wordHeight : symbol.symbolHeight,
      ink: INKS.red,
      anchor: "end",
      width: shifted.width
    })

  return letter + word + red
}

function drawLines(lines) {
  const drawn = lines.map(({ word, middle: [x, y], capHeight, ink }) =>
    drawText(word, { x, middle: y, capHeight, ink: INKS[ink], anchor: "middle" })
  )

  return drawn.join("")
}

function drawKeyLegend(key) {
  if (key.lines) {
    return drawLines(KEY_LINES[key.lines])
  }

  if (key.digit) {
    return drawNumberKey(key)
  }

  return drawLetterKey(key)
}

function drawLegends(laid) {
  const drawn = [svgOpen(LEGEND_ATLAS_WIDTH, LEGEND_ATLAS_DEPTH)]

  for (const key of laid) {
    const [x, y] = key.printedAt,
      legend = drawKeyLegend(key)

    drawn.push(`<g transform="translate(${x} ${y})">${legend}</g>`)
  }

  drawn.push("</svg>")

  return drawn.join("\n")
}

// The logotype's blocks are drawn smooth on the grain over a band of their gaps' dark, their openings cut back to the grain and their grooves dark; each block is edged in its gaps' dark.
function drawSinclair() {
  const { left, right, fromRear: rearDistance, toRear } = SINCLAIR_OUTLINE,
    width = right - left,
    depth = toRear - rearDistance,
    x = SINCLAIR.left - left,
    y = SINCLAIR.fromRear - rearDistance,
    { height, rise, dotGap, groove, gap } = SINCLAIR,
    edged = { fill: RELIEF_FACE, stroke: RELIEF_GAP, thickness: SINCLAIR.edge },
    band = {
      left: x + SINCLAIR_BLOCKS[0].left,
      right: x + SINCLAIR_BLOCKS.at(-1).right,
      top: y,
      bottom: y + height
    },
    drawn = [
      svgOpen(width, depth),
      drawGround(width, depth, CASE.colour),
      drawRectangle(band, { fill: RELIEF_GAP })
    ]

  for (const block of SINCLAIR_BLOCKS) {
    const top = block.stem ? y - rise : y,
      face = { left: x + block.left, right: x + block.right, top, bottom: y + height },
      drawnFace = drawRectangle(face, edged)

    drawn.push(drawnFace)

    if (block.dot) {
      const dot = { left: face.left, right: face.right, top: y - rise, bottom: y - dotGap },
        drawnDot = drawRectangle(dot, edged)

      drawn.push(drawnDot)
    }

    if (block.opening) {
      const opening = {
          left: x + block.opening.left,
          right: x + block.opening.right + gap,
          top: y + block.opening.top,
          bottom: y + block.opening.bottom + PRINT_MARGIN
        },
        drawnOpening = drawRectangle(opening, { ...edged, fill: CASE.colour })

      drawn.push(drawnOpening)
    }

    for (const cut of block.grooves ?? []) {
      const line = {
          left: x + cut.left,
          right: x + cut.right,
          top: y + cut.middle - groove / 2,
          bottom: y + cut.middle + groove / 2
        },
        drawnGroove = drawRectangle(line, { fill: RELIEF_GAP, radius: groove / 2 })

      drawn.push(drawnGroove)
    }
  }

  drawn.push("</svg>")

  return drawn.join("\n")
}

function drawModelName() {
  const { left, right, fromRear: rearDistance, toRear } = NAME_OUTLINE,
    width = right - left,
    depth = toRear - rearDistance,
    name = drawText(MODEL_NAME.word, {
      x: MODEL_NAME.left - left,
      middle: MODEL_NAME.fromRear - rearDistance + MODEL_NAME.capHeight / 2,
      capHeight: MODEL_NAME.capHeight,
      ink: NAME_WHITE,
      width: MODEL_NAME.width
    })

  return [svgOpen(width, depth), drawGround(width, depth, CASE.colour), name, "</svg>"].join("\n")
}

function drawRearLabels() {
  const width = LABELS_RIGHT - LABELS_LEFT,
    height = LABELS_TOP - LABELS_BOTTOM,
    drawn = [svgOpen(width, height), drawGround(width, height, CASE.colour)]

  for (const { word, middle, width: inkWidth, bottom, top } of REAR_LABELS) {
    const capHeight = top - bottom,
      plain = textStyle(capHeight),
      { left, right } = inkOf(word, plain),
      letterSpacing = (inkWidth - (right - left)) / (word.length - 1),
      label = drawText(word, {
        x: LABELS_RIGHT - middle,
        middle: LABELS_TOP - (bottom + top) / 2,
        capHeight,
        ink: INKS.red,
        anchor: "middle",
        letterSpacing
      })

    drawn.push(label)
  }

  drawn.push("</svg>")

  return drawn.join("\n")
}

function drawBoard() {
  const width = BOARD_PLAN.right - BOARD_PLAN.left,
    depth = BOARD_PLAN.rear - BOARD_PLAN.front,
    fingers = []

  for (let index = 0; index < FINGERS.count; index++) {
    const middle = BOARD.left + FINGERS.first + index * FINGERS.pitch - BOARD_PLAN.left,
      fingered = index != FINGERS.polarising,
      finger = {
        left: middle - FINGERS.width / 2,
        right: middle + FINGERS.width / 2,
        top: 0,
        bottom: FINGERS.length
      }

    if (fingered) {
      const drawn = drawRectangle(finger, { fill: METAL.colour })

      fingers.push(drawn)
    }
  }

  return [svgOpen(width, depth), drawGround(width, depth, BOARD_EDGE), ...fingers, "</svg>"].join(
    "\n"
  )
}

export function buildSpectrum48() {
  const laid = KEYS.map(layKey),
    openings = buildRearOpenings(),
    room = buildRoom(),
    slot = buildSlot(),
    sinclair = raisedTopPlate(SINCLAIR_OUTLINE),
    name = raisedTopPlate(NAME_OUTLINE),
    labels = buildLabelPlates(),
    underside = buildUndersideCuts(),
    upper = buildUpperCase([sinclair.room, name.room, labels.rooms, openings, room]),
    lowerBody = buildLowerCaseBody(),
    lower = [slot, openings, room, underside].reduce((shape, cut) => shape.cut(cut), lowerBody),
    template = buildTemplate(),
    prints = [
      [LEGENDS_PRINT, drawLegends(laid), LEGEND_PIXELS],
      [TEMPLATE_PRINT, drawTemplate(), TEMPLATE_PIXELS],
      [SINCLAIR_PRINT, drawSinclair(), WORD_PIXELS],
      [NAME_PRINT, drawModelName(), WORD_PIXELS],
      [LABELS_PRINT, drawRearLabels(), WORD_PIXELS],
      [BOARD_PRINT, drawBoard(), BOARD_PIXELS]
    ]

  return {
    tessellation: TESSELLATION,
    parts: [
      { name: "upper-case", shape: upper.translate(CENTRING), material: CASE },
      { name: "lower-case", shape: lower.translate(CENTRING), material: CASE },
      buildFeet(),
      buildScrews(),
      {
        name: TEMPLATE_PRINT,
        shape: template.translate(CENTRING),
        material: TEMPLATE_METAL,
        mapping: templateMapping,
        print: TEMPLATE_PRINT
      },
      ...buildKeys(laid),
      {
        name: SINCLAIR_PRINT,
        shape: sinclair.plate.translate(CENTRING),
        material: SINCLAIR_PLATE,
        face: sinclair.face,
        print: SINCLAIR_PRINT
      },
      {
        name: NAME_PRINT,
        shape: name.plate.translate(CENTRING),
        material: NAME_PLATE,
        face: name.face,
        print: NAME_PRINT
      },
      {
        name: LABELS_PRINT,
        shape: labels.plates.translate(CENTRING),
        material: LABEL_PLATE,
        mapping: labelMapping,
        print: LABELS_PRINT
      },
      buildInside(openings, slot),
      buildBoard(),
      buildSockets(),
      buildRearMetal()
    ],
    prints: prints.map(([print, svg, pixels]) => ({ name: print, language: LANGUAGE, svg, pixels }))
  }
}
