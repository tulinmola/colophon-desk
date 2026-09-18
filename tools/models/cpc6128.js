import { draw, drawRectangle, makeBox, makeCompound, makeCylinder } from "replicad"

// x runs from the left end, y back from the front and z up from the cabinet's lower edge, in millimetres. The feet stand below that edge, under a negative z.

// "DIMENSIONS (mm): w h d — Keyboard 510 48 170" [A], CPC6128 Service Manual, technical specification: https://archive.org/details/Amstrad_CPC6128_Service_Manual_1985_Amstrad_Consumer_Electronics_a
const WIDTH = 510,
  DEPTH = 170

// Traced from a square-on photograph of a 1985 French CPC 6128's left end, scaled by its joystick socket's pins across and down, the end measuring 169.7 against Amstrad's 170 [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html
// Heights stand above the end's lower edge, the feet not included.
const FRONT_HEIGHT = 25.9,
  SLOPE_REAR_HEIGHT = 36.1,
  REAR_STRIP_HEIGHT = 40.7,
  REAR_STRIP_DEPTH = 24.6,
  SLOPE_DEPTH = DEPTH - REAR_STRIP_DEPTH,
  SLOPE_RISE = SLOPE_REAR_HEIGHT - FRONT_HEIGHT,
  SLOPE_ANGLE = (Math.atan(SLOPE_RISE / SLOPE_DEPTH) * 180) / Math.PI

// Four grey rubber feet about 10 across, their centres measured on a 1988 French underside at 5.833 pixels to the millimetre, ±3 across and in depth [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html
// No photograph gives their height. The void under the cabinet's bottom front edge, read on a 1988 French front at 6.05 pixels to the millimetre, gives 3.3 under the keyboard and 2.3 under the drive, and a 1989 Spanish front 1.9; a rounded bottom edge and the contact shadow carry every one of those high, and the 464's feet, traced the same way against its own rear connectors, stand about 2 [E]. 2 is taken.
const FOOT = { diameter: 10, height: 2 },
  FOOT_PLACES = [
    { middle: 28, fromRear: 30 },
    { middle: 35, fromRear: 141 },
    { middle: 490, fromRear: 18 },
    { middle: 490, fromRear: 149 }
  ]

// The drive plate is screen-printed metal, showing bright where scratched in the photographs and standing a hair proud of the drive section, under 0.5 thick and 0.3 taken [E].
// A Spanish photograph from above makes it 92.5 across, +3.5/−1 [E]: https://retroordenadoresorty.blogspot.com/2021/08/amstrad-cpc-6128-128k-ordenador.html
// Against the case's 170, that photograph and a French one put its rear edge 25.7 and 26.8 from the rear and make it 139.8 and 139.0 deep, taken here at the middle [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html
const PLATE_WIDTH = 92.5,
  PLATE_DEPTH = 139.4,
  PLATE_FROM_REAR = 26.25,
  PLATE_THICKNESS = 0.3

// The drive section is 104.5 across with the plate centred on it: the Spanish photograph from above gives 103.5 to 105.3 by its key pitch, and the Spanish and French photographs of the front 104.5 and 104.8 by the drive's 95 opening [E].
// The French photograph from above, rectified on 65 key centres at their 19.05 mm pitch, gave 397 for its step, the rectification carried about 100 past the keys it was fitted on; read at its nearest keys' own pitch, it gives 104.5 to 106.8. It shows the section standing flush with the rear strip, the corner between the two rounded to about 5 [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html
// A monitor stand made to hold the machine on its front edge leaves it 40 to 41.2 there [D]: https://www.printables.com/model/527817. A 1988 French front, at 6.05 pixels to the millimetre, makes the section 40.8 from its top edge to the cabinet's bottom edge and 44.1 to the table, and a 1989 Spanish one 41.6 to that edge [E]. Amstrad's 48 overall would want a 7 foot standing where that same front shows lit wood, and the row it stands in gives the 664 the 464's own width; the disagreement stands until a real unit is measured.
const DRIVE_SECTION_WIDTH = 104.5,
  DRIVE_SECTION_LEFT = WIDTH - DRIVE_SECTION_WIDTH,
  DRIVE_SECTION_HEIGHT = REAR_STRIP_HEIGHT,
  DRIVE_SECTION_CORNER_RADIUS = 5

// The French photograph from above puts ESC's centre 33.1 from the left end and 60.3 from the rear, ±1.5 across and ±2 front to back [E].
// All three photographs from above, the Spanish and two French, put the keypad's right edge about 32.5 short of the drive section's step, closer than Amstrad's 510 allows with ESC where it stands; their lengths add up to 503 to 508 across, and the disagreement stands until a real unit is measured [E].
const KEY_PITCH = 19.05,
  ESC_FROM_LEFT = 33.1,
  ESC_FROM_REAR = 60.3

// Measured on a 600 dpi scan of a French 6128's keys lying face down [D], http://sasfepu78.fr/articles/Amstrad/, and on the photograph of the left end [E]:
// the caps stand 1.05 apart and 6.6 high, the photograph's 6.53 from the cabinet to their rims and a little more down to their skirts; Retroleum's 8 high is for the later 464's caps [D], https://retroleum.co.uk/cpc-kb.
// Their walls lean 28.8° at the front and 11° at the rear in the photograph, ±2.2, which the 4.1° slope turns into 33° and 7° on the cap; the scan's 2.8 at each side over their height leans the sides 23°. Those make a key's top 12.9 deep against the scan's 13.03 at the rims.
// Their tops are dished across the width as a cylinder, 0.8 deep by how far each cap's front edge bows on the scan, the space bar's only 0.15; RETURN's upper arm is a lip 3.2 high. The rows are not sculpted: every top follows the slope.
const CAP_GAP = 1.05,
  CAP_HEIGHT = 6.6,
  FRONT_WALL_ANGLE = 33,
  REAR_WALL_ANGLE = 7,
  SIDE_WALL_ANGLE = 23,
  DISH_DEPTH = 0.8,
  SPACE_BAR_WIDTH = 8,
  SPACE_BAR_DISH_DEPTH = 0.15,
  RETURN_LIP_HEIGHT = 3.2

// Row by row from the top, each key's number in the firmware's key matrix [A], SOFT 968 Appendix I, pp. 420–421, https://archive.org/details/SOFT968TheAmstrad6128FirmwareManual, with its left edge and width in keys from the scan [E]. Every national version shares the layout.
const KEY_ROWS = [
  [
    [66, 0],
    [64, 1],
    [65, 2],
    [57, 3],
    [56, 4],
    [49, 5],
    [48, 6],
    [41, 7],
    [40, 8],
    [33, 9],
    [32, 10],
    [25, 11],
    [24, 12],
    [16, 13],
    [79, 14],
    [10, 15],
    [11, 16],
    [3, 17]
  ],
  [
    [68, 0, 1.5],
    [67, 1.5],
    [59, 2.5],
    [58, 3.5],
    [50, 4.5],
    [51, 5.5],
    [43, 6.5],
    [42, 7.5],
    [35, 8.5],
    [34, 9.5],
    [27, 10.5],
    [26, 11.5],
    [17, 12.5],
    [20, 15],
    [12, 16],
    [4, 17]
  ],
  [
    [70, 0, 1.75],
    [69, 1.75],
    [60, 2.75],
    [61, 3.75],
    [53, 4.75],
    [52, 5.75],
    [44, 6.75],
    [45, 7.75],
    [37, 8.75],
    [36, 9.75],
    [29, 10.75],
    [28, 11.75],
    [19, 12.75],
    [13, 15],
    [14, 16],
    [5, 17]
  ],
  [
    [21, 0, 2.25],
    [71, 2.25],
    [63, 3.25],
    [62, 4.25],
    [55, 5.25],
    [54, 6.25],
    [46, 7.25],
    [38, 8.25],
    [39, 9.25],
    [31, 10.25],
    [30, 11.25],
    [22, 12.25],
    [21, 13.25, 1.75],
    [15, 15],
    [0, 16],
    [7, 17]
  ],
  [
    [23, 0, 2.25],
    [9, 2.25, 1.75],
    [47, 4, 8],
    [6, 12, 3],
    [8, 15],
    [2, 16],
    [1, 17]
  ]
]

// RETURN, key 18, on the same scan: its cap 1.25 keys wide from 13.75 over the second and third rows, its lip 1.5 wide from 13.5 over the second [E].
const RETURN_NUMBER = 18,
  RETURN_LEFT = 13.75,
  RETURN_WIDTH = 1.25,
  RETURN_ROW = 1.5,
  RETURN_ROWS = 2,
  RETURN_LIP_LEFT = 13.5,
  RETURN_LIP_WIDTH = 1.5

const KEY_BLOCK_LEFT = ESC_FROM_LEFT - KEY_PITCH / 2,
  KEY_BLOCK_REAR = ESC_FROM_REAR - KEY_PITCH / 2,
  KEY_BLOCK_KEYS_ACROSS = 18,
  KEY_BLOCK_ROWS = KEY_ROWS.length

const LEGEND_ATLAS_WIDTH = KEY_BLOCK_KEYS_ACROSS * KEY_PITCH,
  LEGEND_ATLAS_DEPTH = KEY_BLOCK_ROWS * KEY_PITCH

// In the photograph from above, the dark band between the caps' bases and the cabinet's edge measures 0.64 to 0.97 at the sides and 1.5 to 1.75 at the front, at half brightness; behind the top row the caps' shadows hide it, and 1 is taken [E].
// A key cover printed to fit, 346.5 × 98.5, sits on the slope over the keys and not in the opening [D]: https://www.printables.com/model/1334008
const KEY_CLEARANCE_SIDES = 0.8,
  KEY_CLEARANCE_FRONT = 1.6,
  KEY_CLEARANCE_REAR = 1

const KEY_OPENING_LEFT = KEY_BLOCK_LEFT + CAP_GAP / 2 - KEY_CLEARANCE_SIDES,
  KEY_OPENING_RIGHT =
    KEY_BLOCK_LEFT + KEY_BLOCK_KEYS_ACROSS * KEY_PITCH - CAP_GAP / 2 + KEY_CLEARANCE_SIDES,
  KEY_OPENING_REAR = DEPTH - (KEY_BLOCK_REAR + CAP_GAP / 2 - KEY_CLEARANCE_REAR),
  KEY_OPENING_FRONT =
    DEPTH - (KEY_BLOCK_REAR + KEY_BLOCK_ROWS * KEY_PITCH - CAP_GAP / 2 + KEY_CLEARANCE_FRONT)

// No source gives how far below the slope the floor under the keys lies; 8 is taken until a real unit is measured.
const FLOOR_BELOW_SLOPE = 8

// Parts made to plug the drive's opening give it 95 × 36 [D]: https://www.thingiverse.com/thing:2876318. A mash-up of them made for a "tight fit on the CPC case" gives 94.5 to 96.5 across and 35.6 high: https://www.printables.com/model/284516
// A photograph of the same machine's front, scaled by that opening, puts it 3.3 from the right end and splits the face above and below it about two to one [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html
// How far the drive's bezel stands back from the cabinet is not known; 2 is taken until a real unit is measured.
const DRIVE_OPENING_WIDTH = 95,
  DRIVE_OPENING_HEIGHT = 36,
  DRIVE_OPENING_RIGHT = WIDTH - 3.3,
  DRIVE_OPENING_BOTTOM = (DRIVE_SECTION_HEIGHT - DRIVE_OPENING_HEIGHT) / 3,
  BEZEL_SET_BACK = 2

// The drawing of the EME-150, sister to the 6128's EME-155, makes the drive 152 long from its bezel's face and its slot 81 long, and puts the slot's middle 21 above the bezel's lower edge [A]: https://www.cpcwiki.eu/index.php/File:Panasonic-3_inch_Floppy_Drive_EME-150.pdf
const DRIVE_LENGTH = 152,
  SLOT_LENGTH = 81

// Two photographs of the front, the 1989 Spanish and a 1988 French, rectified for the camera's elevation by the opening's 95 × 36 and scaled by the slot's 81, put the slot's middle 21.65 and 21.8 above the opening's lower edge; the drawing's 21 [A], read in the machine's own orientation, agrees [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html
// At the slot's middle a bevel for the finger, 30.5 and 30.3 wide in the two rectified photographs and its centre 1.25 left of the slot's in both, reaching 6.5 and 6.9 below the slot's lower edge; a near-frontal photograph of another unit among the Commons ones gives 5.4 [E]: https://commons.wikimedia.org/wiki/Category:Amstrad_CPC6128. A 1985 French photograph reads 2.5 there, its whole drive front soft, and the disagreement stands.
// Above the slot nothing shows. Every photograph of a drive front here looks down on it from 34 to 44°, where a face turned downward is hidden, and the bright block seen through the slot is this same lower bevel; that same near-frontal photograph, at 1.7 pixels to the millimetre, reads the band above the slot as tall inside the bevel as outside it [E]. The upper bevel therefore rests on the drawing alone, which widens the slot's middle both ways [A], and its reach is taken at 1.2, the most that photograph could hide.
// The bevels' faces are taken at 45° to the slot's floor, and the slot, hidden past its first millimetres, is taken 10 deep.
// The slot's height is dimensioned nowhere, and the drawing does not hold it either: its own slot rectangle scales to 10.3 where its 95 and 81 both scale true. Remeasured on the 1988 French front at 6.05 pixels to the millimetre, set by the front face's 25.9 and the opening's 36, the slot and the lit jaw below it read 5.0, +0.5/−0.4; the 1989 Spanish front reads 2.0 there [E].
// The 3-inch Compact Floppy the drive takes, one medium across every maker's mechanism, is 5 thick [A], Hitachi HFD305SX instruction manual, Fig. 4: https://archive.org/details/hitachi-compact-floppy-disk-drive-model-hfd-305-sx. No slot can be narrower than the disc it passes, which leaves 5.0 to 5.5 of that range standing. The clearance over the disc is not measured and 0.2 is taken.
const SLOT_HEIGHT = 5.2,
  SLOT_MIDDLE_ABOVE_OPENING = 21.7,
  FINGER_BEVEL_WIDTH = 30.4,
  FINGER_BEVEL_FROM_MIDDLE = -1.25,
  FINGER_BEVEL_BELOW = 6.5,
  FINGER_BEVEL_ABOVE = 1.2,
  FINGER_BEVEL_ANGLE = 45,
  SLOT_DEPTH = 10

const DRIVE_OPENING_LEFT = DRIVE_OPENING_RIGHT - DRIVE_OPENING_WIDTH,
  DRIVE_OPENING_TOP = DRIVE_OPENING_BOTTOM + DRIVE_OPENING_HEIGHT,
  DRIVE_BAY_DEPTH = BEZEL_SET_BACK + DRIVE_LENGTH

// The same two photographs, rectified, measure the drive's fittings, their heights from the opening's lower edge [E]: the lamp behind an opening 6.9 across and 4 high and about 1.1 deep, by the lit floor showing below its lens, which sits on that floor; the eject button 15.1 by 4.3, a millimetre proud of its recess's back wall and a millimetre behind that face, ribbed four times at a 1 pitch; its recess 18.2 by 9; and a notch 5.5 across reaching 3.7 above the slot's upper edge, with a lever standing inside it.
// The drawing of the EME-150 does not show the notch, and what it is remains unknown; both its walls read dark from its top edge to the slot, so nothing bounds its depth and 2 is taken. The recess's floor reads about 1 in front of the button and the button's own face about 1 more behind it, so 2 is taken for the recess. A lens's own thickness is not known and 0.6 is taken, and the button's grooves are not measured either: 0.35 tall and 0.3 deep are taken.
const DRIVE_LAMP_OPENING = { left: 416.6, right: 423.5, bottom: 2, top: 6, depth: 1.1 },
  DRIVE_LAMP = { left: 417.7, right: 423.4, bottom: 4, top: 6 },
  EJECT_RECESS = { left: 479.3, right: 497.5, bottom: 2.9, top: 11.8, depth: 2 },
  EJECT_BUTTON = { left: 481.7, right: 496.8, bottom: 3.2, top: 7.45, standing: -1 },
  EJECT_RIBS = { count: 4, pitch: 1, groove: 0.35, depth: 0.3 },
  DRIVE_NOTCH = {
    left: 495.3,
    right: 500.9,
    bottom: SLOT_MIDDLE_ABOVE_OPENING + SLOT_HEIGHT / 2,
    top: SLOT_MIDDLE_ABOVE_OPENING + SLOT_HEIGHT / 2 + 3.7,
    depth: 2
  },
  LENS_SET_BACK = 1.1,
  LENS_THICKNESS = 0.6

// The rear strip is slotted for the air: 91 slots 2.55 wide at a 4.98 pitch, the first's left edge 24.4 from the left end, each running 6.7 in from the rear edge on top and 7.7 down the rear face, measured on the Spanish photograph from above and a French one of the rear, ±0.2 [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html. The 1985 French unit gives 23 to 479 at 5.1 [E].
// Its rear-top edge is rounded to about 1 to 1.5, at low confidence. The case's wall is not measured and 2.5 is taken; through the slots the inside of the case shows.
const VENTS = {
    left: 24.4,
    count: 91,
    pitch: 4.98,
    width: 2.55,
    reach: 6.7,
    bottom: REAR_STRIP_HEIGHT - 7.7
  },
  CASE_WALL = 2.5

// The nameplate and the colour badge lie in shallow recesses in the rear strip, their outlines measured on the Spanish photograph from above, ±0.3 across and ±0.4 in depth [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html. The light lines along their rear edges, at the photograph's own blur limit, bound the recesses under about 1.5, with no lower bound and no way to separate a recess's depth from its plate's thickness, so each recess is taken at the plate's thickness.
// The badge's lamp shows through a window 5.25 by 2.05, its lens standing behind it as the drive's does.
const NAMEPLATE = { left: 25.2, right: 143.2, fromRear: 8.6, depth: 13.2 },
  BADGE = { left: 329.5, right: 364.7, fromRear: 8.9, depth: 13.6 },
  POWER_LAMP = { left: 357.6, right: 362.9, fromRear: 16.65, depth: 2.05 }

// Sampled on the cabinet left of the keys in an uncalibrated photograph of aged plastic, good for the hue and no more [E]: https://commons.wikimedia.org/wiki/File:Amstrad_CPC_6128_solo_macchina.jpg
const CABINET = { name: "cabinet", colour: "#535459" }

// Sampled on a foot and on the case around it in the underside photograph, which reads the case #404b52 where the cabinet's own photograph reads #535459, and corrected by that difference: the feet stand a little lighter and cooler than the case. Uncalibrated, good for the hue and no more [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html
const FOOT_RUBBER = { name: "foot", colour: "#575e6b" }

// Sampled on the drive's bezel in the photograph of the machine's front, uncalibrated and dark, good for the hue and no more [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html
const BEZEL = { name: "bezel", colour: "#1c1918" }

// Sampled through the vent slots of the 1989 Spanish unit and a 1988 French one, #010102 to #0c0e0f, and taken at the middle: the inside of the case is black [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html
const INTERIOR = { name: "interior", colour: "#07080a" }

// Sampled on the same photograph, which reads the case #36404f where the cabinet's own photograph reads #535459, and corrected by that difference: the plates; the lamps' lenses, dark red while the machine stands off; the nameplate's box #a2b4d1, its logo's letters #e5e9fa and its words #e4e4ed, the letters standing barely a tenth above the box; and the badge's ENC., near-black at #020409. Uncalibrated, good for the hue and no more [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html.
const NAMEPLATE_BACKING = { name: "nameplate", colour: "#606768" },
  BADGE_BACKING = { name: "badge", colour: "#989895" },
  LAMP = { name: "lamp", colour: "#7c464d" },
  NAMEPLATE_BOX = "#d6d9dc",
  NAMEPLATE_LOGO_INK = "#f4f6f8",
  NAMEPLATE_INK = "#eceef0",
  BADGE_INK = "#111316"

// Sampled on the space bar and ENTER in the same photograph as the cabinet's colour, #dcccb3 to #dfd6b9, and taken at the middle; the scan of the keys samples #e5e3bf. Uncalibrated, good for the hue and no more [E].
const KEYCAP = { name: "keycap", colour: "#ddd1b6" }

// Sampled on the legends of a 1989 Spanish unit in its photograph from above, one ink throughout, neutral and very dark. Uncalibrated, good for the hue and no more [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html
const LEGEND_INK = "#282b29"

// Sampled on a second Spanish unit, whose red has not faded: the plate, its rules and its lettering, #d8d4c7 to #e8e6db across the photographs and taken at the middle. Uncalibrated, good for the hue and no more [E]: https://commons.wikimedia.org/wiki/File:AMSTRAD_CPC_6128.jpg
// The three inks are read on that unit's colour badge, whose stripes are broad where the plate's rules are 1.1 thin and blurred: #ab2d37, #368943 and #1e4784 there against #9f525c, #72b285 and #334774 on the rules, and the same three on the UK and French badges. The plate and the badge are taken to carry one set of inks [E].
const PLATE = { name: "plate", colour: "#4e4d53" },
  PLATE_INK = "#e0ddd1",
  PLATE_RED = "#ab2d37",
  PLATE_GREEN = "#368943",
  PLATE_BLUE = "#1e4784"

// How finely a print is rendered. A plate's hairlines and its 1.6 capitals want 12 pixels to the millimetre; the legend atlas, a tile to a key across the whole block, would stand 4115 wide at that density, past the 4096 a mobile GPU may hold, and takes 10 — which still gives a word's 2.5 capital 25 pixels.
const PLATE_PIXELS = 12,
  LEGEND_PIXELS = 10

const LANGUAGE = "es",
  DRIVE_PLATE_PRINT = "drive-plate",
  LEGENDS_PRINT = "legends",
  NAMEPLATE_PRINT = "nameplate",
  BADGE_PRINT = "badge"

// The plate's words as printed on both Spanish units, the colours numbered 0 to 26 down three columns [E]: https://retroordenadoresorty.blogspot.com/2021/08/amstrad-cpc-6128-128k-ordenador.html and https://commons.wikimedia.org/wiki/File:AMSTRAD_CPC_6128.jpg
const PLATE_WORDS = {
    title: "UNIDAD DE DISCO",
    keyNumbers: "CODIGOS DE ENTRADA",
    colourChart: "TABLA DE COLORES",
    model: "CPC6128"
  },
  COLOUR_NAMES = [
    "NEGRO",
    "AZUL",
    "AZUL BRILLANTE",
    "ROJO",
    "MAGENTA",
    "MALVA",
    "ROJO BRILLANTE",
    "PÚRPURA",
    "MAGENTA BRILLANTE",
    "VERDE",
    "CIANO",
    "AZUL CIELO",
    "AMARILLO",
    "BLANCO",
    "AZUL PASTEL",
    "NARANJA",
    "ROSA",
    "MAGENTA PASTEL",
    "VERDE BRILLANTE",
    "VERDE MARINO",
    "CIANO BRILLANTE",
    "VERDE LIMA",
    "VERDE PASTEL",
    "CIANO PASTEL",
    "AMARILLO BRILLANTE",
    "AMARILLO PASTEL",
    "BLANCO BRILLANTE"
  ]

// The artwork in its own frame of 92.5 × 138.5 from the plate's rear left corner, which the print stretches over the plate: measured on the Spanish photograph and on the UK and French ones, each warped to 95.9 × 142.5 and scaled to this frame, ±0.2 to 0.5 [E]: https://commons.wikimedia.org/wiki/File:Amstrad_CPC_6128_solo_macchina.jpg and https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html
// Rules stand 1.1 thick, hairlines 0.4 and the key map's and chart's lines 0.45, the keys' corners rounded about 0.4. The title and model mark are a bold grotesque condensed and leaning 16°, their right edges measured on the ink, which the lean carries 0.6 past the text's end; the headings are regular and letterspaced to their measured widths.
// TeX Gyre Heros stands in for the plate's face, its capitals 0.729 of its size and its condensed cut's 0.718, the title set in the condensed cut 48.5 across against the measured 48.7: https://www.gust.org.pl/projects/e-foundry/tex-gyre/heros. The colour names are narrowed to 0.94, the plate's MAGENTA BRILLANTE against Heros Bold's at the same height.
const ARTWORK_WIDTH = 92.5,
  ARTWORK_DEPTH = 138.5,
  PLATE_LAYOUT = {
    title: { right: 83.9, baseline: 13.7, capHeight: 4.8, width: 48.7 },
    redRule: { left: 2.4, right: 90.2, y: 18.1 },
    keyNumbersHeading: { centre: 46.6, baseline: 25.2, capHeight: 3, width: 50.2 },
    wave: { left: 2.9, right: 89.1, y: 27.9, height: 1.25, cycles: 50, stroke: 0.3 },
    upperHairline: { left: 2.7, right: 90, y: 32.3 },
    keyMap: { left: 9.6, top: 35.5, keyWidth: 4.1, keyDepth: 4.06, capHeight: 1.3, radius: 0.4 },
    lowerHairline: { left: 2.9, right: 90, y: 59.1 },
    greenRule: { left: 2.4, right: 89.9, y: 66.1 },
    chart: {
      left: 7,
      right: 85.5,
      top: 73.75,
      bottom: 115.5,
      headingRule: 78.9,
      columnRules: [34.6, 58],
      firstRow: 82.1,
      rowPitch: 3.84,
      rowsPerColumn: 9,
      capHeight: 1.6,
      numberInset: 0.4,
      nameInset: 3.25,
      nameNarrowing: 0.94
    },
    chartHeading: { centre: 46.5, baseline: 78.05, capHeight: 3.05, width: 44.6 },
    blueRule: { left: 2.4, right: 89.9, y: 120.3 },
    model: { right: 84.15, baseline: 130.5, capHeight: 5.05, width: 23.55 }
  },
  RULE_THICKNESS = 1.1,
  HAIRLINE_THICKNESS = 0.4,
  LINE_THICKNESS = 0.45,
  TITLE_LEAN = 16,
  HEROS = "TeX Gyre Heros",
  HEROS_CONDENSED = "TeX Gyre Heros Cn",
  HEROS_CAP_HEIGHT = 0.729,
  HEROS_CONDENSED_CAP_HEIGHT = 0.718

// The legends of the 1989 Spanish unit, measured on its photograph from above, every key's top rectified to its size, ±0.3 [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html. They are drawn across from the key's axis and forward from its top's rear edge.
// Every legend is centred 7.2 behind that edge. A letter's capital stands 5.4 high, regular; a pair's upper character 4.05 with its top at 2.65 and its lower 3.95 on a baseline at 11.8; a word 2.5 and bold, centred even on the widest keys; RETURN 2.7 with its top at 24.88. TeX Gyre Heros matches their widths within the photograph's precision, all but ←BORR's.
// FIJA over MAYS starts 8.85 from the left edge of a top 26.38 wide, 4.34 left of the axis, its lines' tops at 4.34 and 7.87. A keypad key's f leans 17.7° beside an upright digit 4.57 high, the two 6.1 across with 0.75 between; being about as wide, their middles stand 3.4 apart.
// The arrows are filled: the heavy ones 7 long, their shafts 1.16 thick and their heads 2.45 wide and 2.4 long; the thin one under ₧ 3.9 long, its shaft 0.4 and its head 1.2. ←BORR is 9.95 across, its arrow taken from the photograph's proportions at 3 long, with a head 1.3 and a shaft 0.35, standing 0.2 from its word, which is narrowed into the rest.
// Some characters are the keytops' own, not Heros's. The dot is a square 0.87 across with its top at 6.67, the full stop under > the same with its top at 9.82. The underscore is a bar 4.2 by 0.34 with its top at 4.71, the broken bar two dashes 0.5 by 1.35 at 3.03 and 5.56, the equals two bars 3.03 by 0.51 at 3.95 and 5.47, the minus under it a bar 2.87 by 0.51 at 9.68.
// The brackets stand 4.1 high and 1.45 wide on the baseline, the slashes 2.87 square, their strokes taken at 0.4; the comma under < rides above the baseline, its top at 9.57, which sets Heros's comma, reaching 0.56 above its own baseline at that size, on 10.13. The zero's slash reaches 1.51 either side of a zero 3.95 high, its stroke taken at a tenth of that height. The peseta's P is 4.05 high, its small t taken at 0.6 of that height and 0.3 of it right of the P's axis, under the bowl. Ñ's N stands 5.56 high on a baseline at 11.27 under a tilde 6.23 wide and 0.84 high with its top at 3.86, its stroke taken at 0.4.
const LEGEND_MIDDLE = 7.2,
  LETTER_HEIGHT = 5.4,
  WORD_HEIGHT = 2.5,
  KEYPAD_HEIGHT = 4.57,
  LETTER = { capHeight: LETTER_HEIGHT, baseline: LEGEND_MIDDLE + LETTER_HEIGHT / 2 },
  WORD = { capHeight: WORD_HEIGHT, baseline: LEGEND_MIDDLE + WORD_HEIGHT / 2 },
  KEYPAD = { capHeight: KEYPAD_HEIGHT, baseline: LEGEND_MIDDLE + KEYPAD_HEIGHT / 2 },
  UPPER = { capHeight: 4.05, baseline: 6.7 },
  LOWER = { capHeight: 3.95, baseline: 11.8 },
  RETURN_LEGEND = { capHeight: 2.7, baseline: 27.58 },
  ENYE = { capHeight: 5.56, baseline: 11.27 },
  LINES_LEFT = -4.34,
  LINE_BASELINES = [6.84, 10.37],
  KEYPAD_APART = 3.4,
  KEYPAD_LEAN = 17.7

// The nameplate's artwork in its own frame of 118 by 13.2 from its rear left corner, and the badge's in one of 35.2 by 13.6, measured on the Spanish photograph from above [E].
// The nameplate's box carries AMSTRAD in white, extra-condensed and heavy, with a single slanting gap cut through it, leaning 27.2° from the front-back axis, the plate's dark showing in it and the letters running unbroken across it; the box's right end is square. The words lean 15.5°, their capitals 5.38 on a baseline at 10.7.
// Heros Cn Bold has the photograph's own stems, 0.171 of the capital against the measured 0.178 to 0.188, and stands about a fifth wider.
// The badge's three stripes lean 42.7°, each 3.5 across and 6.1 tall, at 0 4.85 and 10.15 from the first; they are taken to be the plate's three inks. ENC. stands upright above the lamp's window, its capitals 2.06 and its stems 0.16 of that, between Heros's Regular and Bold.
const NAMEPLATE_ART = {
    box: { left: 7.6, right: 27.9, top: 2.6, bottom: 11.9 },
    gap: [
      [20.8, 2.5],
      [25.3, 2.5],
      [20.5, 11.95],
      [16, 11.95]
    ],
    logo: { word: "AMSTRAD", left: 7.9, width: 19.2, capHeight: 5.25, baseline: 10.87 },
    lean: 15.5,
    capHeight: 5.38,
    baseline: 10.7,
    words: [
      { word: "128K", left: 32.4, width: 12.5 },
      { word: "ORDENADOR", left: 47.3, width: 31.5 },
      { word: "PERSONAL", left: 82.1, width: 27.1 }
    ]
  },
  BADGE_ART = {
    stripes: {
      top: 3.75,
      bottom: 9.83,
      topLeft: 8.7,
      bottomLeft: 3.1,
      width: 3.5,
      offsets: [0, 4.85, 10.15]
    },
    word: { word: "ENC.", left: 27.5, width: 5.7, capHeight: 2.06, baseline: 5.85 }
  },
  BADGE_INKS = [PLATE_RED, PLATE_GREEN, PLATE_BLUE]

const HEAVY_ARROW = { length: 7, shaft: 1.16, headWidth: 2.45, headLength: 2.4 },
  THIN_ARROW = { length: 3.9, shaft: 0.4, headWidth: 1.2, headLength: 1.2 },
  DELETE_ARROW = { length: 3, shaft: 0.35, headWidth: 1.3, headLength: 1.3 },
  ARROW_TURNS = { up: 0, right: 90, down: 180, left: 270 },
  DELETE_WIDTH = 9.95,
  DELETE_GAP = 0.2,
  DOT = { width: 0.87, thickness: 0.87, tops: [6.67] },
  FULL_STOP = { width: 0.87, thickness: 0.87, tops: [9.82] },
  UNDERSCORE = { width: 4.2, thickness: 0.34, tops: [4.71] },
  BROKEN_BAR = { width: 0.5, thickness: 1.35, tops: [3.03, 5.56] },
  EQUALS = { width: 3.03, thickness: 0.51, tops: [3.95, 5.47] },
  MINUS = { width: 2.87, thickness: 0.51, tops: [9.68] },
  BRACKET = { width: 1.45, height: 4.1, stroke: 0.4 },
  BRACKET_ARMS = { "[": 1, "]": -1 },
  SLANT = { side: 2.87, stroke: 0.4 },
  SLANT_LEANS = { "/": 1, "\\": -1 },
  COMMA = { capHeight: LOWER.capHeight, baseline: 10.13 },
  SLASH = { reach: 1.51 / 3.95, stroke: 0.1 },
  PESETA_T = { height: 0.6, offset: 0.3 },
  TILDE = { width: 6.23, height: 0.84, top: 3.86, stroke: 0.4 }

// A cut runs this far past the faces it opens, so the kernel is never left two coplanar faces to join.
const OVERRUN = 1

// Where one part lies in another's recess or opening, a hairline holds the two apart, so that no face of either stands in the plane of a face of the other.
const HAIRLINE = 0.1

const CENTRING = [-WIDTH / 2, -DEPTH / 2, FOOT.height],
  QUARTERS = ["", "¼", "½", "¾"]

function slopeHeightAt(fromFront) {
  return FRONT_HEIGHT + (SLOPE_RISE * fromFront) / SLOPE_DEPTH
}

function tangent(degrees) {
  return Math.tan((degrees * Math.PI) / 180)
}

function buildVentSlots() {
  const slots = []

  for (let slot = 0; slot < VENTS.count; slot++) {
    const left = VENTS.left + slot * VENTS.pitch,
      box = makeBox(
        [left, DEPTH - VENTS.reach, VENTS.bottom],
        [left + VENTS.width, DEPTH + OVERRUN, REAR_STRIP_HEIGHT + OVERRUN]
      )

    slots.push(box)
  }

  return makeCompound(slots)
}

function buildVentCavity(inset = 0) {
  const right = VENTS.left + (VENTS.count - 1) * VENTS.pitch + VENTS.width

  return makeBox(
    [
      VENTS.left - OVERRUN + inset,
      DEPTH - VENTS.reach - OVERRUN + inset,
      VENTS.bottom - OVERRUN + inset
    ],
    [right + OVERRUN - inset, DEPTH - CASE_WALL - inset, REAR_STRIP_HEIGHT - CASE_WALL - inset]
  )
}

function buildPlateRecess(plate) {
  const rear = DEPTH - plate.fromRear

  return makeBox(
    [plate.left - HAIRLINE, rear - plate.depth - HAIRLINE, REAR_STRIP_HEIGHT - PLATE_THICKNESS],
    [plate.right + HAIRLINE, rear + HAIRLINE, REAR_STRIP_HEIGHT + OVERRUN]
  )
}

function buildPowerLampWindow() {
  const rear = DEPTH - POWER_LAMP.fromRear

  return makeBox(
    [
      POWER_LAMP.left - HAIRLINE,
      rear - POWER_LAMP.depth - HAIRLINE,
      REAR_STRIP_HEIGHT - LENS_SET_BACK
    ],
    [POWER_LAMP.right + HAIRLINE, rear + HAIRLINE, REAR_STRIP_HEIGHT + OVERRUN]
  )
}

function buildCabinet() {
  const keyOpeningFrontFloor = slopeHeightAt(KEY_OPENING_FRONT) - FLOOR_BELOW_SLOPE,
    keyOpeningRearFloor = slopeHeightAt(KEY_OPENING_REAR) - FLOOR_BELOW_SLOPE,
    corner = [DRIVE_SECTION_LEFT, SLOPE_DEPTH, (SLOPE_REAR_HEIGHT + REAR_STRIP_HEIGHT) / 2],
    end = draw([0, 0])
      .lineTo([0, FRONT_HEIGHT])
      .lineTo([SLOPE_DEPTH, SLOPE_REAR_HEIGHT])
      .lineTo([SLOPE_DEPTH, REAR_STRIP_HEIGHT])
      .lineTo([DEPTH, REAR_STRIP_HEIGHT])
      .lineTo([DEPTH, 0])
      .close(),
    keyOpeningEnd = draw([KEY_OPENING_FRONT, keyOpeningFrontFloor])
      .lineTo([KEY_OPENING_REAR, keyOpeningRearFloor])
      .lineTo([KEY_OPENING_REAR, REAR_STRIP_HEIGHT])
      .lineTo([KEY_OPENING_FRONT, REAR_STRIP_HEIGHT])
      .close(),
    body = end.sketchOnPlane("YZ").extrude(WIDTH),
    driveSection = makeBox([DRIVE_SECTION_LEFT, 0, 0], [WIDTH, DEPTH, DRIVE_SECTION_HEIGHT]),
    keyOpening = keyOpeningEnd
      .sketchOnPlane("YZ", KEY_OPENING_LEFT)
      .extrude(KEY_OPENING_RIGHT - KEY_OPENING_LEFT),
    driveBay = makeBox(
      [DRIVE_OPENING_LEFT, -BEZEL_SET_BACK, DRIVE_OPENING_BOTTOM],
      [DRIVE_OPENING_RIGHT, DRIVE_BAY_DEPTH, DRIVE_OPENING_TOP]
    ),
    ventCavity = buildVentCavity(),
    ventSlots = buildVentSlots(),
    nameplateRecess = buildPlateRecess(NAMEPLATE),
    badgeRecess = buildPlateRecess(BADGE),
    lampWindow = buildPowerLampWindow()

  return body
    .fuse(driveSection)
    .fillet(DRIVE_SECTION_CORNER_RADIUS, edge => edge.inDirection("Z").containsPoint(corner))
    .cut(keyOpening)
    .cut(driveBay)
    .cut(ventCavity)
    .cut(ventSlots)
    .cut(nameplateRecess)
    .cut(badgeRecess)
    .cut(lampWindow)
}

function buildOnBezel(outline, [standing, sunk]) {
  return makeBox(
    [outline.left, BEZEL_SET_BACK - standing, DRIVE_OPENING_BOTTOM + outline.bottom],
    [outline.right, BEZEL_SET_BACK + sunk, DRIVE_OPENING_BOTTOM + outline.top]
  )
}

function buildDrive() {
  const middle = (DRIVE_OPENING_LEFT + DRIVE_OPENING_RIGHT) / 2,
    slotBottom = DRIVE_OPENING_BOTTOM + SLOT_MIDDLE_ABOVE_OPENING - SLOT_HEIGHT / 2,
    slotTop = slotBottom + SLOT_HEIGHT,
    lowerLip = slotBottom - FINGER_BEVEL_BELOW,
    upperLip = slotTop + FINGER_BEVEL_ABOVE,
    bevelSlope = tangent(FINGER_BEVEL_ANGLE),
    bevelLeft = middle + FINGER_BEVEL_FROM_MIDDLE - FINGER_BEVEL_WIDTH / 2,
    block = makeBox(
      [DRIVE_OPENING_LEFT, BEZEL_SET_BACK, DRIVE_OPENING_BOTTOM],
      [DRIVE_OPENING_RIGHT, DRIVE_BAY_DEPTH, DRIVE_OPENING_TOP]
    ),
    slot = makeBox(
      [middle - SLOT_LENGTH / 2, 0, slotBottom],
      [middle + SLOT_LENGTH / 2, BEZEL_SET_BACK + SLOT_DEPTH, slotTop]
    ),
    lowerBevelEnd = draw([0, lowerLip - bevelSlope * BEZEL_SET_BACK])
      .lineTo([BEZEL_SET_BACK + (slotTop - lowerLip) / bevelSlope, slotTop])
      .lineTo([0, slotTop])
      .close(),
    upperBevelEnd = draw([0, upperLip + bevelSlope * BEZEL_SET_BACK])
      .lineTo([BEZEL_SET_BACK + (upperLip - slotBottom) / bevelSlope, slotBottom])
      .lineTo([0, slotBottom])
      .close(),
    lowerBevel = lowerBevelEnd.sketchOnPlane("YZ", bevelLeft).extrude(FINGER_BEVEL_WIDTH),
    upperBevel = upperBevelEnd.sketchOnPlane("YZ", bevelLeft).extrude(FINGER_BEVEL_WIDTH),
    ejectRecess = buildOnBezel(EJECT_RECESS, [OVERRUN, EJECT_RECESS.depth]),
    lampOpening = buildOnBezel(DRIVE_LAMP_OPENING, [OVERRUN, DRIVE_LAMP_OPENING.depth]),
    notch = buildOnBezel(DRIVE_NOTCH, [OVERRUN, DRIVE_NOTCH.depth])

  return block
    .cut(slot)
    .cut(lowerBevel)
    .cut(upperBevel)
    .cut(ejectRecess)
    .cut(lampOpening)
    .cut(notch)
}

function buildRibs() {
  const face = BEZEL_SET_BACK - EJECT_BUTTON.standing,
    middle = (EJECT_BUTTON.bottom + EJECT_BUTTON.top) / 2,
    grooves = []

  for (let groove = 0; groove < EJECT_RIBS.count; groove++) {
    const centre = middle + (groove - (EJECT_RIBS.count - 1) / 2) * EJECT_RIBS.pitch,
      bottom = DRIVE_OPENING_BOTTOM + centre - EJECT_RIBS.groove / 2,
      box = makeBox(
        [EJECT_BUTTON.left - OVERRUN, face - OVERRUN, bottom],
        [EJECT_BUTTON.right + OVERRUN, face + EJECT_RIBS.depth, bottom + EJECT_RIBS.groove]
      )

    grooves.push(box)
  }

  return makeCompound(grooves)
}

function buildEjectButton() {
  const button = buildOnBezel(EJECT_BUTTON, [EJECT_BUTTON.standing, EJECT_RECESS.depth]),
    ribs = buildRibs(),
    ribbed = button.cut(ribs)

  return { name: "eject-button", shape: ribbed.translate(CENTRING), material: BEZEL }
}

function buildDriveLamp() {
  const face = DRIVE_LAMP_OPENING.depth - HAIRLINE,
    outline = {
      left: DRIVE_LAMP.left,
      right: DRIVE_LAMP.right,
      bottom: DRIVE_LAMP.bottom,
      top: DRIVE_LAMP.top - HAIRLINE
    },
    lens = buildOnBezel(outline, [-face, face + LENS_THICKNESS])

  return { name: "drive-lamp", shape: lens.translate(CENTRING), material: LAMP }
}

function buildPowerLamp() {
  const rear = DEPTH - POWER_LAMP.fromRear,
    top = REAR_STRIP_HEIGHT - LENS_SET_BACK + HAIRLINE,
    lens = makeBox(
      [POWER_LAMP.left, rear - POWER_LAMP.depth, top - LENS_THICKNESS],
      [POWER_LAMP.right, rear, top]
    )

  return { name: "power-lamp", shape: lens.translate(CENTRING), material: LAMP }
}

function buildFeet() {
  const feet = []

  for (const place of FOOT_PLACES) {
    const base = [place.middle, DEPTH - place.fromRear, -FOOT.height],
      foot = makeCylinder(FOOT.diameter / 2, FOOT.height, base)

    feet.push(foot)
  }

  const standing = makeCompound(feet)

  return { name: "feet", shape: standing.translate(CENTRING), material: FOOT_RUBBER }
}

function buildInterior() {
  const cavity = buildVentCavity(HAIRLINE)

  return { name: "interior", shape: cavity.translate(CENTRING), material: INTERIOR }
}

function topOf(width, depth, height) {
  const sideRun = height * tangent(SIDE_WALL_ANGLE),
    frontRun = height * tangent(FRONT_WALL_ANGLE),
    rearRun = height * tangent(REAR_WALL_ANGLE)

  return {
    left: sideRun - width / 2,
    right: width / 2 - sideRun,
    front: frontRun - depth / 2,
    rear: depth / 2 - rearRun
  }
}

function buildCapBody(width, depth, height) {
  const top = topOf(width, depth, height),
    base = drawRectangle(width, depth).sketchOnPlane("XY"),
    lid = drawRectangle(top.right - top.left, top.rear - top.front)
      .translate(0, (top.front + top.rear) / 2)
      .sketchOnPlane("XY", height)

  return base.loftWith(lid)
}

function buildDishedCap(width, depth, dishDepth) {
  const top = topOf(width, depth, CAP_HEIGHT),
    topWidth = top.right - top.left,
    radius = (topWidth ** 2 / 4 + dishDepth ** 2) / (2 * dishDepth),
    body = buildCapBody(width, depth, CAP_HEIGHT),
    dish = makeCylinder(radius, 2 * depth, [0, -depth, CAP_HEIGHT - dishDepth + radius], [0, 1, 0])

  return body.cut(dish)
}

function widthInKeys(width) {
  const whole = Math.floor(width),
    quarters = Math.round((width - whole) * 4)

  return `${whole}${QUARTERS[quarters]}`
}

function layKey(number, [left, row], [width, rows]) {
  const face = topOf(width * KEY_PITCH - CAP_GAP, rows * KEY_PITCH - CAP_GAP, CAP_HEIGHT),
    faceWidth = face.right - face.left,
    faceDepth = face.rear - face.front,
    axis = (left + width / 2) * KEY_PITCH,
    middle = (row + 0.5) * KEY_PITCH,
    rear = middle - face.rear,
    fromFront = DEPTH - KEY_BLOCK_REAR - middle,
    place = [
      KEY_BLOCK_LEFT + axis + CENTRING[0],
      fromFront + CENTRING[1],
      slopeHeightAt(fromFront) + CENTRING[2]
    ],
    legend = [
      (axis - faceWidth / 2) / LEGEND_ATLAS_WIDTH,
      rear / LEGEND_ATLAS_DEPTH,
      faceWidth / LEGEND_ATLAS_WIDTH,
      faceDepth / LEGEND_ATLAS_DEPTH
    ]

  return { number, width, place, face, legend, printedAt: [axis, rear] }
}

function layKeys() {
  const laid = []

  for (const [row, keys] of KEY_ROWS.entries()) {
    for (const [number, left, width = 1] of keys) {
      const key = layKey(number, [left, row], [width, 1])

      laid.push(key)
    }
  }

  return laid
}

function buildKeycaps(keys) {
  const keyWidths = keys.map(key => key.width),
    widths = new Set(keyWidths),
    keycaps = []

  for (const width of widths) {
    const spaceBar = width == SPACE_BAR_WIDTH,
      dishDepth = spaceBar ? SPACE_BAR_DISH_DEPTH : DISH_DEPTH,
      cap = buildDishedCap(width * KEY_PITCH - CAP_GAP, KEY_PITCH - CAP_GAP, dishDepth),
      name = `keycaps-${widthInKeys(width)}`,
      sameWidth = keys.filter(key => key.width == width),
      face = sameWidth[0].face

    keycaps.push({
      name,
      shape: cap,
      material: KEYCAP,
      face,
      tilt: SLOPE_ANGLE,
      legends: LEGENDS_PRINT,
      keys: sameWidth
    })
  }

  return keycaps
}

function buildReturnKey(returnKey) {
  const cap = buildDishedCap(
      RETURN_WIDTH * KEY_PITCH - CAP_GAP,
      RETURN_ROWS * KEY_PITCH - CAP_GAP,
      DISH_DEPTH
    ),
    lip = buildCapBody(
      RETURN_LIP_WIDTH * KEY_PITCH - CAP_GAP,
      KEY_PITCH - CAP_GAP,
      RETURN_LIP_HEIGHT
    ),
    lipOffset =
      (RETURN_LIP_LEFT + RETURN_LIP_WIDTH / 2 - RETURN_LEFT - RETURN_WIDTH / 2) * KEY_PITCH,
    shiftedLip = lip.translate([lipOffset, KEY_PITCH / 2, 0]),
    whole = cap.fuse(shiftedLip)

  return {
    name: "keycaps-RETURN",
    shape: whole,
    material: KEYCAP,
    face: returnKey.face,
    tilt: SLOPE_ANGLE,
    legends: LEGENDS_PRINT,
    keys: [returnKey]
  }
}

function fontSize(capHeight, capHeightPerEm = HEROS_CAP_HEIGHT) {
  return capHeight / capHeightPerEm
}

function drawLine([fromX, fromY], [toX, toY], thickness, colour) {
  return `<line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="${colour}" stroke-width="${thickness}"/>`
}

function drawRule(line, thickness, colour) {
  return drawLine([line.left, line.y], [line.right, line.y], thickness, colour)
}

function drawLeaningTitle(words, style) {
  const size = fontSize(style.capHeight, HEROS_CONDENSED_CAP_HEIGHT)

  return `<text transform="translate(${style.right} ${style.baseline}) skewX(${-TITLE_LEAN})" font-family="${HEROS_CONDENSED}" font-size="${size}" font-weight="700" text-anchor="end" textLength="${style.width}" lengthAdjust="spacingAndGlyphs">${words}</text>`
}

function drawHeading(words, style) {
  const size = fontSize(style.capHeight)

  return `<text x="${style.centre}" y="${style.baseline}" font-size="${size}" text-anchor="middle" textLength="${style.width}" lengthAdjust="spacing">${words}</text>`
}

function drawWave(wave) {
  const swing = (wave.height - wave.stroke) / 2,
    high = wave.y - swing,
    low = wave.y + swing,
    period = (wave.right - wave.left) / wave.cycles,
    steps = [`M ${wave.left} ${low}`]

  for (let cycle = 0; cycle < wave.cycles; cycle++) {
    const start = wave.left + cycle * period

    steps.push(`V ${high} H ${start + period / 2} V ${low} H ${start + period}`)
  }

  return `<path d="${steps.join(" ")}" fill="none" stroke="${PLATE_INK}" stroke-width="${wave.stroke}" stroke-linejoin="round"/>`
}

function drawKeyShape(map, left, width, row, rows) {
  const inset = LINE_THICKNESS / 2,
    x = map.left + left * map.keyWidth + inset,
    y = map.top + row * map.keyDepth + inset

  return `<rect x="${x}" y="${y}" width="${width * map.keyWidth - LINE_THICKNESS}" height="${rows * map.keyDepth - LINE_THICKNESS}" rx="${map.radius}" fill="${PLATE.colour}"/>`
}

function drawKeyNumber(map, number, left, width, row) {
  const x = map.left + (left + width / 2) * map.keyWidth,
    baseline = map.top + (row + 0.5) * map.keyDepth + map.capHeight / 2,
    size = fontSize(map.capHeight)

  return `<text x="${x}" y="${baseline}" font-size="${size}" font-weight="700" text-anchor="middle">${number}</text>`
}

function drawKeyMap(map) {
  const inset = LINE_THICKNESS / 2,
    across = KEY_BLOCK_KEYS_ACROSS * map.keyWidth + LINE_THICKNESS,
    down = KEY_BLOCK_ROWS * map.keyDepth + LINE_THICKNESS,
    returnTopRow = RETURN_ROW - 0.5,
    returnLip = drawKeyShape(map, RETURN_LIP_LEFT, RETURN_LIP_WIDTH, returnTopRow, 1),
    returnCap = drawKeyShape(map, RETURN_LEFT, RETURN_WIDTH, returnTopRow, 2),
    returnNumber = drawKeyNumber(
      map,
      RETURN_NUMBER,
      RETURN_LIP_LEFT,
      RETURN_LIP_WIDTH,
      returnTopRow
    ),
    drawn = [
      `<rect x="${map.left - inset}" y="${map.top - inset}" width="${across}" height="${down}" fill="${PLATE_INK}"/>`,
      returnLip,
      returnCap,
      returnNumber
    ]

  for (const [row, keys] of KEY_ROWS.entries()) {
    for (const [number, left, width = 1] of keys) {
      const shape = drawKeyShape(map, left, width, row, 1),
        label = drawKeyNumber(map, number, left, width, row)

      drawn.push(shape, label)
    }
  }

  return drawn.join("\n")
}

function drawColourChart(chart) {
  const size = fontSize(chart.capHeight),
    columnLefts = [chart.left, ...chart.columnRules],
    headingRule = drawLine(
      [chart.left, chart.headingRule],
      [chart.right, chart.headingRule],
      LINE_THICKNESS,
      PLATE_INK
    ),
    drawn = [
      `<rect x="${chart.left}" y="${chart.top}" width="${chart.right - chart.left}" height="${chart.bottom - chart.top}" fill="none" stroke="${PLATE_INK}" stroke-width="${LINE_THICKNESS}"/>`,
      headingRule
    ]

  for (const column of chart.columnRules) {
    const columnRule = drawLine(
      [column, chart.headingRule],
      [column, chart.bottom],
      LINE_THICKNESS,
      PLATE_INK
    )

    drawn.push(columnRule)
  }

  for (const [number, name] of COLOUR_NAMES.entries()) {
    const column = Math.floor(number / chart.rowsPerColumn),
      row = number % chart.rowsPerColumn,
      numberLeft = columnLefts[column] + chart.numberInset,
      baseline = chart.firstRow + row * chart.rowPitch + chart.capHeight / 2

    drawn.push(
      `<text x="${numberLeft}" y="${baseline}" font-size="${size}" font-weight="700">${number}</text>`,
      `<text transform="translate(${numberLeft + chart.nameInset} ${baseline}) scale(${chart.nameNarrowing} 1)" font-size="${size}" font-weight="700">${name}</text>`
    )
  }

  return drawn.join("\n")
}

function drawDrivePlate() {
  const title = drawLeaningTitle(PLATE_WORDS.title, PLATE_LAYOUT.title),
    redRule = drawRule(PLATE_LAYOUT.redRule, RULE_THICKNESS, PLATE_RED),
    keyNumbersHeading = drawHeading(PLATE_WORDS.keyNumbers, PLATE_LAYOUT.keyNumbersHeading),
    wave = drawWave(PLATE_LAYOUT.wave),
    upperHairline = drawRule(PLATE_LAYOUT.upperHairline, HAIRLINE_THICKNESS, PLATE_INK),
    keyMap = drawKeyMap(PLATE_LAYOUT.keyMap),
    lowerHairline = drawRule(PLATE_LAYOUT.lowerHairline, HAIRLINE_THICKNESS, PLATE_INK),
    greenRule = drawRule(PLATE_LAYOUT.greenRule, RULE_THICKNESS, PLATE_GREEN),
    colourChart = drawColourChart(PLATE_LAYOUT.chart),
    colourChartHeading = drawHeading(PLATE_WORDS.colourChart, PLATE_LAYOUT.chartHeading),
    blueRule = drawRule(PLATE_LAYOUT.blueRule, RULE_THICKNESS, PLATE_BLUE),
    model = drawLeaningTitle(PLATE_WORDS.model, PLATE_LAYOUT.model)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ARTWORK_WIDTH}" height="${ARTWORK_DEPTH}" viewBox="0 0 ${ARTWORK_WIDTH} ${ARTWORK_DEPTH}" font-family="${HEROS}" fill="${PLATE_INK}">`,
    `<rect width="${ARTWORK_WIDTH}" height="${ARTWORK_DEPTH}" fill="${PLATE.colour}"/>`,
    title,
    redRule,
    keyNumbersHeading,
    wave,
    upperHairline,
    keyMap,
    lowerHairline,
    greenRule,
    colourChart,
    colourChartHeading,
    blueRule,
    model,
    "</svg>"
  ].join("\n")
}

function escapeXml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

function drawCharacter(character, place, x = 0) {
  const size = fontSize(place.capHeight),
    escaped = escapeXml(character)

  return `<text x="${x}" y="${place.baseline}" font-size="${size}" text-anchor="middle">${escaped}</text>`
}

function drawLetter(letter) {
  return drawCharacter(letter, LETTER)
}

function drawPair(upper, lower) {
  return drawCharacter(upper, UPPER) + drawCharacter(lower, LOWER)
}

function drawWord(word, place = WORD) {
  const size = fontSize(place.capHeight)

  return `<text y="${place.baseline}" font-size="${size}" font-weight="700" text-anchor="middle">${word}</text>`
}

function drawLines(lines) {
  const size = fontSize(WORD.capHeight),
    drawn = []

  for (const [index, line] of lines.entries()) {
    drawn.push(
      `<text x="${LINES_LEFT}" y="${LINE_BASELINES[index]}" font-size="${size}" font-weight="700">${line}</text>`
    )
  }

  return drawn.join("")
}

function drawArrow(arrow, [x, y], degrees) {
  const tip = -arrow.length / 2,
    tail = arrow.length / 2,
    neck = tip + arrow.headLength,
    head = arrow.headWidth / 2,
    shaft = arrow.shaft / 2

  return `<path transform="translate(${x} ${y}) rotate(${degrees})" d="M 0 ${tip} L ${head} ${neck} H ${shaft} V ${tail} H ${-shaft} V ${neck} H ${-head} Z"/>`
}

function drawHeavyArrow(direction) {
  return drawArrow(HEAVY_ARROW, [0, LEGEND_MIDDLE], ARROW_TURNS[direction])
}

function drawThinArrow() {
  const middle = LOWER.baseline - THIN_ARROW.length / 2

  return drawArrow(THIN_ARROW, [0, middle], ARROW_TURNS.up)
}

function drawDelete(word) {
  const left = -DELETE_WIDTH / 2,
    arrowMiddle = left + DELETE_ARROW.length / 2,
    wordLeft = left + DELETE_ARROW.length + DELETE_GAP,
    wordWidth = DELETE_WIDTH / 2 - wordLeft,
    size = fontSize(WORD.capHeight),
    arrow = drawArrow(DELETE_ARROW, [arrowMiddle, LEGEND_MIDDLE], ARROW_TURNS.left)

  return `${arrow}<text x="${wordLeft}" y="${WORD.baseline}" font-size="${size}" font-weight="700" textLength="${wordWidth}" lengthAdjust="spacingAndGlyphs">${word}</text>`
}

function drawBars(bars) {
  const drawn = bars.tops.map(
    top =>
      `<rect x="${-bars.width / 2}" y="${top}" width="${bars.width}" height="${bars.thickness}"/>`
  )

  return drawn.join("")
}

function drawBracket(bracket) {
  const inset = BRACKET.stroke / 2,
    arms = (BRACKET_ARMS[bracket] * BRACKET.width) / 2,
    back = -BRACKET_ARMS[bracket] * (BRACKET.width / 2 - inset),
    top = LOWER.baseline - BRACKET.height + inset,
    bottom = LOWER.baseline - inset

  return `<path d="M ${arms} ${top} H ${back} V ${bottom} H ${arms}" fill="none" stroke="${LEGEND_INK}" stroke-width="${BRACKET.stroke}"/>`
}

function drawSlant(slant) {
  const reach = (SLANT_LEANS[slant] * SLANT.side) / 2

  return drawLine(
    [-reach, LOWER.baseline],
    [reach, LOWER.baseline - SLANT.side],
    SLANT.stroke,
    LEGEND_INK
  )
}

function drawSlashedZero(place, x = 0) {
  const zero = drawCharacter("0", place, x),
    reach = place.capHeight * SLASH.reach,
    stroke = place.capHeight * SLASH.stroke,
    slash = drawLine(
      [x - reach, place.baseline],
      [x + reach, place.baseline - place.capHeight],
      stroke,
      LEGEND_INK
    )

  return zero + slash
}

function drawPeseta() {
  const small = { capHeight: UPPER.capHeight * PESETA_T.height, baseline: UPPER.baseline },
    offset = UPPER.capHeight * PESETA_T.offset

  return drawCharacter("P", UPPER) + drawCharacter("t", small, offset)
}

// A cubic whose controls stand a third of the way along its chord, pulled to either side of it, swings from crest to trough 1/√3 of the pull.
function drawEnye() {
  const reach = (TILDE.width - TILDE.stroke) / 2,
    middle = TILDE.top + TILDE.height / 2,
    pull = Math.sqrt(3) * (TILDE.height - TILDE.stroke),
    letter = drawCharacter("N", ENYE)

  return `${letter}<path d="M ${-reach} ${middle} C ${-reach / 3} ${middle - pull} ${reach / 3} ${middle + pull} ${reach} ${middle}" fill="none" stroke="${LEGEND_INK}" stroke-width="${TILDE.stroke}" stroke-linecap="round"/>`
}

function drawLeaningF() {
  const size = fontSize(KEYPAD.capHeight),
    middle = KEYPAD.baseline - KEYPAD.capHeight / 2

  return `<text transform="translate(${-KEYPAD_APART / 2} ${middle}) skewX(${-KEYPAD_LEAN})" y="${KEYPAD.capHeight / 2}" font-size="${size}" text-anchor="middle">f</text>`
}

function drawFunctionKey(digit) {
  return drawLeaningF() + drawCharacter(digit, KEYPAD, KEYPAD_APART / 2)
}

function drawKeypadZero() {
  return drawLeaningF() + drawSlashedZero(KEYPAD, KEYPAD_APART / 2)
}

const LEGENDS = new Map([
  [66, drawWord("ESC")],
  [64, drawPair("!", "1")],
  [65, drawPair('"', "2")],
  [57, drawPair("#", "3")],
  [56, drawPair("$", "4")],
  [49, drawPair("%", "5")],
  [48, drawPair("&", "6")],
  [41, drawPair("'", "7")],
  [40, drawPair("(", "8")],
  [33, drawPair(")", "9")],
  [32, drawBars(UNDERSCORE) + drawSlashedZero(LOWER)],
  [25, drawBars(EQUALS) + drawBars(MINUS)],
  [24, drawPeseta() + drawThinArrow()],
  [16, drawWord("CLR")],
  [79, drawDelete("BORR")],
  [10, drawFunctionKey("7")],
  [11, drawFunctionKey("8")],
  [3, drawFunctionKey("9")],
  [68, drawWord("TAB")],
  [67, drawLetter("Q")],
  [59, drawLetter("W")],
  [58, drawLetter("E")],
  [50, drawLetter("R")],
  [51, drawLetter("T")],
  [43, drawLetter("Y")],
  [42, drawLetter("U")],
  [35, drawLetter("I")],
  [34, drawLetter("O")],
  [27, drawLetter("P")],
  [26, drawBars(BROKEN_BAR) + drawCharacter("@", LOWER)],
  [17, drawCharacter("*", UPPER) + drawBracket("[")],
  [18, drawWord("RETURN", RETURN_LEGEND)],
  [20, drawFunctionKey("4")],
  [12, drawFunctionKey("5")],
  [4, drawFunctionKey("6")],
  [70, drawLines(["FIJA", "MAYS"])],
  [69, drawLetter("A")],
  [60, drawLetter("S")],
  [61, drawLetter("D")],
  [53, drawLetter("F")],
  [52, drawLetter("G")],
  [44, drawLetter("H")],
  [45, drawLetter("J")],
  [37, drawLetter("K")],
  [36, drawLetter("L")],
  [29, drawEnye()],
  [28, drawPair(":", ";")],
  [19, drawCharacter("+", UPPER) + drawBracket("]")],
  [13, drawFunctionKey("1")],
  [14, drawFunctionKey("2")],
  [5, drawFunctionKey("3")],
  [21, drawWord("MAYS")],
  [71, drawLetter("Z")],
  [63, drawLetter("X")],
  [62, drawLetter("C")],
  [55, drawLetter("V")],
  [54, drawLetter("B")],
  [46, drawLetter("N")],
  [38, drawLetter("M")],
  [39, drawCharacter("<", UPPER) + drawCharacter(",", COMMA)],
  [31, drawCharacter(">", UPPER) + drawBars(FULL_STOP)],
  [30, drawCharacter("?", UPPER) + drawSlant("/")],
  [22, drawCharacter("`", UPPER) + drawSlant("\\")],
  [15, drawKeypadZero()],
  [0, drawHeavyArrow("up")],
  [7, drawBars(DOT)],
  [23, drawWord("CONTROL")],
  [9, drawWord("COPIA")],
  [47, ""],
  [6, drawWord("INTRO")],
  [8, drawHeavyArrow("left")],
  [2, drawHeavyArrow("down")],
  [1, drawHeavyArrow("right")]
])

function drawLegends(keys) {
  const drawn = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${LEGEND_ATLAS_WIDTH}" height="${LEGEND_ATLAS_DEPTH}" viewBox="0 0 ${LEGEND_ATLAS_WIDTH} ${LEGEND_ATLAS_DEPTH}" font-family="${HEROS}" fill="${LEGEND_INK}">`
  ]

  for (const key of keys) {
    const [axis, rear] = key.printedAt,
      legend = LEGENDS.get(key.number)

    drawn.push(`<g transform="translate(${axis} ${rear})">${legend}</g>`)
  }

  drawn.push("</svg>")

  return drawn.join("\n")
}

function buildPlate(print, { left, right, rear, depth, bottom }, material) {
  const front = rear - depth,
    plate = makeBox([left, front, bottom], [right, rear, bottom + PLATE_THICKNESS]),
    face = {
      left: left + CENTRING[0],
      right: right + CENTRING[0],
      front: front + CENTRING[1],
      rear: rear + CENTRING[1]
    }

  return { name: print, shape: plate.translate(CENTRING), material, face, print }
}

function drawPolygon(corners, colour) {
  const points = corners.map(([x, y]) => `${x},${y}`)

  return `<polygon points="${points.join(" ")}" fill="${colour}"/>`
}

function drawFittedWord(fitted, family, capHeightPerEm, ink) {
  const size = fontSize(fitted.capHeight, capHeightPerEm)

  return `<text x="${fitted.left}" y="${fitted.baseline}" font-family="${family}" font-size="${size}" font-weight="700" fill="${ink}" textLength="${fitted.width}" lengthAdjust="spacingAndGlyphs">${fitted.word}</text>`
}

function drawNameplateWord({ word, left, width }) {
  const size = fontSize(NAMEPLATE_ART.capHeight, HEROS_CONDENSED_CAP_HEIGHT),
    slant = NAMEPLATE_ART.capHeight * tangent(NAMEPLATE_ART.lean),
    length = width - slant

  return `<text transform="translate(${left} ${NAMEPLATE_ART.baseline}) skewX(${-NAMEPLATE_ART.lean})" font-family="${HEROS_CONDENSED}" font-size="${size}" font-weight="700" fill="${NAMEPLATE_INK}" textLength="${length}" lengthAdjust="spacingAndGlyphs">${word}</text>`
}

function drawNameplate() {
  const width = NAMEPLATE.right - NAMEPLATE.left,
    { box } = NAMEPLATE_ART,
    logo = drawFittedWord(
      NAMEPLATE_ART.logo,
      HEROS_CONDENSED,
      HEROS_CONDENSED_CAP_HEIGHT,
      NAMEPLATE_LOGO_INK
    ),
    gap = drawPolygon(NAMEPLATE_ART.gap, NAMEPLATE_BACKING.colour),
    words = NAMEPLATE_ART.words.map(drawNameplateWord)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${NAMEPLATE.depth}" viewBox="0 0 ${width} ${NAMEPLATE.depth}">`,
    `<rect width="${width}" height="${NAMEPLATE.depth}" fill="${NAMEPLATE_BACKING.colour}"/>`,
    `<rect x="${box.left}" y="${box.top}" width="${box.right - box.left}" height="${box.bottom - box.top}" fill="${NAMEPLATE_BOX}"/>`,
    gap,
    logo,
    ...words,
    "</svg>"
  ].join("\n")
}

function drawStripes(stripes) {
  const drawn = []

  for (const [index, offset] of stripes.offsets.entries()) {
    const corners = [
        [stripes.topLeft + offset, stripes.top],
        [stripes.topLeft + offset + stripes.width, stripes.top],
        [stripes.bottomLeft + offset + stripes.width, stripes.bottom],
        [stripes.bottomLeft + offset, stripes.bottom]
      ],
      ink = BADGE_INKS[index],
      stripe = drawPolygon(corners, ink)

    drawn.push(stripe)
  }

  return drawn.join("\n")
}

function drawBadge() {
  const width = BADGE.right - BADGE.left,
    stripes = drawStripes(BADGE_ART.stripes),
    word = drawFittedWord(BADGE_ART.word, HEROS, HEROS_CAP_HEIGHT, BADGE_INK)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${BADGE.depth}" viewBox="0 0 ${width} ${BADGE.depth}">`,
    `<rect width="${width}" height="${BADGE.depth}" fill="${BADGE_BACKING.colour}"/>`,
    stripes,
    word,
    "</svg>"
  ].join("\n")
}

function buildDrivePlate() {
  const left = DRIVE_SECTION_LEFT + (DRIVE_SECTION_WIDTH - PLATE_WIDTH) / 2,
    outline = {
      left,
      right: left + PLATE_WIDTH,
      rear: DEPTH - PLATE_FROM_REAR,
      depth: PLATE_DEPTH,
      bottom: DRIVE_SECTION_HEIGHT
    }

  return buildPlate(DRIVE_PLATE_PRINT, outline, PLATE)
}

function buildRearStripPlate(print, plate, material) {
  const outline = {
    left: plate.left,
    right: plate.right,
    rear: DEPTH - plate.fromRear,
    depth: plate.depth,
    bottom: REAR_STRIP_HEIGHT - PLATE_THICKNESS
  }

  return buildPlate(print, outline, material)
}

function buildBadge() {
  const badge = buildRearStripPlate(BADGE_PRINT, BADGE, BADGE_BACKING),
    window = buildPowerLampWindow(),
    placed = window.translate(CENTRING),
    pierced = badge.shape.cut(placed)

  return { ...badge, shape: pierced }
}

export function buildCpc6128() {
  const keys = layKeys(),
    returnKey = layKey(RETURN_NUMBER, [RETURN_LEFT, RETURN_ROW], [RETURN_WIDTH, RETURN_ROWS]),
    cabinet = buildCabinet(),
    drive = buildDrive(),
    keycaps = buildKeycaps(keys),
    returnKeycap = buildReturnKey(returnKey),
    drivePlate = buildDrivePlate(),
    nameplate = buildRearStripPlate(NAMEPLATE_PRINT, NAMEPLATE, NAMEPLATE_BACKING),
    badge = buildBadge(),
    drivePlatePrint = drawDrivePlate(),
    legendsPrint = drawLegends([...keys, returnKey]),
    nameplatePrint = drawNameplate(),
    badgePrint = drawBadge()

  return {
    parts: [
      { name: "cabinet", shape: cabinet.translate(CENTRING), material: CABINET },
      buildFeet(),
      buildInterior(),
      { name: "drive", shape: drive.translate(CENTRING), material: BEZEL },
      buildEjectButton(),
      buildDriveLamp(),
      ...keycaps,
      returnKeycap,
      drivePlate,
      nameplate,
      badge,
      buildPowerLamp()
    ],
    prints: [
      { name: DRIVE_PLATE_PRINT, language: LANGUAGE, svg: drivePlatePrint, pixels: PLATE_PIXELS },
      { name: LEGENDS_PRINT, language: LANGUAGE, svg: legendsPrint, pixels: LEGEND_PIXELS },
      { name: NAMEPLATE_PRINT, language: LANGUAGE, svg: nameplatePrint, pixels: PLATE_PIXELS },
      { name: BADGE_PRINT, language: LANGUAGE, svg: badgePrint, pixels: PLATE_PIXELS }
    ]
  }
}
