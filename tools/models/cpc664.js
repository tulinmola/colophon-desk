import {
  draw,
  drawCircle,
  drawRectangle,
  drawRoundedRectangle,
  makeBox,
  makeCompound,
  makeCylinder,
  makeSphere
} from "replicad"
import buildCl1 from "./cl1.js"
import buildCordDc from "./cord_dc.js"
import drawSchneiderMark from "./schneider.js"

// x runs from the left end, y back from the front and z up from the cabinet bottom's base, in millimetres. The feet stand below it, under a negative z.
// What lies on the slope is laid out in the slope's own plane: across as x, and up the slope from the line where its plane would meet the front, as it is built.

// "DIMENSIONS (mm): w h d — Keyboard : 580 70 170" [A], CPC664 Service Manual, its technical specification, the row Amstrad printed for the 464 too: https://archive.org/details/amstrad-cpc-664-service-manual
// A UK unit's photograph, its camera fitted to thirty legends on their 19.05 grid and rectified plane by plane, puts the case's ends 569.7 apart at its top edges, ±3, and its top 169.7 to 170.7 deep from the rear top edge to the keyboard's front top edge, below which the front projects a further 7.9 [E]: https://commons.wikimedia.org/wiki/File:Ordinateur_Amstrad_CPC664_(51257567263).jpg
// Against that, a photograph of a 664 from above beside a 6128, fitted along its number row and calibrated on the 6128's 510, gives 575 to 582 [E], https://commons.wikimedia.org/wiki/File:Schneider_CPC_664_und_CPC_6128_(54853121982).jpg, and a rear photograph fitted to the sockets the service manual's board drawing places 562 ±6 [E]. No museum records a 664's size; 570 is taken, and the disagreements stand until a real unit is measured.
const WIDTH = 570,
  DEPTH = 177.6

// Traced from a square-on photograph of a Schneider 664's right end, the drive housing's, scaled by the housing top's 170 that the UK unit's photograph measures, its heights above the cabinet bottom's base [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html. No photograph shows the left end square; the UK unit's and another's place the left end's outline on the same lines within 1 to 2 and 0.5° [E].
// The cabinets part 23.6 up, level. Above it the front stands upright 0.8 back to 24.9, then bevels back at 62° to the keyboard's front top edge, 7.9 back and 39.0 up, rounding a little into it, from which the housing's face rises straight; the bevel is drawn straight to the edge. The top falls to that edge at 8.5°, ±0.4 across four readings, from the slope's rear end 155.3 back, where a step rises at 65° to the level top of the rear strip and the housing, 66.5 up, 66.1 to 66.8 read along it. The rear face is upright.
const PARTING_HEIGHT = 23.6,
  CHIN_FOOT = [0.8, 24.9],
  FRONT_EDGE = [7.9, 39.0],
  TOP_ANGLE = 8.5,
  STEP_FOOT = 155.3,
  STEP_RISE = 65,
  PLATEAU_HEIGHT = 66.5

// The cabinet bottom's front stands flush from the parting line, rounding about 3.8 under to 12.3 up and 3.8 back; below it the base is recessed, its face falling back to 10.5 at the foot, as read on the same end [E]. Its rear stands flush lower, to about 6 up on a square-on photograph of the same unit's rear on the same page, its edge rounding under on the end to the base 8.5 in [E]; the front's rounding is taken for it.
const FRONT_BAND = { foot: 12.3, recessTop: 7.6, recessFoot: 10.5 },
  REAR_BAND = { foot: 6, recessTop: 4, recessFoot: 8.5 },
  BAND_ROUND = 3.8

// Round pads about 8 across, read on a photograph of the underside at about 5 pixels to the millimetre, at each end and the middle [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html. The front left one, read at 11.8 from the front, would hang past the recessed base, and is taken in line with the others at 15.8. Their height is not read and 1 is taken.
const FOOT = { diameter: 8, height: 1 },
  FOOT_PLACES = [
    { middle: 29.6, fromFront: 15.8 },
    { middle: 285.2, fromFront: 15.8 },
    { middle: 545.4, fromFront: 15.8 },
    { middle: 32.5, fromFront: 153.8 },
    { middle: 285.2, fromFront: 156.8 },
    { middle: 541.4, fromFront: 158.8 }
  ]

// The drive housing rises from the slope at 466.4 to the right end, its face over the keyboard's front top edge, on the UK unit's rectified photograph [E]. Its edges and the case's corners in plan are not read; 1.5 and 3 are taken, and the slope's edges are left sharp.
const HOUSING_LEFT = 466.4,
  HOUSING_EDGE_RADIUS = 1.5,
  PLAN_RADIUS = 3

const RADIANS = Math.PI / 180,
  SLOPE = Math.tan(TOP_ANGLE * RADIANS),
  COSINE = Math.cos(TOP_ANGLE * RADIANS),
  SINE = Math.sin(TOP_ANGLE * RADIANS),
  FRONT_LINE = FRONT_EDGE[1] - SLOPE * FRONT_EDGE[0],
  HOUSING_FACE = FRONT_EDGE[0]

// The keys stand on a 19.05 grid, the 464's key for key in the main block [D], https://github.com/Bread80/CPC_Keyboards, with the 464's keypad and, where the 464 has its cross, a square of four cursor keys around COPY sharing one opening with the keypad [E].
// ESC's cell's left edge stands 40.4 from the left end and the number row's rear edge 109.4 up the slope, derived by centring the keys in the openings the rectified photograph measures: across, 39.96 in the main opening and 40.85 in the other; up the slope, between the openings' fronts and the other's rear, which reads anywhere from 145.1 to 153.0, so ±2. Read off the legends instead, they stand at 42.2 and 107.0, the keys standing higher than the openings' plane by a height taken at 10 [E].
const KEY_PITCH = 19.05,
  KEY_GRID_LEFT = 40.4,
  KEY_GRID_REAR = 109.4

// Every key by its number in the firmware's key matrix [A], SOFT 968 Appendix I, https://archive.org/details/SOFT968TheAmstrad6128FirmwareManual, with its cell's left edge and row in keys from ESC's and its width in keys, the 464's main block and keypad, which photographs of the 664 measure to the same widths [E].
// Light blue are ESC, TAB, CAPS LOCK, both SHIFTs, CTRL, DEL, ENTER, the keypad's ENTER and the four cursor keys, the rest light grey, on UK units [E]: https://commons.wikimedia.org/wiki/File:Amstrad_CPC_664_with_colour_monitor.jpg and the Rouen unit. Schneider's had beige where these are blue [D], https://commons.wikimedia.org/wiki/File:Schneider_CPC_664_und_CPC_6128_(54853121982).jpg, and are drawn with the UK's colours: a colour that changes with the version is not drawn.
const KEYS = [
  { number: 66, left: 0, row: 0, colour: "blue" },
  { number: 64, left: 1, row: 0 },
  { number: 65, left: 2, row: 0 },
  { number: 57, left: 3, row: 0 },
  { number: 56, left: 4, row: 0 },
  { number: 49, left: 5, row: 0 },
  { number: 48, left: 6, row: 0 },
  { number: 41, left: 7, row: 0 },
  { number: 40, left: 8, row: 0 },
  { number: 33, left: 9, row: 0 },
  { number: 32, left: 10, row: 0 },
  { number: 25, left: 11, row: 0 },
  { number: 24, left: 12, row: 0 },
  { number: 16, left: 13, row: 0 },
  { number: 79, left: 14, row: 0, width: 1.5, colour: "blue" },
  { number: 68, left: 0, row: 1, width: 1.5, colour: "blue" },
  { number: 67, left: 1.5, row: 1 },
  { number: 59, left: 2.5, row: 1 },
  { number: 58, left: 3.5, row: 1 },
  { number: 50, left: 4.5, row: 1 },
  { number: 51, left: 5.5, row: 1 },
  { number: 43, left: 6.5, row: 1 },
  { number: 42, left: 7.5, row: 1 },
  { number: 35, left: 8.5, row: 1 },
  { number: 34, left: 9.5, row: 1 },
  { number: 27, left: 10.5, row: 1 },
  { number: 26, left: 11.5, row: 1 },
  { number: 17, left: 12.5, row: 1 },
  { number: 70, left: 0, row: 2, width: 1.75, colour: "blue" },
  { number: 69, left: 1.75, row: 2 },
  { number: 60, left: 2.75, row: 2 },
  { number: 61, left: 3.75, row: 2 },
  { number: 53, left: 4.75, row: 2 },
  { number: 52, left: 5.75, row: 2 },
  { number: 44, left: 6.75, row: 2 },
  { number: 45, left: 7.75, row: 2 },
  { number: 37, left: 8.75, row: 2 },
  { number: 36, left: 9.75, row: 2 },
  { number: 29, left: 10.75, row: 2 },
  { number: 28, left: 11.75, row: 2 },
  { number: 19, left: 12.75, row: 2 },
  { number: 21, left: 0, row: 3, width: 2.25, colour: "blue" },
  { number: 71, left: 2.25, row: 3 },
  { number: 63, left: 3.25, row: 3 },
  { number: 62, left: 4.25, row: 3 },
  { number: 55, left: 5.25, row: 3 },
  { number: 54, left: 6.25, row: 3 },
  { number: 46, left: 7.25, row: 3 },
  { number: 38, left: 8.25, row: 3 },
  { number: 39, left: 9.25, row: 3 },
  { number: 31, left: 10.25, row: 3 },
  { number: 30, left: 11.25, row: 3 },
  { number: 22, left: 12.25, row: 3 },
  { number: 21, left: 13.25, row: 3, width: 2.25, colour: "blue" },
  { number: 47, left: 3.25, row: 4, width: 9 },
  { number: 23, left: 12.25, row: 4, colour: "blue" },
  { number: 10, left: 16.5, row: 1 },
  { number: 11, left: 17.5, row: 1 },
  { number: 3, left: 18.5, row: 1 },
  { number: 20, left: 16.5, row: 2 },
  { number: 12, left: 17.5, row: 2 },
  { number: 4, left: 18.5, row: 2 },
  { number: 13, left: 16.5, row: 3 },
  { number: 14, left: 17.5, row: 3 },
  { number: 5, left: 18.5, row: 3 },
  { number: 15, left: 16.5, row: 4 },
  { number: 7, left: 17.5, row: 4 },
  { number: 6, left: 18.5, row: 4, colour: "blue" },
  { number: 9, left: 17.5, row: -1 }
]

// ENTER, key 18, is an inverted L over the second and third rows: 2 keys wide across the top from 13.5, 1.75 below from 13.75, sharing its right edge [D], https://github.com/Bread80/CPC_Keyboards, as on the 664 [E].
const RETURN_KEY = {
  number: 18,
  colour: "blue",
  arm: { left: 13.5, width: 2 },
  leg: { left: 13.75, width: 1.75, row: 1, rows: 2 }
}

// The cursor keys fill a square three keys wide from 16.5 across and from two rows above the number row to its foot, split along its diagonals around COPY [E]: up 0, left 8, down 2, right 1. Their tops fall toward COPY [E], https://commons.wikimedia.org/wiki/File:Amstrad_CPC_664_function_keypad.jpg; how far, and how tall they stand, is not measured: a bevel falling 20° over the inner half of each and the second row's height are taken.
const CURSOR_SQUARE = { left: 16.5, row: -2, keys: 3 },
  CURSOR_KEYS = [
    { number: 0, name: "up", turn: 0 },
    { number: 8, name: "left", turn: 90 },
    { number: 2, name: "down", turn: 180 },
    { number: 1, name: "right", turn: 270 }
  ],
  CURSOR_BEVEL = { share: 0.5, angle: 20 }

// The main block's opening is notched for the space bar's row, and the cursor keys and the keypad share the other, as the service manual's exploded view draws the top [A], CPC664 Service Manual p3. On the rectified photograph the main opening runs 38.2 to 337.0 across and the other 354.0 to 413.5, both from 12.64 up the slope, 4.7 behind the keyboard's front edge, and the other to 149.1 [E]. Centred so, the keys stand 1.5 clear of those edges, and the main opening's rear edge, hidden behind the keys, and the notch are taken as clear.
// No source gives how far below the top the floor under the keys lies; 8 is taken until a real unit is measured.
const MAIN_OPENING = { left: 38.2, right: 337, front: 12.64 },
  CURSOR_OPENING = { left: 354, right: 413.5, front: 12.64, rear: 149.1 },
  KEY_CLEARANCE = 1.5,
  FLOOR_BELOW_TOP = 8

// Caps made to fit the 664's keyboard, of its number row and its QWERTY row, measured here [D, E], https://archive.org/details/thingiverse-4766209: each on an 18.00 base, its top standing in from the base's front, rear and sides by these, and its middle line standing this high at the top's front and rear, the top dished across as a cylinder this deep. The tops rise toward the front, and the walls lean about 15° at the front and sides and 5° at the rear.
// No cap of the other rows, nor any wider than a key, has been measured: the QWERTY row's is taken for every row below it and for COPY and the cursor keys, and the wider caps are left undished.
// The keys stand about 10 above the case on the UK unit's photograph [E], as the QWERTY row's cap stands from its base, so their bases are taken level with the top.
const CAP_BASE = 18,
  CAP_GAP = KEY_PITCH - CAP_BASE,
  CAP_SUNK = 0,
  CAP_ROWS = [
    { front: 2.8, rear: 0.91, side: 2.93, frontHeight: 10.3, rearHeight: 10.03, dish: 0.74 },
    { front: 2.86, rear: 0.83, side: 2.74, frontHeight: 9.52, rearHeight: 8.27, dish: 0.7 }
  ]

// The nameplate lies in a recess across the slope above the main block, 37.3 to 336.1 across and 125.1 to 149.6 up the slope on the rectified photograph, the red lamp, an SLP-145B [A], CPC664 Service Manual p3, at 322.6 and 142.6, its lens about 4.5 across [E]. The recess's depth is not measured and is taken at the plate's thickness; how far the lens stands proud is not measured either, and half its width is taken.
const BADGE = { left: 37.3, right: 336.1, front: 125.1, rear: 149.6 },
  POWER_LAMP = { middle: 322.6, along: 142.6, diameter: 4.5 },
  PLATE_THICKNESS = 0.3

// The drive plate, 92 by 136, recreated at its own size [D], https://oldwiki.cpcwiki.eu/index.php/File:Amstrad_cpc_664_plate.png, which the rectified photograph confirms, 91.9 by 136.3, standing 471.1 across and 12.1 back from the front [E]. It lies in a recess its own thickness deep.
const DRIVE_PLATE = { left: 471.1, front: 12.1, width: 92, depth: 136 }

// The housing's opening is as wide as a part made to fit it, 95 [D], https://www.printables.com/model/1269141, centred on the housing, from where the chin's bevel meets the housing's face to 3.5 below the top, by eye on a photograph of a UK unit's front [E]: https://commons.wikimedia.org/wiki/File:Amstrad_CPC_664_with_colour_monitor.jpg
// The drive is the EME-150A [A], CPC664 Service Manual p3, its bezel 35 tall with the slot 81 long and its middle 21 above the bezel's foot [A], https://www.cpcwiki.eu/index.php/File:Panasonic-3_inch_Floppy_Drive_EME-150.pdf. On the photograph the slot stands 11.5 above the opening's foot, so the bezel's lowest 9.5 stand hidden behind the chin.
// On a photograph of the front, by the slot's own 81: a finger's bevel 32 wide centred on the slot, reaching below it; the lamp's window 5.4 across, 39 left of the slot's middle; the eject button about 17 across, ribbed, 29 right of it; a notch above the slot's right end [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html. Their heights above the opening's foot are read by eye on the UK photograph; the slot's height, the bevels' reach, the eject recess's width, the recesses' depths, the ribs and the notch's place and size are the 6128's, whose drive's front the same photographs find alike.
const DRIVE_OPENING = { width: 95, topBelowPlateau: 3.5 },
  DRIVE_LENGTH = 152,
  BEZEL_SET_BACK = 2,
  BEZEL_HIDDEN = 9.5,
  SLOT = { length: 81, height: 5.2, middleAboveBezel: 21, depth: 10 },
  FINGER_BEVEL = { width: 32, below: 5, above: 1.2, angle: 45 },
  DRIVE_LAMP = { middle: -39, width: 5.4, bottom: 2.2, top: 4.6, depth: 1.1 },
  EJECT_RECESS = { middle: 29, width: 18.6, bottom: 0, top: 5.5, depth: 2 },
  EJECT_BUTTON = { width: 17, bottom: 0.5, top: 4.6, standing: -1 },
  EJECT_RIBS = { count: 4, pitch: 1, groove: 0.35, depth: 0.3 },
  DRIVE_NOTCH = { middle: 37.9, width: 4.8, height: 3.7, depth: 2 },
  LENS_THICKNESS = 0.6

// The rear strip is slotted for the air through its rear top edge: 105 slots 2.4 wide at a 4.99 pitch, the first's middle 28.6 from the left end, running 4 onto the top and 10.5 down the rear face, and seven over the speaker, from the 77th, 30 down it, on a square-on photograph of the Schneider unit's rear scaled by its own ends to the case's width and by the rear face's height [E], https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html. The case's wall is not measured and 2.5 is taken; through the slots the inside of the case shows.
const VENTS = { first: 28.6, count: 105, pitch: 4.99, width: 2.4, onTop: 4, downRear: 10.5 },
  SPEAKER_SLOTS = { first: 76, count: 7, downRear: 30 },
  CASE_WALL = 2.5

// The cabinet bottom's recessed face is slotted along the front and the rear [E], on the same photographs; the slots' places are not read and the rear strip's are taken, each from the foot to 1 under the band.
const LOWER_VENTS = { foot: 1, belowBand: 1 }

// Every socket opens at the rear [A], CPC664 User Instructions, https://archive.org/details/amstrad-cpc664-user-manual: their middles across from the left end on the rear photograph, scaled as the vents are, ±2, where the service manual's board drawing set by a fit to the same photograph puts them within 3 but for the expansion's, 6.5 further right, and the second drive's, 9.7 [E]. Their sizes and depths below the parting line are read on it too: the edge connectors 81.5, 85.2 and 66.1 wide, 9.1 to 16.2 below; the DINs 15 across, the jack 6, the DC socket 9 square and the joystick's D 19 by 11.
// The sockets stand in panels recessed 1 into the case's rear, rising over the parting line 1.4, and behind the monitor's sockets and the tape's 15.5 and 18.3. The cord D.C. leaves between the DC socket and the expansion's [A], CPC664 Service Manual p3.
const DC_SOCKET = { kind: "box", middle: 364.6, width: 9, height: 9, below: 7 },
  MONITOR_SOCKET = { kind: "round", middle: 390.3, diameter: 15, below: 3.5 },
  TAPE_SOCKET = { kind: "round", middle: 91.1, diameter: 15, below: 0.7 },
  REAR_SOCKETS = [
    { kind: "round", middle: 36, diameter: 6, below: 7 },
    { kind: "box", middle: 61.7, width: 19, height: 11, below: 3.5 },
    TAPE_SOCKET,
    { kind: "edge", middle: 165.3, width: 81.5 },
    { kind: "edge", middle: 265.9, width: 85.2 },
    DC_SOCKET,
    MONITOR_SOCKET,
    { kind: "edge", middle: 464.2, width: 66.1 }
  ],
  REAR_PANELS = [
    { left: 48.5, right: 101.4, rise: 18.3 },
    { left: 338.6, right: 401.8, rise: 15.5 },
    { left: 20, right: 513, rise: 1.4 }
  ],
  EDGE_CONNECTOR = { top: 9.1, bottom: 16.2 },
  PANEL_DEPTH = 1

// The 12V DC cord, the 6128's own part as cord_dc.js gives it, leaves from a block in the monitor's panel 341.6 to 357 across and from 6.9 up to the parting line, its boot's middle 350.0 across and 19.7 up, ±2 and ±0.7, square-on on the rear photograph scaled by its 105 vent slots; and the boot is about 9.2 across at its root and tapers to about 6.8 over 16.4 straight back, read from below on the underside photograph at about 5 pixels to the millimetre [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html. How far the block stands proud is not measured, and 0.5 is taken. The boot's five grooves are not drawn.
// On the rear photograph the boot's outline reads 10.6 tall against its 9.2 across, and it is drawn round; and the sockets' middles read 2 to 4 lower than they are drawn here, the boot's 1.7 above the MONITOR socket's, where here it stands 0.4 below. The disagreements stand.
const CORD_BLOCK = { left: 341.6, right: 357, bottom: 6.9, standing: 0.5 },
  DC_CORD = { middle: 350, height: 19.7, diameter: 9.2, tipDiameter: 6.8, length: 16.4 },
  BOOT_ROOT = DEPTH - PANEL_DEPTH + CORD_BLOCK.standing

// The right end of the cabinet bottom holds a recessed panel 42.1 to 124.3 from the front and from 3.0 to 22.3 up, with the VOLUME wheel's window 55.2 to 77.5 back and 14.8 to 19.5 up, and the POWER slide's slot 98.6 to 112.7 and 13.2 to 20.3, ±1 [E], on the end's photograph. The service manual names the knob and the switch, 170806 and 170809 [A]. How far each stands proud is not measured: a knob a third of its slot long standing 2, and a wheel standing 1 and stopping 1 short of its window's ends, are taken, the knob at ON, toward the rear, as the end reads "OFF I I ON" with the front at the left.
const END_PANEL = { front: 42.1, rear: 124.3, bottom: 3, top: 22.3, depth: 1.5 },
  VOLUME_WINDOW = { front: 55.2, rear: 77.5, bottom: 14.8, top: 19.5 },
  POWER_SLOT = { front: 98.6, rear: 112.7, bottom: 13.2, top: 20.3 },
  POWER_KNOB = { share: 1 / 3, standing: 2 },
  WHEEL_STANDING = 1,
  WHEEL_INSET = 1

// Colours sampled against a near-white drum in the Rouen photograph, and on a UK unit indoors, neither calibrated, good for the hue and no more [E]: the case reads #504c49 to #56524f warm in the one and #4c5258 blue in the other, and their middle is taken; the nameplate's ground #4f5053; the grey caps #d6cec0 to #ddd6cd warm and #adb6be blue, the middle taken; the light blue #72acef on the unfaded indoor unit, where the Rouen unit's has faded to #bbccc6; the legends #231813 to #362e26, taken neutral; the drive plate's ground #2b2c2e indoors.
// The cabinet bottom, the bezel and the inside read near black and take the 6128's blacks, the feet the 464's, and the switches a near black of their own, a guess; the lamps the dark red of the Rouen unit's, #510104.
// The cord, its boot and its plug take the 6128's colours, being the 6128's part. On the rear photograph the block reads 0.65 of the case's rear face above it in linear light, the share the 6128's boot reads of its band, and the boot and the coil, standing out into the light, sample #59 to #83, a neutral grey [E]: the 6128's grey is kept.
const CORD = { name: "cord", colour: "#434343" },
  PLUG_PLASTIC = { name: "black-plastic", colour: "#2e2f31" },
  NICKEL = { name: "nickel", colour: "#a3a199" }

const CABINET_TOP = { name: "cabinet-top", colour: "#4f4f50" },
  CABINET_BOTTOM = { name: "cabinet-bottom", colour: "#262729" },
  FOOT_RUBBER = { name: "foot", colour: "#2a2a2c" },
  INTERIOR = { name: "interior", colour: "#07080a" },
  BEZEL = { name: "bezel", colour: "#1c1918" },
  SWITCH = { name: "switch", colour: "#1f1f20" },
  LAMP = { name: "lamp", colour: "#510104" },
  BADGE_PLATE = { name: "badge", colour: "#4f5053" },
  DRIVE_PLATE_GROUND = { name: "drive-plate", colour: "#2b2c2e" },
  KEYCAPS = {
    grey: { name: "keycap", colour: "#c3c3bf" },
    blue: { name: "keycap-blue", colour: "#72acef" }
  },
  LEGEND_INK = "#2c2b2a"

// The legends of a UK unit, measured on the close photograph of its keys from above held in the drawing of the caps made to fit it, at 168.7 pixels to the key, ±0.3 [E], https://archive.org/details/thingiverse-4766209: every legend centred across its key; a letter's capital 5.5 tall and centred down its top; a pair's upper character 4.1 with its top 2.5 behind the top's rear edge, and its lower 4.0 on a baseline 11.7 behind it. The face is an upright grotesque; TeX Gyre Heros stands in for it: https://www.gust.org.pl/projects/e-foundry/tex-gyre/heros
// Every version's keys were the UK's [A], the Spanish and French manuals' keyboard tables and Amstrad France's brochure, "Clavier 74 touches type QWERTY": https://archive.org/details/Amstrad_CPC664_Manual_del_Usuario_1984_AMSOFT_ES, https://amstrad.eu/wp-content/uploads/ftp_cpcscene/Librairie/Documentations/CPC-Manuels/Machines/CPC664%5BFRA%5D_1985%5BOCR%5D.pdf and https://archive.org/details/depliants_amstrad
// The words, the keypad's f's and the cursor keys' chevrons are not measured on a 664. The words and the keypad are drawn by the 6128's measured rules, their keys' faces looking alike: a word 2.5 tall and bold, centred; a keypad key's f leaning 17.7° beside an upright digit 4.57 tall, their middles 3.4 apart. A chevron is taken 7 wide, rising 2.4, in a 0.4 stroke; the thin arrow under £ is the 6128's, and so is the underscore over Ø, a bar 4.2 by 0.34 across the upper character's middle, where Heros sets its own under the baseline; the zero's slash and the broken bar are drawn as the 464's. ENTER stands in its arm's row over its leg, as on the UK units' photographs [E].
const LETTER_HEIGHT = 5.5,
  UPPER = { capHeight: 4.1, top: 2.5 },
  LOWER = { capHeight: 4, baseline: 11.7 },
  WORD_HEIGHT = 2.5,
  LINE_GAP = 1.3,
  KEYPAD_HEIGHT = 4.57,
  KEYPAD_APART = 3.4,
  KEYPAD_LEAN = 17.7,
  CHEVRON = { width: 7, rise: 2.4, stroke: 0.4 },
  THIN_ARROW = { length: 3.9, shaft: 0.4, headWidth: 1.2, headLength: 1.2 },
  ARROW_UP = 0,
  UNDERSCORE = { width: 4.2, thickness: 0.34 },
  SLASH = { reach: 0.38, stroke: 0.1 },
  BROKEN_BAR = { dash: 0.42, width: 0.12 }

// The UK nameplate in its own frame from its rear left corner, measured on the rectified photograph, ±0.3 [E]: AMSTRAD in heavy condensed capitals 12.3 tall, its letters running unboxed; the words in widely spaced capitals 3.7 tall; CPC664 in thin condensed figures 8.1 tall, which Heros's condensed cut stands in for, heavier; the colour bars, each 6.3 by 5.2 at a 6.5 pitch, touching, crossed at their middle by a light line, in a light frame; COLOUR 3.0 tall; ON 2.6 tall beside the lamp.
// The French plate's words take the same places [D], read on a 1256-pixel photograph scaled by the plate's ends, ±1, https://oldwiki.cpcwiki.eu/imgs/f/fe/CPC664_french_qwerty.jpg, and no word by its lamp can be read.
// Its inks, uncalibrated: the wordmark #c7b5a7, the small words #b1a19d, CPC664 #a49995, COLOUR #a69d9b, ON #b4a9a4, the bars #fc322c, #03ca5c and #026fbf; the frame's light grey is not sampled, and is a guess.
const AMSTRAD_PLATE = {
    wordmark: { words: "AMSTRAD", left: 11.2, right: 55.9, baseline: 19.8, capHeight: 12.3 },
    smallWords: { baseline: 20.1, capHeight: 3.7 },
    model: { words: "CPC664", left: 208.8, right: 243.5, baseline: 20, capHeight: 8.1 },
    frame: { left: 246.8, right: 268.7, top: 12, bottom: 20.1 },
    bars: { lefts: [248.1, 254.7, 261.2], width: 6.3, top: 13.4, bottom: 18.6, line: 0.25 },
    colour: { baseline: 20, capHeight: 3 },
    lampWord: { words: "ON", left: 278.4, right: 283, baseline: 9, capHeight: 2.6 },
    inks: {
      wordmark: "#c7b5a7",
      words: "#b1a19d",
      model: "#a49995",
      colour: "#a69d9b",
      lampWord: "#b4a9a4",
      frame: "#c9c6c4",
      bars: ["#fc322c", "#03ca5c", "#026fbf"]
    }
  },
  ENGLISH_PLATE_WORDS = {
    smallWords: [
      { words: "64k", left: 61.2, right: 69.3 },
      { words: "COLOUR", left: 72.5, right: 92.9 },
      { words: "PERSONAL", left: 95.7, right: 121 },
      { words: "COMPUTER", left: 124, right: 150.8 }
    ],
    colour: { words: "COLOUR", left: 269.8, right: 286.2 },
    lampWord: true
  },
  FRENCH_PLATE_WORDS = {
    smallWords: [
      { words: "ORDINATEUR", left: 59.6, right: 93.5 },
      { words: "PERSONNEL", left: 94.9, right: 123.3 },
      { words: "COULEUR", left: 125.8, right: 149.8 },
      { words: "64K", left: 152.3, right: 161.4 }
    ],
    colour: { words: "COULEUR", left: 271.5, right: 289.2 },
    lampWord: false
  }

// Schneider's nameplate in the same frame, measured on a rectified photograph of a Schneider unit, ±0.6 [D, E], https://oldwiki.cpcwiki.eu/imgs/6/69/Schneider_cpc_664.jpg: Schneider's mark; Schneider 7.2 tall and bold over COMPUTER DIVISION in leaning capitals; the line 6.4 tall; three stripes leaning right; and IN FUNCTION under the lamp, joined to it by a rule. The capitals' lean and the stripes' width and lean are by eye, 15°, 3.4 and 30°. Its print reads cream, #f6ecd1, and its stripes #f55d4a, #73b064 and #c4c9cb, uncalibrated.
const SCHNEIDER_PLATE = {
  mark: { left: 4.5, right: 21.5, top: 8.6, bottom: 20 },
  name: { words: "Schneider", left: 21.7, right: 59.5, baseline: 15.5, capHeight: 7.2 },
  division: {
    words: "COMPUTER DIVISION",
    left: 22,
    right: 59.2,
    baseline: 19.9,
    capHeight: 4,
    lean: 15
  },
  line: {
    baseline: 19.6,
    capHeight: 6.4,
    words: [
      { words: "64k", left: 73.1, right: 86.4 },
      { words: "Colour", left: 87.9, right: 111.9 },
      { words: "Personal", left: 113.6, right: 143.5 },
      { words: "Computer", left: 145.6, right: 181.8 },
      { words: "»CPC664«", left: 183.1, right: 221.1 }
    ]
  },
  stripes: { middles: [251.9, 256.9, 262.1], width: 3.4, top: 12.5, bottom: 19.7, lean: 30 },
  rule: { x: 284.7, top: 9.2, bottom: 16.1, width: 0.6 },
  lampWord: { words: "IN FUNCTION", left: 273.6, right: 295.8, baseline: 19.7, capHeight: 3.1 },
  inks: { print: "#f6ecd1", stripes: ["#f55d4a", "#73b064", "#c4c9cb"] }
}

// The UK drive plate's artwork in its own frame of 92 by 136 from its rear left corner, measured on the recreation at 23.63 pixels to the millimetre [D, E]. Its inks are the recreation's, light blue #0fc4f0 and white.
// FDD is a grid of dots 0.87 across, 1.28 apart across and 1.2705 down in 19 rows from 9.717, clipped to its letters: F a stem 6.2 wide with bars over 9.27 to 15.4 and 17.97 to 24.3, to 27.89; each D 23.91 wide, a stem 6.2 wide closed by a half ring about its middle, outer radius 11.89 and inner 5.75, its counter from 15.4 to 26.9 [E].
// Its words are set to their measured boxes, the colour chart's in a condensed bold face as the plate's own photographed chart is [E], https://commons.wikimedia.org/wiki/File:Amstrad_CPC_664_function_keypad.jpg; rules are 0.2, the key map's boxes 0.1, its keys 2.84 square at 4.19 across and 4.39 down.
const FDD = {
    dot: 0.87,
    across: 1.28,
    down: 1.2705,
    firstRow: 9.717,
    rows: 19,
    top: 9.27,
    bottom: 33.05,
    stem: 6.2,
    bar: 6.13,
    letters: [
      { left: 7.83, firstColumn: 8.254, columns: 16 },
      { left: 32.12, firstColumn: 32.542, columns: 19 },
      { left: 60.26, firstColumn: 60.668, columns: 19 }
    ],
    straightRight: 27.89,
    middleBar: [17.97, 24.3],
    roundWidth: 23.91,
    outerRadius: 11.89,
    innerRadius: 5.75,
    counter: [15.4, 26.9]
  },
  PLATE_INKS = { rules: "#0fc4f0", words: "#ffffff" },
  RULE = 0.2,
  LINE = 0.1,
  COLOUR_CHART = {
    left: 7.15,
    right: 84.75,
    top: 42.66,
    headingRule: 47.65,
    bottom: 83.83,
    columnRules: [33.22, 58.74],
    numbers: [9.04, 35.18, 60.72],
    names: [11.19, 38.5, 64.2],
    firstTop: 49.4,
    pitch: 3.85,
    capHeight: 1.61,
    rows: 9
  },
  KEY_MAP = { top: 102.54, across: 4.19, down: 4.39, key: 2.84, capHeight: 1.35 },
  NAME_BAR = { left: 5.29, right: 70.25, top: 94.67, bottom: 99.83 },
  KEY_BLOCK = [
    [5.29, 101.61],
    [70.25, 101.61],
    [70.25, 119.38],
    [60.98, 119.38],
    [60.98, 123.87],
    [18.49, 123.87],
    [18.49, 119.38],
    [5.29, 119.38]
  ],
  CURSOR_BOX = {
    left: 73.55,
    right: 86.71,
    top: 94.67,
    bottom: 105.54,
    copy: [78.75, 81.59, 98.69, 101.56]
  },
  KEYPAD_BOX = { left: 73.55, right: 86.71, top: 105.97, bottom: 123.87 },
  PLATE_RETURN = {
    left: 62.5,
    legLeft: 63.6,
    right: 69.36,
    top: 106.94,
    step: 109.77,
    bottom: 114.09
  },
  UK_DRIVE_PLATE = {
    letters: "FDD",
    title: {
      words: "FLOPPY DISC DRIVE",
      left: 20.65,
      right: 71.35,
      baseline: 39.66,
      capHeight: 3.43
    },
    chartHeading: {
      words: "MASTER COLOUR CHART",
      left: 22.85,
      right: 69.28,
      baseline: 46.72,
      capHeight: 2.79
    },
    keyHeading: {
      words: "KEY NUMBERS",
      left: 32.67,
      right: 59.33,
      baseline: 88.55,
      capHeight: 2.79
    },
    comb: { left: 3.51, right: 88.49, top: 90.05, bottom: 91.92, cycles: 76, stroke: 0.1 },
    nameBarWord: { words: "AMSTRAD", left: 6.3, right: 18.75, baseline: 98.81, capHeight: 3 },
    hairline: { left: 3.51, right: 88.49, y: 126.62 },
    names: [
      "BLACK",
      "BLUE",
      "BRIGHT BLUE",
      "RED",
      "MAGENTA",
      "MAUVE",
      "BRIGHT RED",
      "PURPLE",
      "BRIGHT MAGENTA",
      "GREEN",
      "CYAN",
      "SKY BLUE",
      "YELLOW",
      "WHITE",
      "PASTEL BLUE",
      "ORANGE",
      "PINK",
      "PASTEL MAGENTA",
      "BRIGHT GREEN",
      "SEA GREEN",
      "BRIGHT CYAN",
      "LIME GREEN",
      "PASTEL GREEN",
      "PASTEL CYAN",
      "BRIGHT YELLOW",
      "PASTEL YELLOW",
      "BRIGHT WHITE"
    ],
    namesWeight: 700
  }

// The French plate is the UK's in French, LDD over LECTEUR DE DISQUETTE, PALETTE DES COULEURS and NUMÉROS DES TOUCHES, its colour names in regular mixed case [D], on photographs too blurred to measure: https://oldwiki.cpcwiki.eu/imgs/f/fe/CPC664_french_qwerty.jpg and Amstrad Magazine no. 1, p. 4, https://archive.org/details/AMSTRAD_MAGAZINE_01. Its words are set where the UK's stand, at their own widths, and its L takes the F's stem and a bar as tall at its foot. The French manual says the plate is "version anglaise" [A], Chap. 1 p. 46, https://amstrad.eu/wp-content/uploads/ftp_cpcscene/Librairie/Documentations/CPC-Manuels/Machines/CPC664%5BFRA%5D_1985%5BOCR%5D.pdf, where both French units photographed wear the French one.
const FRENCH_DRIVE_PLATE = {
  ...UK_DRIVE_PLATE,
  letters: "LDD",
  title: { words: "LECTEUR DE DISQUETTE", middle: 46, baseline: 39.66, capHeight: 3.43 },
  chartHeading: { words: "PALETTE DES COULEURS", middle: 46.07, baseline: 46.72, capHeight: 2.79 },
  keyHeading: { words: "NUMÉROS DES TOUCHES", middle: 46, baseline: 88.55, capHeight: 2.79 },
  names: [
    "Noir",
    "Bleu",
    "Bleu Vif",
    "Rouge",
    "Magenta",
    "Mauve",
    "Rouge Vif",
    "Pourpre",
    "Magenta Vif",
    "Vert",
    "Turquoise",
    "Bleu ciel",
    "Jaune",
    "Blanc",
    "Bleu Pastel",
    "Orange",
    "Rose",
    "Magenta Pastel",
    "Vert Vif",
    "Vert marin",
    "Turquoise Vif",
    "Vert citron",
    "Vert Pastel",
    "Turquoise Pastel",
    "Jaune Vif",
    "Jaune Pastel",
    "Blanc brillant"
  ],
  namesWeight: 400
}

// Schneider's plate in one cream ink, its own layout read on a photograph of one from above at about 5 pixels to the millimetre, ±0.7 [D, E], https://commons.wikimedia.org/wiki/File:Schneider_CPC_664_und_CPC_6128_(54853121982).jpg: the UK's FDD; FLOPPY DISC DRIVE bold across it; »CPC« Farbtabelle between two rules; a table of three columns headed Tinte (INK) and Farbe in a narrow bold face, its rows 2.97 apart and three names running to a second line; Tasten-Nummern; and the UK's key map 3.0 lower, its bar carrying Schneider's mark, with neither comb nor hairline. Its names are read on another unit [D], https://oldwiki.cpcwiki.eu/index.php/Keyboard_Versions. Its ink is the nameplate's sampled cream, and the mark and Schneider in the map's bar are set by eye.
const SCHNEIDER_DRIVE_PLATE = {
  letters: "FDD",
  ink: SCHNEIDER_PLATE.inks.print,
  title: { words: "FLOPPY DISC DRIVE", left: 7.1, right: 83.8, baseline: 40.3, capHeight: 5.3 },
  rules: [43.5, 48.8, 55.2, 85.6],
  ruleSpan: [7.1, 83.8],
  chartHeading: { words: "»CPC« Farbtabelle", middle: 45.45, baseline: 47.6, capHeight: 2.6 },
  columns: { rules: [28.9, 55.6], numbers: [7.3, 32.3, 59], names: [14.1, 39.8, 66.1] },
  headings: { firstBaseline: 51.8, secondBaseline: 54.4, capHeight: 1.7 },
  rows: { firstBaseline: 58.3, pitch: 2.97, capHeight: 1.9 },
  keyHeading: { words: "Tasten-Nummern", middle: 45.95, baseline: 95.5, capHeight: 2.6 },
  mapShift: 3.03,
  names: [
    ["Schwarz"],
    ["Blau"],
    ["Hellblau"],
    ["Rot"],
    ["Magenta"],
    ["Hellviolett"],
    ["Hellrot"],
    ["Purpur"],
    ["helles", "Magenta"],
    ["Grün"],
    ["Blaugrün"],
    ["Himmelblau"],
    ["Gelb"],
    ["Weiß"],
    ["Pastellblau"],
    ["Orange"],
    ["Rosa"],
    ["Pastell-", "magenta"],
    ["Hellgrün"],
    ["Seegrün"],
    ["helles Blaugrün"],
    ["Limonengrün"],
    ["Pastellgrün"],
    ["Pastell-", "blaugrün"],
    ["Hellgelb"],
    ["Pastellgelb"],
    ["Leuchtendweiß"]
  ]
}

// A row of the key map's single keys, from the first's left edge at the map's pitch.
function plateRow(numbers, left, row) {
  return numbers.map(function (number, column) {
    return { number, left: left + column * KEY_MAP.across, width: KEY_MAP.key, row }
  })
}

// The key map's keys, each by its number, its left edge and width on the plate, and its row on the plate's grid.
const PLATE_KEYS = [
  ...plateRow([66, 64, 65, 57, 56, 49, 48, 41, 40, 33, 32, 25, 24, 16], 6.18, 0),
  { number: 79, left: 64.83, width: 4.53, row: 0 },
  { number: 68, left: 6.18, width: 4.91, row: 1 },
  ...plateRow([67, 59, 58, 50, 51, 43, 42, 35, 34, 27, 26, 17], 12.4, 1),
  { number: 70, left: 6.18, width: 5.76, row: 2 },
  ...plateRow([69, 60, 61, 53, 52, 44, 45, 37, 36, 29, 28, 19], 13.33, 2),
  { number: 21, left: 6.18, width: 7.74, row: 3 },
  ...plateRow([71, 63, 62, 55, 54, 46, 38, 39, 31, 30, 22], 15.32, 3),
  { number: 21, left: 61.62, width: 7.74, row: 3 },
  { number: 47, left: 19.47, width: 36.27, row: 4 },
  { number: 23, left: 57.05, width: KEY_MAP.key, row: 4 },
  ...plateRow([10, 11, 3], 74.52, 1),
  ...plateRow([20, 12, 4], 74.52, 2),
  ...plateRow([13, 14, 5], 74.52, 3),
  ...plateRow([15, 7, 6], 74.52, 4)
]

// Schneider's mark and name in the key map's bar, by eye: the mark as tall as the bar less 1 above and below, the name 0.6 after it, half the bar tall and 4.2 bars long, its baseline 1.2 above the bar's foot.
const SCHNEIDER_NAME_BAR = {
  margin: 1,
  gap: 0.6,
  capHeight: 0.5,
  length: 4.2,
  lift: 1.2
}

// How finely a print is rendered: the legend atlas, a tile a key across the whole block, stands 3715 wide at 10 pixels to the millimetre, inside the 4096 a mobile GPU may hold; the plates take 12.
const LEGEND_PIXELS = 10,
  PLATE_PIXELS = 12

const ENGLISH = "en",
  LEGENDS_PRINT = "legends",
  BADGE_PRINT = "badge",
  DRIVE_PLATE_PRINT = "drive-plate"

const HEROS = "TeX Gyre Heros",
  HEROS_CONDENSED = "TeX Gyre Heros Cn",
  HEROS_CAP_HEIGHT = 0.729,
  HEROS_CONDENSED_CAP_HEIGHT = 0.718

// A cut runs this far past the faces it opens, so the kernel is never left two coplanar faces to join.
const OVERRUN = 1

// Where one part lies in another's recess or opening, a hairline holds the two apart, so that no face of either stands in the plane of a face of the other.
const HAIRLINE = 0.1

// How far the triangles may stray from a curved face, in millimetres, and turn from one another along it, in radians: a choice of how finely to draw, not a figure of the machine.
const TESSELLATION = { tolerance: 0.25, angularTolerance: 1 }

// The inside behind the rear's vents is drawn this far forward of the rear face, short of the step, and the dark backs behind the openings stand this thick: choices of drawing, not figures of the machine.
const INTERIOR_REACH = 17,
  BACK_THICKNESS = 0.5

const KEY_ATLAS_TOP_ROW = CURSOR_SQUARE.row,
  KEY_ATLAS_ROWS = 5 - KEY_ATLAS_TOP_ROW,
  KEY_ATLAS_KEYS = CURSOR_SQUARE.left + CURSOR_SQUARE.keys,
  LEGEND_ATLAS_WIDTH = KEY_ATLAS_KEYS * KEY_PITCH,
  LEGEND_ATLAS_DEPTH = KEY_ATLAS_ROWS * KEY_PITCH

const CENTRING = [-WIDTH / 2, -DEPTH / 2, FOOT.height],
  QUARTERS = ["", "¼", "½", "¾"]

function tangent(degrees) {
  return Math.tan(degrees * RADIANS)
}

function slopeHeightAt(y) {
  return FRONT_LINE + SLOPE * y
}

// A point given in the slope's plane — across, up the slope from the front line and out of it — in the case's own terms.
function onSlopeAt(x, along, above) {
  return [x, along * COSINE - above * SINE, FRONT_LINE + along * SINE + above * COSINE]
}

// A shape built in the slope's plane, carried into the case.
function onSlope(shape) {
  return shape.rotate(TOP_ANGLE, [0, 0, 0], [1, 0, 0]).translate([0, 0, FRONT_LINE])
}

// A box in the slope's plane from an outline given up the slope, reaching from below it to above it.
function slopeBox({ left, right, front, rear }, below, above = OVERRUN) {
  const box = makeBox([left, front, -below], [right, rear, above])

  return onSlope(box)
}

function centred(place) {
  return [place[0] + CENTRING[0], place[1] + CENTRING[1], place[2] + CENTRING[2]]
}

function grown({ left, right, front, rear }, margin) {
  return { left: left - margin, right: right + margin, front: front - margin, rear: rear + margin }
}

function sketchAcross(profile, left = 0, width = WIDTH) {
  return profile.sketchOnPlane("YZ", left).extrude(width)
}

function planOutline(radius, below, above) {
  const outline = drawRoundedRectangle(WIDTH, DEPTH, radius).translate(WIDTH / 2, DEPTH / 2)

  return outline.sketchOnPlane("XY", below).extrude(above - below)
}

function stepTop() {
  const rise = PLATEAU_HEIGHT - slopeHeightAt(STEP_FOOT)

  return STEP_FOOT + rise / tangent(STEP_RISE)
}

// The housing's end above the parting line: the front upright, bevelling back to the housing's face, which rises to the level top; and the rear face.
function housingProfile() {
  return draw([CHIN_FOOT[0], PARTING_HEIGHT])
    .lineTo(CHIN_FOOT)
    .lineTo(FRONT_EDGE)
    .lineTo([HOUSING_FACE, PLATEAU_HEIGHT])
    .customCorner(HOUSING_EDGE_RADIUS)
    .lineTo([DEPTH, PLATEAU_HEIGHT])
    .customCorner(HOUSING_EDGE_RADIUS)
    .lineTo([DEPTH, PARTING_HEIGHT])
    .close()
}

// What the keyboard's end lacks of the housing's: everything above the slope and the step, from the front edge to the rear strip.
function aboveKeyboardProfile() {
  const top = PLATEAU_HEIGHT + OVERRUN,
    stepAt = stepTop(),
    [edgeY, edgeZ] = FRONT_EDGE

  return draw([edgeY - OVERRUN, edgeZ])
    .lineTo(FRONT_EDGE)
    .lineTo([STEP_FOOT, slopeHeightAt(STEP_FOOT)])
    .lineTo([stepAt + OVERRUN / tangent(STEP_RISE), top])
    .lineTo([edgeY - OVERRUN, top])
    .close()
}

function keyCell(left, row, width = 1, rows = 1) {
  const rear = KEY_GRID_REAR - row * KEY_PITCH

  return {
    left: KEY_GRID_LEFT + left * KEY_PITCH,
    right: KEY_GRID_LEFT + (left + width) * KEY_PITCH,
    front: rear - rows * KEY_PITCH,
    rear
  }
}

function buildKeyOpenings() {
  const block = keyCell(0, 0, 15.5, 4),
    spaceRow = keyCell(3.25, 4, 10),
    main = {
      ...MAIN_OPENING,
      front: block.front - KEY_CLEARANCE,
      rear: block.rear + KEY_CLEARANCE
    },
    notch = { ...grown(spaceRow, KEY_CLEARANCE), front: MAIN_OPENING.front },
    openings = [main, notch, CURSOR_OPENING].map(outline => slopeBox(outline, FLOOR_BELOW_TOP))

  return openings.reduce((whole, opening) => whole.fuse(opening))
}

function driveOpening() {
  const middle = (HOUSING_LEFT + WIDTH) / 2

  return {
    left: middle - DRIVE_OPENING.width / 2,
    right: middle + DRIVE_OPENING.width / 2,
    foot: FRONT_EDGE[1],
    top: PLATEAU_HEIGHT - DRIVE_OPENING.topBelowPlateau,
    middle
  }
}

function buildDriveBay() {
  const { left, right, foot, top } = driveOpening()

  return makeBox(
    [left, HOUSING_FACE - OVERRUN, foot],
    [right, HOUSING_FACE + BEZEL_SET_BACK + DRIVE_LENGTH, top]
  )
}

function ventMiddle(index) {
  return VENTS.first + index * VENTS.pitch
}

function overSpeaker(index) {
  return index >= SPEAKER_SLOTS.first && index < SPEAKER_SLOTS.first + SPEAKER_SLOTS.count
}

function buildVentSlots() {
  const slots = []

  for (let index = 0; index < VENTS.count; index++) {
    const middle = ventMiddle(index),
      downRear = overSpeaker(index) ? SPEAKER_SLOTS.downRear : VENTS.downRear,
      slot = makeBox(
        [middle - VENTS.width / 2, DEPTH - VENTS.onTop, PLATEAU_HEIGHT - downRear],
        [middle + VENTS.width / 2, DEPTH + OVERRUN, PLATEAU_HEIGHT + OVERRUN]
      )

    slots.push(slot)
  }

  return makeCompound(slots)
}

// The inside the rear's vents open into, inside the rear strip's walls.
function buildInteriorSpace(inset = 0) {
  const wall = CASE_WALL + inset

  return makeBox(
    [wall, DEPTH - INTERIOR_REACH, PARTING_HEIGHT - OVERRUN + inset],
    [WIDTH - wall, DEPTH - wall, PLATEAU_HEIGHT - wall]
  )
}

function drivePlateOutline() {
  return {
    left: DRIVE_PLATE.left,
    right: DRIVE_PLATE.left + DRIVE_PLATE.width,
    front: DRIVE_PLATE.front,
    rear: DRIVE_PLATE.front + DRIVE_PLATE.depth
  }
}

function buildDrivePlateRecess() {
  const outline = drivePlateOutline(),
    { left, right, front, rear } = grown(outline, HAIRLINE)

  return makeBox(
    [left, front, PLATEAU_HEIGHT - PLATE_THICKNESS],
    [right, rear, PLATEAU_HEIGHT + OVERRUN]
  )
}

// The rear's panels, recessed into both cabinets from the base up to each one's rise over the parting line.
function buildRearPanels() {
  const panels = REAR_PANELS.map(({ left, right, rise }) =>
    makeBox([left, DEPTH - PANEL_DEPTH, -OVERRUN], [right, DEPTH + OVERRUN, PARTING_HEIGHT + rise])
  )

  return panels.reduce((whole, panel) => whole.fuse(panel))
}

// Each kind of socket's opening between the given depths, shrunk by the given margin.
function edgeOpening(socket, front, rear, margin) {
  return makeBox(
    [
      socket.middle - socket.width / 2 + margin,
      front,
      PARTING_HEIGHT - EDGE_CONNECTOR.bottom + margin
    ],
    [socket.middle + socket.width / 2 - margin, rear, PARTING_HEIGHT - EDGE_CONNECTOR.top - margin]
  )
}

function boxOpening(socket, front, rear, margin) {
  const middle = PARTING_HEIGHT - socket.below

  return makeBox(
    [socket.middle - socket.width / 2 + margin, front, middle - socket.height / 2 + margin],
    [socket.middle + socket.width / 2 - margin, rear, middle + socket.height / 2 - margin]
  )
}

function roundOpening(socket, front, rear, margin) {
  return makeCylinder(
    socket.diameter / 2 - margin,
    rear - front,
    [socket.middle, front, PARTING_HEIGHT - socket.below],
    [0, 1, 0]
  )
}

const SOCKET_OPENINGS = { edge: edgeOpening, box: boxOpening, round: roundOpening }

// A socket's opening, from the given depth in front of the rear face to past it, shrunk by the given margin.
function socketOpening(socket, from, to, margin = 0) {
  const opening = SOCKET_OPENINGS[socket.kind]

  return opening(socket, DEPTH - from, DEPTH + to, margin)
}

function buildSocketOpenings() {
  const openings = REAR_SOCKETS.map(socket =>
    socketOpening(socket, PANEL_DEPTH + CASE_WALL, OVERRUN)
  )

  return makeCompound(openings)
}

function buildCordBlock() {
  const face = DEPTH - PANEL_DEPTH,
    block = makeBox(
      [CORD_BLOCK.left, face - OVERRUN, CORD_BLOCK.bottom],
      [CORD_BLOCK.right, face + CORD_BLOCK.standing, PARTING_HEIGHT]
    )

  return { name: "dc-cord-block", shape: block.translate(CENTRING), material: CORD }
}

function cordSection(diameter, y) {
  return drawCircle(diameter / 2)
    .translate(DC_CORD.middle, DC_CORD.height)
    .sketchOnPlane("XZ", -y)
}

// The boot runs out of the block, full width as far as its face and tapering beyond it.
function buildDcCord() {
  const root = cordSection(DC_CORD.diameter, BOOT_ROOT - OVERRUN),
    rooted = cordSection(DC_CORD.diameter, BOOT_ROOT),
    tip = cordSection(DC_CORD.tipDiameter, BOOT_ROOT + DC_CORD.length),
    boot = root.loftWith([rooted, tip], { ruled: true })

  return { name: "dc-cord", shape: boot.translate(CENTRING), material: CORD }
}

// Where a monitor's plugs stand in the MONITOR and 5V DC sockets, which the page finds by name: each facing out of the rear, its shoulder against the panel's face.
function socketMouths() {
  const face = DEPTH - PANEL_DEPTH,
    monitorMouth = centred([MONITOR_SOCKET.middle, face, PARTING_HEIGHT - MONITOR_SOCKET.below]),
    dcMouth = centred([DC_SOCKET.middle, face, PARTING_HEIGHT - DC_SOCKET.below])

  return [
    { name: "monitor-mouth", place: monitorMouth, turn: 180, parts: [] },
    { name: "5v-dc-mouth", place: dcMouth, turn: 180, parts: [] }
  ]
}

// The CL-1 goes along the rear to whatever stands at the right, passing 60 behind the rear, clear of the plugs standing out of it, and 10 right of the right end: a drawing choice.
const TAPE_WAY = { behind: 60, right: 10 }

function buildTapeLead() {
  const face = DEPTH - PANEL_DEPTH,
    mouth = centred([TAPE_SOCKET.middle, face, PARTING_HEIGHT - TAPE_SOCKET.below]),
    stowed = centred([WIDTH / 2, DEPTH / 2, DC_CORD.height]),
    way = [centred([WIDTH + TAPE_WAY.right, DEPTH + TAPE_WAY.behind, 0])]

  return buildCl1({ mouth, turn: 180, stowed, way, metal: NICKEL })
}

function buildDcLead() {
  const tip = centred([DC_CORD.middle, BOOT_ROOT + DC_CORD.length, DC_CORD.height]),
    stowed = centred([DC_CORD.middle, DEPTH / 2, DC_CORD.height])

  return buildCordDc({ tip, stowed, plastic: PLUG_PLASTIC, metal: NICKEL })
}

// The housing's end is carried across the whole width and the keyboard cut out of it left of the housing, so that the two are one moulding. Rounding the housing's front left corner rounds its top left edge too, the kernel carrying a fillet along edges that meet tangentially.
function buildCabinetTop() {
  const above = aboveKeyboardProfile(),
    keyboard = sketchAcross(above, -OVERRUN, HOUSING_LEFT + OVERRUN),
    housing = housingProfile(),
    corner = [HOUSING_LEFT, HOUSING_FACE, (FRONT_EDGE[1] + PLATEAU_HEIGHT) / 2],
    raised = sketchAcross(housing)
      .cut(keyboard)
      .fillet(HOUSING_EDGE_RADIUS, edge => edge.containsPoint(corner)),
    plan = planOutline(PLAN_RADIUS, -OVERRUN, PLATEAU_HEIGHT + OVERRUN),
    keyOpenings = buildKeyOpenings(),
    badgeRoom = grown(BADGE, HAIRLINE),
    badgeRecess = slopeBox(badgeRoom, PLATE_THICKNESS),
    plateRecess = buildDrivePlateRecess(),
    driveBay = buildDriveBay(),
    inside = buildInteriorSpace(),
    vents = buildVentSlots(),
    rearPanels = buildRearPanels(),
    sockets = buildSocketOpenings()

  return raised
    .intersect(plan)
    .cut(keyOpenings)
    .cut(badgeRecess)
    .cut(plateRecess)
    .cut(driveBay)
    .cut(inside)
    .cut(vents)
    .cut(rearPanels)
    .cut(sockets)
}

// The cabinet bottom's end: a band flush with the top at front and rear, rounded under, and the base recessed below it.
function bottomProfile() {
  return draw([0, PARTING_HEIGHT])
    .lineTo([0, FRONT_BAND.foot])
    .customCorner(BAND_ROUND)
    .lineTo([FRONT_BAND.recessTop, FRONT_BAND.foot])
    .lineTo([FRONT_BAND.recessFoot, 0])
    .lineTo([DEPTH - REAR_BAND.recessFoot, 0])
    .lineTo([DEPTH - REAR_BAND.recessTop, REAR_BAND.foot])
    .lineTo([DEPTH, REAR_BAND.foot])
    .customCorner(BAND_ROUND)
    .lineTo([DEPTH, PARTING_HEIGHT])
    .close()
}

function buildLowerVents() {
  const slots = []

  for (let index = 0; index < VENTS.count; index++) {
    const middle = ventMiddle(index),
      left = middle - VENTS.width / 2,
      right = middle + VENTS.width / 2,
      bottom = LOWER_VENTS.foot,
      frontTop = FRONT_BAND.foot - LOWER_VENTS.belowBand,
      rearTop = REAR_BAND.foot - LOWER_VENTS.belowBand,
      frontReach = FRONT_BAND.recessFoot + CASE_WALL,
      rearReach = REAR_BAND.recessFoot + CASE_WALL

    slots.push(
      makeBox([left, -OVERRUN, bottom], [right, frontReach, frontTop]),
      makeBox([left, DEPTH - rearReach, bottom], [right, DEPTH + OVERRUN, rearTop])
    )
  }

  return makeCompound(slots)
}

// An opening in the right end, from the given depth inside the end to the given one, shrunk by the given margin.
function endOpening(opening, from, to, margin = 0) {
  return makeBox(
    [WIDTH - to, opening.front + margin, opening.bottom + margin],
    [WIDTH - from, opening.rear - margin, opening.top - margin]
  )
}

// The end's openings run through its panel, so they are fused with it before the cut: a cut whose tools overlap loses them without a word.
function buildEndCuts() {
  const panel = endOpening(END_PANEL, -OVERRUN, END_PANEL.depth),
    reach = END_PANEL.depth + CASE_WALL,
    volume = endOpening(VOLUME_WINDOW, -OVERRUN, reach),
    power = endOpening(POWER_SLOT, -OVERRUN, reach)

  return panel.fuse(volume).fuse(power)
}

function buildCabinetBottom() {
  const profile = bottomProfile(),
    plan = planOutline(PLAN_RADIUS, -OVERRUN, PARTING_HEIGHT + OVERRUN),
    vents = buildLowerVents(),
    rearPanels = buildRearPanels(),
    sockets = buildSocketOpenings(),
    endCuts = buildEndCuts(),
    shaped = sketchAcross(profile)
      .intersect(plan)
      .cut(vents)
      .cut(rearPanels)
      .cut(sockets)
      .cut(endCuts)

  return { name: "cabinet-bottom", shape: shaped.translate(CENTRING), material: CABINET_BOTTOM }
}

function buildFeet() {
  const feet = FOOT_PLACES.map(place =>
      makeCylinder(FOOT.diameter / 2, FOOT.height, [place.middle, place.fromFront, -FOOT.height])
    ),
    standing = makeCompound(feet)

  return { name: "feet", shape: standing.translate(CENTRING), material: FOOT_RUBBER }
}

// What the openings show behind them: the inside behind the vents, and a dark back behind each socket and the end's openings.
function buildInterior() {
  const space = buildInteriorSpace(HAIRLINE),
    socketBacks = REAR_SOCKETS.map(socket =>
      socketOpening(
        socket,
        PANEL_DEPTH + CASE_WALL - HAIRLINE,
        -(PANEL_DEPTH + CASE_WALL - BACK_THICKNESS),
        HAIRLINE
      )
    ),
    from = END_PANEL.depth + CASE_WALL - BACK_THICKNESS,
    to = END_PANEL.depth + CASE_WALL - HAIRLINE,
    endBacks = [VOLUME_WINDOW, POWER_SLOT].map(opening => endOpening(opening, from, to, HAIRLINE)),
    whole = makeCompound([space, ...socketBacks, ...endBacks])

  return { name: "interior", shape: whole.translate(CENTRING), material: INTERIOR }
}

function buildPowerKnob() {
  const length = (POWER_SLOT.rear - POWER_SLOT.front) * POWER_KNOB.share,
    face = WIDTH - END_PANEL.depth,
    knob = makeBox(
      [face - CASE_WALL, POWER_SLOT.rear - length, POWER_SLOT.bottom + HAIRLINE],
      [face + POWER_KNOB.standing, POWER_SLOT.rear - HAIRLINE, POWER_SLOT.top - HAIRLINE]
    )

  return { name: "power-switch", shape: knob.translate(CENTRING), material: SWITCH }
}

function buildVolumeWheel() {
  const face = WIDTH - END_PANEL.depth,
    wheel = makeBox(
      [face - CASE_WALL, VOLUME_WINDOW.front + WHEEL_INSET, VOLUME_WINDOW.bottom + HAIRLINE],
      [face + WHEEL_STANDING, VOLUME_WINDOW.rear - WHEEL_INSET, VOLUME_WINDOW.top - HAIRLINE]
    )

  return { name: "volume-wheel", shape: wheel.translate(CENTRING), material: SWITCH }
}

// The drive's fittings are given across from the slot's middle and up from the opening's foot.
function onBezel(outline, [standing, sunk]) {
  const { middle, foot } = driveOpening(),
    face = HOUSING_FACE + BEZEL_SET_BACK

  return makeBox(
    [middle + outline.middle - outline.width / 2, face - standing, foot + outline.bottom],
    [middle + outline.middle + outline.width / 2, face + sunk, foot + outline.top]
  )
}

function slotMiddle() {
  return driveOpening().foot - BEZEL_HIDDEN + SLOT.middleAboveBezel
}

function buildDrive() {
  const { left, right, foot, top, middle } = driveOpening(),
    face = HOUSING_FACE + BEZEL_SET_BACK,
    slotBottom = slotMiddle() - SLOT.height / 2,
    slotTop = slotBottom + SLOT.height,
    lowerLip = slotBottom - FINGER_BEVEL.below,
    upperLip = slotTop + FINGER_BEVEL.above,
    bevelSlope = tangent(FINGER_BEVEL.angle),
    bevelLeft = middle - FINGER_BEVEL.width / 2,
    block = makeBox([left, face, foot + HAIRLINE], [right, face + DRIVE_LENGTH, top]),
    slot = makeBox(
      [middle - SLOT.length / 2, face - OVERRUN, slotBottom],
      [middle + SLOT.length / 2, face + SLOT.depth, slotTop]
    ),
    lowerBevelEnd = draw([face - OVERRUN, lowerLip - bevelSlope * OVERRUN])
      .lineTo([face + (slotTop - lowerLip) / bevelSlope, slotTop])
      .lineTo([face - OVERRUN, slotTop])
      .close(),
    upperBevelEnd = draw([face - OVERRUN, upperLip + bevelSlope * OVERRUN])
      .lineTo([face + (upperLip - slotBottom) / bevelSlope, slotBottom])
      .lineTo([face - OVERRUN, slotBottom])
      .close(),
    lowerBevel = lowerBevelEnd.sketchOnPlane("YZ", bevelLeft).extrude(FINGER_BEVEL.width),
    upperBevel = upperBevelEnd.sketchOnPlane("YZ", bevelLeft).extrude(FINGER_BEVEL.width),
    notchMiddle = middle + DRIVE_NOTCH.middle,
    notch = makeBox(
      [notchMiddle - DRIVE_NOTCH.width / 2, face - OVERRUN, slotTop - HAIRLINE],
      [notchMiddle + DRIVE_NOTCH.width / 2, face + DRIVE_NOTCH.depth, slotTop + DRIVE_NOTCH.height]
    ),
    ejectRecess = onBezel(EJECT_RECESS, [OVERRUN, EJECT_RECESS.depth]),
    lampOpening = onBezel(DRIVE_LAMP, [OVERRUN, DRIVE_LAMP.depth])

  return block
    .cut(slot)
    .cut(lowerBevel)
    .cut(upperBevel)
    .cut(notch)
    .cut(ejectRecess)
    .cut(lampOpening)
}

// The slot's middle on the bezel's face, which the page finds by name.
function driveSlot() {
  const { middle } = driveOpening(),
    place = [middle, HOUSING_FACE + BEZEL_SET_BACK, slotMiddle()]

  return { name: "drive-slot", place: centred(place), parts: [] }
}

function buildEjectButton() {
  const outline = { ...EJECT_BUTTON, middle: EJECT_RECESS.middle },
    button = onBezel(outline, [EJECT_BUTTON.standing, EJECT_RECESS.depth]),
    { middle, foot } = driveOpening(),
    face = HOUSING_FACE + BEZEL_SET_BACK - EJECT_BUTTON.standing,
    buttonMiddle = foot + (EJECT_BUTTON.bottom + EJECT_BUTTON.top) / 2,
    left = middle + EJECT_RECESS.middle - EJECT_BUTTON.width / 2,
    grooves = []

  for (let groove = 0; groove < EJECT_RIBS.count; groove++) {
    const centre = buttonMiddle + (groove - (EJECT_RIBS.count - 1) / 2) * EJECT_RIBS.pitch,
      box = makeBox(
        [left - OVERRUN, face - OVERRUN, centre - EJECT_RIBS.groove / 2],
        [
          left + EJECT_BUTTON.width + OVERRUN,
          face + EJECT_RIBS.depth,
          centre + EJECT_RIBS.groove / 2
        ]
      )

    grooves.push(box)
  }

  const ribs = makeCompound(grooves),
    ribbed = button.cut(ribs)

  return { name: "eject-button", shape: ribbed.translate(CENTRING), material: BEZEL }
}

function buildDriveLamp() {
  const face = DRIVE_LAMP.depth - HAIRLINE,
    outline = {
      middle: DRIVE_LAMP.middle,
      width: DRIVE_LAMP.width - 2 * HAIRLINE,
      bottom: DRIVE_LAMP.bottom + HAIRLINE,
      top: DRIVE_LAMP.top - HAIRLINE
    },
    lens = onBezel(outline, [-face, face + LENS_THICKNESS])

  return { name: "drive-lamp", shape: lens.translate(CENTRING), material: LAMP }
}

// The nameplate lies flat in its own frame and is turned onto the slope, a hairline below the slope's face, pierced where the lamp rises through it.
function buildBadge() {
  const width = BADGE.right - BADGE.left,
    depth = BADGE.rear - BADGE.front,
    plate = drawRectangle(width, depth).sketchOnPlane("XY").extrude(-PLATE_THICKNESS),
    face = { left: -width / 2, right: width / 2, front: -depth / 2, rear: depth / 2 },
    place = onSlopeAt((BADGE.left + BADGE.right) / 2, (BADGE.front + BADGE.rear) / 2, -HAIRLINE),
    radius = POWER_LAMP.diameter / 2,
    hole = makeCylinder(radius + HAIRLINE, PLATE_THICKNESS + 2 * OVERRUN, [
      POWER_LAMP.middle - (BADGE.left + BADGE.right) / 2,
      POWER_LAMP.along - (BADGE.front + BADGE.rear) / 2,
      -PLATE_THICKNESS - OVERRUN
    ]),
    pierced = plate.cut(hole)

  return {
    name: BADGE_PRINT,
    shape: pierced,
    material: BADGE_PLATE,
    face,
    tilt: TOP_ANGLE,
    place: centred(place),
    print: BADGE_PRINT
  }
}

// The dome rises from the case's top through the nameplate's hole.
function buildPowerLamp() {
  const radius = POWER_LAMP.diameter / 2,
    sphere = makeSphere(radius),
    upper = makeBox([-radius, -radius, 0], [radius, radius, radius]),
    dome = sphere.intersect(upper),
    placed = dome.translate([POWER_LAMP.middle, POWER_LAMP.along, -PLATE_THICKNESS]),
    standing = onSlope(placed)

  return { name: "power-lamp", shape: standing.translate(CENTRING), material: LAMP }
}

function buildDrivePlate() {
  const { left, right, front, rear } = drivePlateOutline(),
    plate = makeBox(
      [left, front, PLATEAU_HEIGHT - PLATE_THICKNESS],
      [right, rear, PLATEAU_HEIGHT - HAIRLINE]
    ),
    face = {
      left: left + CENTRING[0],
      right: right + CENTRING[0],
      front: front + CENTRING[1],
      rear: rear + CENTRING[1]
    }

  return {
    name: DRIVE_PLATE_PRINT,
    shape: plate.translate(CENTRING),
    material: DRIVE_PLATE_GROUND,
    face,
    print: DRIVE_PLATE_PRINT
  }
}

// Where a cap's top stands in its own frame, its base centred on the origin and y toward the rear: the walls run in from the base's edges by the row's insets, and the top's middle line rises from rear to front.
function capTop(width, depth, profile) {
  return {
    left: -width / 2 + profile.side,
    right: width / 2 - profile.side,
    front: -depth / 2 + profile.front,
    rear: depth / 2 - profile.rear,
    frontHeight: profile.frontHeight,
    rearHeight: profile.rearHeight
  }
}

// The top's middle line runs this way, front to rear, and this way, square to it and up.
function topLine(top) {
  const run = top.rear - top.front,
    fall = top.rearHeight - top.frontHeight,
    length = Math.hypot(run, fall)

  return { along: [0, run / length, fall / length], up: [0, -fall / length, run / length] }
}

// A body lofted from the base's outline to the top's, carried on past the top's height so that the dish or the plane through the top cuts it; each wall keeps its lean.
function capBody(base, top, profile) {
  const reach = Math.max(profile.frontHeight, profile.rearHeight) + profile.dish + OVERRUN,
    sideHeight = (profile.frontHeight + profile.rearHeight) / 2 + profile.dish,
    inset = {
      left: (top.left - base.left) * (reach / sideHeight),
      right: (base.right - top.right) * (reach / sideHeight),
      front: (top.front - base.front) * (reach / profile.frontHeight),
      rear: (base.rear - top.rear) * (reach / profile.rearHeight)
    },
    lower = drawRectangle(base.right - base.left, base.rear - base.front)
      .translate((base.left + base.right) / 2, (base.front + base.rear) / 2)
      .sketchOnPlane("XY"),
    upperWidth = base.right - base.left - inset.left - inset.right,
    upperDepth = base.rear - base.front - inset.front - inset.rear,
    upper = drawRectangle(upperWidth, upperDepth)
      .translate(base.left + inset.left + upperWidth / 2, base.front + inset.front + upperDepth / 2)
      .sketchOnPlane("XY", reach)

  return lower.loftWith(upper)
}

// A cylinder lying along the top's middle line, touching it from above, cuts the dish.
function dishOf(top, dish) {
  const half = (top.right - top.left) / 2,
    radius = (half ** 2 + dish ** 2) / (2 * dish),
    { along, up } = topLine(top),
    length = 4 * (top.rear - top.front),
    base = [
      0,
      top.front - (along[1] * length) / 2 + up[1] * radius,
      top.frontHeight - (along[2] * length) / 2 + up[2] * radius
    ]

  return makeCylinder(radius, length, base, along)
}

// Everything above the plane through the top's middle line.
function aboveTop(top) {
  const { up } = topLine(top),
    reach = 100,
    tilt = Math.atan2(-up[1], up[2]) / RADIANS,
    space = makeBox([-reach, -reach, 0], [reach, reach, reach])

  return space.rotate(tilt, [0, 0, 0], [1, 0, 0]).translate([0, top.front, top.frontHeight])
}

function buildCap(width, depth, profile, dished) {
  const base = { left: -width / 2, right: width / 2, front: -depth / 2, rear: depth / 2 },
    top = capTop(width, depth, profile),
    body = capBody(base, top, profile),
    cutter = dished ? dishOf(top, profile.dish) : aboveTop(top)

  return body.cut(cutter)
}

function profileOf(row) {
  return row == 0 ? CAP_ROWS[0] : CAP_ROWS[1]
}

function widthInKeys(width) {
  const whole = Math.floor(width),
    quarters = Math.round((width - whole) * 4)

  return `${whole}${QUARTERS[quarters]}`
}

// A key's cap stands on its cell's middle; its legend's tile in the atlas is its top's, and the atlas runs down from the cursor square's rear edge.
function layKey({ number, left, row, width = 1, rows = 1, colour = "grey" }) {
  const capWidth = width * KEY_PITCH - CAP_GAP,
    capDepth = rows * KEY_PITCH - CAP_GAP,
    profile = profileOf(row),
    top = capTop(capWidth, capDepth, profile),
    axis = (left + width / 2) * KEY_PITCH,
    middle = (row - KEY_ATLAS_TOP_ROW + rows / 2) * KEY_PITCH,
    rear = middle - top.rear,
    along = KEY_GRID_REAR - (row + rows / 2) * KEY_PITCH,
    centre = onSlopeAt(KEY_GRID_LEFT + axis, along, -CAP_SUNK),
    topWidth = top.right - top.left,
    topDepth = top.rear - top.front,
    legend = [
      (axis + top.left) / LEGEND_ATLAS_WIDTH,
      rear / LEGEND_ATLAS_DEPTH,
      topWidth / LEGEND_ATLAS_WIDTH,
      topDepth / LEGEND_ATLAS_DEPTH
    ]

  return {
    number,
    width,
    colour,
    profile,
    place: centred(centre),
    face: { left: top.left, right: top.right, front: top.front, rear: top.rear },
    legend,
    printedAt: [axis + (top.left + top.right) / 2, rear]
  }
}

function buildKeycaps(laid) {
  const groups = Map.groupBy(laid, function (key) {
      const row = key.profile == CAP_ROWS[0] ? "number-row" : "rows"

      return `${widthInKeys(key.width)}-${row}-${key.colour}`
    }),
    keycaps = []

  for (const [group, keys] of groups) {
    const [first] = keys,
      capWidth = first.width * KEY_PITCH - CAP_GAP,
      capDepth = KEY_PITCH - CAP_GAP,
      dished = first.width == 1,
      cap = buildCap(capWidth, capDepth, first.profile, dished)

    keycaps.push({
      name: `keycaps-${group}`,
      shape: cap,
      material: KEYCAPS[first.colour],
      face: first.face,
      tilt: TOP_ANGLE,
      legends: LEGENDS_PRINT,
      keys
    })
  }

  return keycaps
}

// ENTER's L, in the leg's frame, as the polygon its base stands on or its top, each edge run in at the lean of the wall it stands for.
function returnOutline(walls) {
  const { arm, leg } = RETURN_KEY,
    half = CAP_GAP / 2,
    legMiddle = leg.left + leg.width / 2,
    across = keys => (keys - legMiddle) * KEY_PITCH,
    armLeft = across(arm.left) + half + walls.side,
    legLeft = across(leg.left) + half + walls.side,
    right = across(leg.left + leg.width) - half - walls.side,
    rear = KEY_PITCH - half - walls.rear,
    step = half + walls.front,
    foot = -KEY_PITCH + half + walls.front

  return draw([armLeft, rear])
    .lineTo([right, rear])
    .lineTo([right, foot])
    .lineTo([legLeft, foot])
    .lineTo([legLeft, step])
    .lineTo([armLeft, step])
    .close()
}

// ENTER's L is lofted whole and cut by a plane leaning as the QWERTY row's top does, through its middle at that top's middle height.
function buildReturnKeycap(key) {
  const profile = CAP_ROWS[1],
    reach = Math.max(profile.frontHeight, profile.rearHeight) + OVERRUN,
    scale = reach / profile.frontHeight,
    lower = returnOutline({ side: 0, front: 0, rear: 0 }).sketchOnPlane("XY"),
    upper = returnOutline({
      side: profile.side * scale,
      front: profile.front * scale,
      rear: profile.rear * scale
    }).sketchOnPlane("XY", reach),
    body = lower.loftWith(upper),
    rowTop = capTop(CAP_BASE, CAP_BASE, profile),
    lean = (profile.frontHeight - profile.rearHeight) / (rowTop.rear - rowTop.front),
    height = (profile.frontHeight + profile.rearHeight) / 2,
    top = {
      front: -KEY_PITCH,
      rear: KEY_PITCH,
      frontHeight: height + lean * KEY_PITCH,
      rearHeight: height - lean * KEY_PITCH
    },
    above = aboveTop(top),
    shape = body.cut(above)

  return {
    name: "keycaps-ENTER",
    shape,
    material: KEYCAPS[RETURN_KEY.colour],
    face: key.face,
    tilt: TOP_ANGLE,
    legends: LEGENDS_PRINT,
    keys: [key]
  }
}

// The up key's outline in the cursor square's frame, its outer edge toward the rear, its sides along the square's diagonals a gap's half off them, run in by the given wall.
function cursorOutline(wall) {
  const outer = (CURSOR_SQUARE.keys * KEY_PITCH) / 2 - CAP_GAP / 2,
    inner = KEY_PITCH / 2 + CAP_GAP / 2,
    off = (CAP_GAP / 2 + wall) * Math.SQRT2,
    rear = outer - wall,
    front = inner + wall

  return { rear, front, rearHalf: rear - off, frontHalf: front - off }
}

function cursorSketch(wall, height) {
  const { rear, front, rearHalf, frontHalf } = cursorOutline(wall)

  return draw([-rearHalf, rear])
    .lineTo([rearHalf, rear])
    .lineTo([frontHalf, front])
    .lineTo([-frontHalf, front])
    .close()
    .sketchOnPlane("XY", height)
}

function cursorFace() {
  const { rear, front, rearHalf } = cursorOutline(CAP_ROWS[1].side)

  return { left: -rearHalf, right: rearHalf, front, rear }
}

function cursorTopHeight() {
  const profile = CAP_ROWS[1]

  return (profile.frontHeight + profile.rearHeight) / 2
}

function buildCursorCap() {
  const height = cursorTopHeight(),
    reach = height + OVERRUN,
    wall = CAP_ROWS[1].side,
    lower = cursorSketch(0, 0),
    upper = cursorSketch((wall * reach) / height, reach),
    face = cursorFace(),
    body = lower.loftWith(upper),
    flat = makeBox([-100, -100, height], [100, 100, height + 2 * reach]),
    bevelFrom = face.front + (face.rear - face.front) * CURSOR_BEVEL.share,
    bevel = makeBox([-100, -100, 0], [100, 0, 100])
      .rotate(CURSOR_BEVEL.angle, [0, 0, 0], [1, 0, 0])
      .translate([0, bevelFrom, height])

  return body.cut(flat).cut(bevel)
}

function turnPoint([x, y], degrees) {
  const angle = degrees * RADIANS,
    cosine = Math.cos(angle),
    sine = Math.sin(angle)

  return [x * cosine - y * sine, x * sine + y * cosine]
}

function turnedFace(face, degrees) {
  const corners = [
      [face.left, face.front],
      [face.right, face.front],
      [face.right, face.rear],
      [face.left, face.rear]
    ].map(corner => turnPoint(corner, degrees)),
    xs = corners.map(([x]) => x),
    ys = corners.map(([, y]) => y)

  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    front: Math.min(...ys),
    rear: Math.max(...ys)
  }
}

// The square's middle, across and up the slope on the case and across and down in the atlas.
function cursorSquareMiddle() {
  const rows = CURSOR_SQUARE.keys / 2

  return {
    across: (CURSOR_SQUARE.left + rows) * KEY_PITCH,
    along: KEY_GRID_REAR - (CURSOR_SQUARE.row + rows) * KEY_PITCH,
    down: (CURSOR_SQUARE.row - KEY_ATLAS_TOP_ROW + rows) * KEY_PITCH
  }
}

function layCursorKey({ number, name, turn }) {
  const upFace = cursorFace(),
    face = turnedFace(upFace, turn),
    { across, along, down } = cursorSquareMiddle(),
    centre = onSlopeAt(KEY_GRID_LEFT + across, along, -CAP_SUNK),
    legend = [
      (across + face.left) / LEGEND_ATLAS_WIDTH,
      (down - face.rear) / LEGEND_ATLAS_DEPTH,
      (face.right - face.left) / LEGEND_ATLAS_WIDTH,
      (face.rear - face.front) / LEGEND_ATLAS_DEPTH
    ]

  return { number, name, turn, place: centred(centre), face, legend, printedAt: [across, down] }
}

function buildCursorKeycaps(laid) {
  const cap = buildCursorCap()

  return laid.map(key => ({
    name: `keycaps-${key.name}`,
    shape: cap.clone().rotate(key.turn, [0, 0, 0], [0, 0, 1]),
    material: KEYCAPS.blue,
    face: key.face,
    tilt: TOP_ANGLE,
    legends: LEGENDS_PRINT,
    keys: [key]
  }))
}

function fontSize(capHeight, capHeightPerEm = HEROS_CAP_HEIGHT) {
  return capHeight / capHeightPerEm
}

function escapeXml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

function drawText(
  text,
  { x = 0, baseline, capHeight, weight = 400, anchor = "middle", ink = null, condensed = false }
) {
  const size = condensed ? fontSize(capHeight, HEROS_CONDENSED_CAP_HEIGHT) : fontSize(capHeight),
    escaped = escapeXml(text),
    fill = ink ? ` fill="${ink}"` : "",
    family = condensed ? ` font-family="${HEROS_CONDENSED}"` : ""

  return `<text x="${x}" y="${baseline}"${family} font-size="${size}" font-weight="${weight}" text-anchor="${anchor}"${fill}>${escaped}</text>`
}

// Words set from a left edge to a right edge, the face stretched to the measured box, or about a middle at their own width.
function drawFitted(
  words,
  box,
  { family = HEROS, perEm = HEROS_CAP_HEIGHT, weight = 400, ink, lean = 0 }
) {
  const size = fontSize(box.capHeight, perEm),
    escaped = escapeXml(words),
    fitted = Object.hasOwn(box, "left"),
    x = fitted ? box.left : box.middle,
    setting = fitted
      ? `textLength="${box.right - box.left}" lengthAdjust="spacingAndGlyphs"`
      : `text-anchor="middle"`

  return `<text transform="translate(${x} ${box.baseline}) skewX(${-lean})" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${ink}" ${setting}>${escaped}</text>`
}

function drawLine([fromX, fromY], [toX, toY], thickness, colour) {
  return `<line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="${colour}" stroke-width="${thickness}"/>`
}

function drawBox({ left, right, top, bottom }, { fill = "none", stroke = null, thickness = 0 }) {
  const outline = stroke ? ` stroke="${stroke}" stroke-width="${thickness}"` : ""

  return `<rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" fill="${fill}"${outline}/>`
}

function drawArrow(arrow, [x, y], degrees) {
  const tip = -arrow.length / 2,
    tail = arrow.length / 2,
    neck = tip + arrow.headLength,
    head = arrow.headWidth / 2,
    shaft = arrow.shaft / 2

  return `<path transform="translate(${x} ${y}) rotate(${degrees})" d="M 0 ${tip} L ${head} ${neck} H ${shaft} V ${tail} H ${-shaft} V ${neck} H ${-head} Z"/>`
}

function svgOpen(width, height, ink = null) {
  const fill = ink ? ` fill="${ink}"` : ""

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${HEROS}"${fill}>`
}

// Where a legend's lines stand on a key's top, measured down from its rear edge.
function legendPlaces(depth) {
  const middle = depth / 2

  return {
    letter: { baseline: middle + LETTER_HEIGHT / 2, capHeight: LETTER_HEIGHT },
    word: { baseline: middle + WORD_HEIGHT / 2, capHeight: WORD_HEIGHT, weight: 700 },
    upper: { baseline: UPPER.top + UPPER.capHeight, capHeight: UPPER.capHeight },
    lower: { baseline: LOWER.baseline, capHeight: LOWER.capHeight },
    keypad: { baseline: middle + KEYPAD_HEIGHT / 2, capHeight: KEYPAD_HEIGHT },
    firstLine: { baseline: middle - LINE_GAP / 2, capHeight: WORD_HEIGHT, weight: 700 },
    secondLine: {
      baseline: middle + LINE_GAP / 2 + WORD_HEIGHT,
      capHeight: WORD_HEIGHT,
      weight: 700
    }
  }
}

const PLACES = legendPlaces(CAP_BASE - CAP_ROWS[1].front - CAP_ROWS[1].rear)

function drawPair(upper, lower) {
  return drawText(upper, PLACES.upper) + drawText(lower, PLACES.lower)
}

function drawSlashedZero(place, x = 0) {
  const zero = drawText("0", { ...place, x }),
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

function drawBrokenBar(place) {
  const dash = place.capHeight * BROKEN_BAR.dash,
    width = place.capHeight * BROKEN_BAR.width,
    top = place.baseline - place.capHeight

  return `<rect x="${-width / 2}" y="${top}" width="${width}" height="${dash}"/><rect x="${-width / 2}" y="${place.baseline - dash}" width="${width}" height="${dash}"/>`
}

function drawUnderscore() {
  const middle = UPPER.top + UPPER.capHeight / 2

  return `<rect x="${-UNDERSCORE.width / 2}" y="${middle - UNDERSCORE.thickness / 2}" width="${UNDERSCORE.width}" height="${UNDERSCORE.thickness}"/>`
}

function drawThinArrow() {
  return drawArrow(THIN_ARROW, [0, PLACES.lower.baseline - THIN_ARROW.length / 2], ARROW_UP)
}

function drawWord(word) {
  return drawText(word, PLACES.word)
}

function drawLetter(letter) {
  return drawText(letter, PLACES.letter)
}

function drawLines(first, second) {
  return drawText(first, PLACES.firstLine) + drawText(second, PLACES.secondLine)
}

function drawLeaningF() {
  const size = fontSize(KEYPAD_HEIGHT),
    middle = PLACES.keypad.baseline - KEYPAD_HEIGHT / 2

  return `<text transform="translate(${-KEYPAD_APART / 2} ${middle}) skewX(${-KEYPAD_LEAN})" y="${KEYPAD_HEIGHT / 2}" font-size="${size}" text-anchor="middle">f</text>`
}

function drawFunctionKey(digit) {
  return drawLeaningF() + drawText(digit, { ...PLACES.keypad, x: KEYPAD_APART / 2 })
}

function drawKeypadZero() {
  return drawLeaningF() + drawSlashedZero(PLACES.keypad, KEYPAD_APART / 2)
}

// A cursor key's chevron stands across the middle of its top's outer half, pointing out of the square; it is drawn for the up key about the square's middle and turned.
function drawChevron(turn) {
  const face = cursorFace(),
    outerHalf = face.rear - ((face.rear - face.front) * CURSOR_BEVEL.share) / 2,
    half = CHEVRON.width / 2,
    tip = -outerHalf - CHEVRON.rise / 2,
    foot = -outerHalf + CHEVRON.rise / 2

  return `<polyline transform="rotate(${-turn})" points="${-half},${foot} 0,${tip} ${half},${foot}" fill="none" stroke="${LEGEND_INK}" stroke-width="${CHEVRON.stroke}"/>`
}

const UK_LEGENDS = new Map([
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
  [32, drawUnderscore() + drawSlashedZero(PLACES.lower)],
  [25, drawPair("=", "-")],
  [24, drawText("£", PLACES.upper) + drawThinArrow()],
  [16, drawWord("CLR")],
  [79, drawWord("DEL")],
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
  [26, drawBrokenBar(PLACES.upper) + drawText("@", PLACES.lower)],
  [17, drawPair("{", "[")],
  [18, drawWord("ENTER")],
  [70, drawLines("CAPS", "LOCK")],
  [69, drawLetter("A")],
  [60, drawLetter("S")],
  [61, drawLetter("D")],
  [53, drawLetter("F")],
  [52, drawLetter("G")],
  [44, drawLetter("H")],
  [45, drawLetter("J")],
  [37, drawLetter("K")],
  [36, drawLetter("L")],
  [29, drawPair("*", ":")],
  [28, drawPair("+", ";")],
  [19, drawPair("}", "]")],
  [21, drawWord("SHIFT")],
  [71, drawLetter("Z")],
  [63, drawLetter("X")],
  [62, drawLetter("C")],
  [55, drawLetter("V")],
  [54, drawLetter("B")],
  [46, drawLetter("N")],
  [38, drawLetter("M")],
  [39, drawPair("<", ",")],
  [31, drawPair(">", ".")],
  [30, drawPair("?", "/")],
  [22, drawLetter("\\")],
  [47, ""],
  [23, drawWord("CTRL")],
  [10, drawFunctionKey("7")],
  [11, drawFunctionKey("8")],
  [3, drawFunctionKey("9")],
  [20, drawFunctionKey("4")],
  [12, drawFunctionKey("5")],
  [4, drawFunctionKey("6")],
  [13, drawFunctionKey("1")],
  [14, drawFunctionKey("2")],
  [5, drawFunctionKey("3")],
  [15, drawKeypadZero()],
  [7, drawLetter(".")],
  [6, drawWord("ENTER")],
  [9, drawWord("COPY")],
  [0, drawChevron(0)],
  [8, drawChevron(90)],
  [2, drawChevron(180)],
  [1, drawChevron(270)]
])

function drawLegends(keys) {
  const drawn = [svgOpen(LEGEND_ATLAS_WIDTH, LEGEND_ATLAS_DEPTH, LEGEND_INK)]

  for (const key of keys) {
    const [axis, rear] = key.printedAt,
      legend = UK_LEGENDS.get(key.number)

    drawn.push(`<g transform="translate(${axis} ${rear})">${legend}</g>`)
  }

  drawn.push("</svg>")

  return drawn.join("\n")
}

function drawAmstradNameplate(version) {
  const plate = AMSTRAD_PLATE,
    { inks } = plate,
    smallWords = version.smallWords.map(word =>
      drawFitted(word.words, { ...word, ...plate.smallWords }, { ink: inks.words })
    ),
    bars = plate.bars.lefts.map((left, index) =>
      drawBox(
        { left, right: left + plate.bars.width, top: plate.bars.top, bottom: plate.bars.bottom },
        { fill: inks.bars[index] }
      )
    ),
    middle = (plate.bars.top + plate.bars.bottom) / 2,
    barsRight = plate.bars.lefts.at(-1) + plate.bars.width,
    lampWord = version.lampWord
      ? drawFitted(plate.lampWord.words, plate.lampWord, { ink: inks.lampWord })
      : ""

  return [
    drawFitted(plate.wordmark.words, plate.wordmark, {
      family: HEROS_CONDENSED,
      perEm: HEROS_CONDENSED_CAP_HEIGHT,
      weight: 700,
      ink: inks.wordmark
    }),
    ...smallWords,
    drawFitted(plate.model.words, plate.model, {
      family: HEROS_CONDENSED,
      perEm: HEROS_CONDENSED_CAP_HEIGHT,
      ink: inks.model
    }),
    drawBox(plate.frame, { fill: inks.frame }),
    ...bars,
    drawLine([plate.bars.lefts[0], middle], [barsRight, middle], plate.bars.line, inks.frame),
    drawFitted(version.colour.words, { ...version.colour, ...plate.colour }, { ink: inks.colour }),
    lampWord
  ].join("\n")
}

function drawSchneiderNameplate() {
  const plate = SCHNEIDER_PLATE,
    { inks, stripes } = plate,
    run = (stripes.bottom - stripes.top) * tangent(stripes.lean),
    stripesDrawn = stripes.middles.map(function (middle, index) {
      const footLeft = middle - stripes.width / 2 - run / 2,
        footRight = footLeft + stripes.width,
        corners = [
          [footLeft + run, stripes.top],
          [footRight + run, stripes.top],
          [footRight, stripes.bottom],
          [footLeft, stripes.bottom]
        ],
        points = corners.map(([x, y]) => `${x},${y}`).join(" ")

      return `<polygon points="${points}" fill="${inks.stripes[index]}"/>`
    }),
    line = plate.line.words.map(word =>
      drawFitted(word.words, { ...word, ...plate.line }, { ink: inks.print })
    )

  return [
    drawSchneiderMark(plate.mark, inks.print),
    drawFitted(plate.name.words, plate.name, { weight: 700, ink: inks.print }),
    drawFitted(plate.division.words, plate.division, {
      family: HEROS_CONDENSED,
      perEm: HEROS_CONDENSED_CAP_HEIGHT,
      ink: inks.print,
      lean: plate.division.lean
    }),
    ...line,
    ...stripesDrawn,
    drawLine(
      [plate.rule.x, plate.rule.top],
      [plate.rule.x, plate.rule.bottom],
      plate.rule.width,
      inks.print
    ),
    drawFitted(plate.lampWord.words, plate.lampWord, { ink: inks.print })
  ].join("\n")
}

// Each language the plates were printed in, the UK's own first: the Spanish and every other 664 wore the UK's [A], the Spanish manual's words for the case, https://archive.org/details/Amstrad_CPC664_Manual_del_Usuario_1984_AMSOFT_ES; the French their own, and the German Schneider's.
const NAMEPLATE_LETTERING = {
  en: () => drawAmstradNameplate(ENGLISH_PLATE_WORDS),
  fr: () => drawAmstradNameplate(FRENCH_PLATE_WORDS),
  de: drawSchneiderNameplate
}

function drawNameplate(language) {
  const width = BADGE.right - BADGE.left,
    depth = BADGE.rear - BADGE.front,
    drawLettering = NAMEPLATE_LETTERING[language],
    lettering = drawLettering()

  return [
    svgOpen(width, depth),
    `<rect width="${width}" height="${depth}" fill="${BADGE_PLATE.colour}"/>`,
    lettering,
    "</svg>"
  ].join("\n")
}

// The dot matrix's letters as outlines, which the grid of dots is clipped to.
function fOutline(left) {
  const { top, bottom, stem, bar, straightRight, middleBar } = FDD,
    inner = left + stem

  return `M ${left} ${top} H ${straightRight} V ${top + bar} H ${inner} V ${middleBar[0]} H ${straightRight} V ${middleBar[1]} H ${inner} V ${bottom} H ${left} Z`
}

function lOutline(left) {
  const { top, bottom, stem, bar, straightRight } = FDD,
    inner = left + stem

  return `M ${left} ${top} H ${inner} V ${bottom - bar} H ${straightRight} V ${bottom} H ${left} Z`
}

function dOutline(left) {
  const { top, bottom, stem, roundWidth, outerRadius, innerRadius, counter } = FDD,
    inner = left + stem,
    turn = left + roundWidth - outerRadius

  return [
    `M ${left} ${top} H ${turn} A ${outerRadius} ${outerRadius} 0 0 1 ${turn} ${bottom} H ${left} Z`,
    `M ${inner} ${counter[0]} H ${turn} A ${innerRadius} ${innerRadius} 0 0 1 ${turn} ${counter[1]} H ${inner} Z`
  ].join(" ")
}

const DOT_LETTERS = { F: fOutline, L: lOutline, D: dOutline }

function drawDots(firstColumn, columns) {
  const dots = []

  for (let row = 0; row < FDD.rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = firstColumn + column * FDD.across,
        y = FDD.firstRow + row * FDD.down

      dots.push(`<circle cx="${x}" cy="${y}" r="${FDD.dot / 2}"/>`)
    }
  }

  return dots.join("")
}

function drawDotLetters(letters, ink) {
  const drawn = Array.from(letters).map(function (letter, index) {
    const { left, firstColumn, columns } = FDD.letters[index],
      id = `dot-letter-${index}`,
      outline = DOT_LETTERS[letter],
      shape = outline(left)

    return [
      `<clipPath id="${id}"><path d="${shape}" clip-rule="evenodd"/></clipPath>`,
      `<g clip-path="url(#${id})" fill="${ink}">${drawDots(firstColumn, columns)}</g>`
    ]
  })

  return [
    `<defs>${drawn.map(([clip]) => clip).join("")}</defs>`,
    ...drawn.map(([, dots]) => dots)
  ].join("\n")
}

function drawComb({ left, right, top, bottom, cycles, stroke }, ink) {
  const period = (right - left) / cycles,
    steps = [`M ${left} ${top}`]

  for (let cycle = 0; cycle < cycles; cycle++) {
    const start = left + cycle * period

    steps.push(`H ${start + period / 2} V ${bottom} H ${start + period} V ${top}`)
  }

  return `<path d="${steps.join(" ")}" fill="none" stroke="${ink}" stroke-width="${stroke}"/>`
}

function drawBoxedChart(plate) {
  const chart = COLOUR_CHART,
    size = fontSize(chart.capHeight, HEROS_CONDENSED_CAP_HEIGHT),
    { rules, words } = PLATE_INKS,
    drawn = [
      drawBox(
        { left: chart.left, right: chart.right, top: chart.top, bottom: chart.bottom },
        { stroke: rules, thickness: RULE }
      ),
      drawLine([chart.left, chart.headingRule], [chart.right, chart.headingRule], RULE, rules),
      ...chart.columnRules.map(x =>
        drawLine([x, chart.headingRule], [x, chart.bottom], RULE, rules)
      )
    ]

  for (const [number, name] of plate.names.entries()) {
    const column = Math.floor(number / chart.rows),
      row = number % chart.rows,
      baseline = chart.firstTop + row * chart.pitch + chart.capHeight,
      setting = `y="${baseline}" font-family="${HEROS_CONDENSED}" font-size="${size}" font-weight="${plate.namesWeight}" fill="${words}"`

    drawn.push(
      `<text x="${chart.numbers[column]}" ${setting}>${number}</text>`,
      `<text x="${chart.names[column]}" ${setting}>${escapeXml(name)}</text>`
    )
  }

  return drawn.join("\n")
}

// Schneider's table: three columns, each name on its own line or two, the next number following under the last line.
function drawRuledChart(plate) {
  const { ink, rules, ruleSpan, columns, headings, rows } = plate,
    [left, right] = ruleSpan,
    drawn = rules.map(y => drawLine([left, y], [right, y], RULE, ink)),
    bold = { weight: 700, anchor: "start", ink, condensed: true },
    numbersPerColumn = 9

  for (const x of columns.rules) {
    const rule = drawLine([x, rules[1]], [x, rules.at(-1)], RULE, ink)

    drawn.push(rule)
  }

  for (let column = 0; column < columns.names.length; column++) {
    const first = { ...bold, capHeight: headings.capHeight, baseline: headings.firstBaseline },
      second = { ...first, baseline: headings.secondBaseline }

    drawn.push(
      drawText("Tinte", { ...first, x: columns.numbers[column] }),
      drawText("Farbe", { ...first, x: columns.names[column] }),
      drawText("(INK)", { ...second, x: columns.numbers[column] })
    )

    let line = 0
    for (let row = 0; row < numbersPerColumn; row++) {
      const number = column * numbersPerColumn + row,
        lines = plate.names[number],
        baseline = rows.firstBaseline + line * rows.pitch,
        place = { ...bold, capHeight: rows.capHeight },
        figure = String(number),
        numbered = drawText(figure, { ...place, baseline, x: columns.numbers[column] })

      drawn.push(numbered)

      for (const [index, words] of lines.entries()) {
        const named = drawText(words, {
          ...place,
          baseline: baseline + index * rows.pitch,
          x: columns.names[column]
        })

        drawn.push(named)
      }

      line += lines.length
    }
  }

  return drawn.join("\n")
}

function drawKeyBox(left, top, width, height, ink) {
  return drawBox(
    { left, right: left + width, top, bottom: top + height },
    { stroke: ink, thickness: LINE }
  )
}

function drawKeyNumber(number, x, middle, ink) {
  const { capHeight } = KEY_MAP,
    figure = String(number)

  return drawText(figure, { x, baseline: middle + capHeight / 2, capHeight, ink })
}

// The key map's lines and its numbers, the one ink each; Schneider's plate prints both in its one ink.
function drawKeyMap(rules, words) {
  const block = KEY_BLOCK.map(([x, y]) => `${x},${y}`).join(" "),
    returnKey = PLATE_RETURN,
    [copyLeft, copyRight, copyTop, copyBottom] = CURSOR_BOX.copy,
    middleX = (copyLeft + copyRight) / 2,
    middleY = (copyTop + copyBottom) / 2,
    box = CURSOR_BOX,
    drawn = [
      `<polygon points="${block}" fill="none" stroke="${rules}" stroke-width="${RULE}"/>`,
      `<path d="M ${returnKey.left} ${returnKey.top} H ${returnKey.right} V ${returnKey.bottom} H ${returnKey.legLeft} V ${returnKey.step} H ${returnKey.left} Z" fill="none" stroke="${rules}" stroke-width="${LINE}"/>`,
      drawKeyNumber(
        18,
        (returnKey.legLeft + returnKey.right) / 2,
        (returnKey.top + returnKey.bottom) / 2,
        words
      )
    ]

  for (const key of PLATE_KEYS) {
    const top = KEY_MAP.top + key.row * KEY_MAP.down

    drawn.push(
      drawKeyBox(key.left, top, key.width, KEY_MAP.key, rules),
      drawKeyNumber(key.number, key.left + key.width / 2, top + KEY_MAP.key / 2, words)
    )
  }

  drawn.push(
    drawKeyBox(box.left, box.top, box.right - box.left, box.bottom - box.top, rules),
    drawKeyBox(copyLeft, copyTop, copyRight - copyLeft, copyBottom - copyTop, rules),
    drawLine([box.left, box.top], [copyLeft, copyTop], LINE, rules),
    drawLine([box.right, box.top], [copyRight, copyTop], LINE, rules),
    drawLine([box.left, box.bottom], [copyLeft, copyBottom], LINE, rules),
    drawLine([box.right, box.bottom], [copyRight, copyBottom], LINE, rules),
    drawKeyNumber(9, middleX, middleY, words),
    drawKeyNumber(0, middleX, (box.top + copyTop) / 2, words),
    drawKeyNumber(2, middleX, (copyBottom + box.bottom) / 2, words),
    drawKeyNumber(8, (box.left + copyLeft) / 2, middleY, words),
    drawKeyNumber(1, (copyRight + box.right) / 2, middleY, words),
    drawKeyBox(
      KEYPAD_BOX.left,
      KEYPAD_BOX.top,
      KEYPAD_BOX.right - KEYPAD_BOX.left,
      KEYPAD_BOX.bottom - KEYPAD_BOX.top,
      rules
    ),
    drawKeyBox(
      NAME_BAR.left,
      NAME_BAR.top,
      NAME_BAR.right - NAME_BAR.left,
      NAME_BAR.bottom - NAME_BAR.top,
      rules
    )
  )

  return drawn.join("\n")
}

function drawAmstradDrivePlate(plate) {
  const { rules, words } = PLATE_INKS,
    { hairline } = plate

  return [
    drawDotLetters(plate.letters, words),
    drawFitted(plate.title.words, plate.title, { ink: words }),
    drawBoxedChart(plate),
    drawFitted(plate.chartHeading.words, plate.chartHeading, { ink: words }),
    drawFitted(plate.keyHeading.words, plate.keyHeading, { ink: words }),
    drawComb(plate.comb, rules),
    drawKeyMap(rules, words),
    drawFitted(plate.nameBarWord.words, plate.nameBarWord, {
      family: HEROS_CONDENSED,
      perEm: HEROS_CONDENSED_CAP_HEIGHT,
      weight: 700,
      ink: words
    }),
    drawLine([hairline.left, hairline.y], [hairline.right, hairline.y], LINE, rules)
  ].join("\n")
}

function drawSchneiderDrivePlate(plate) {
  const { ink } = plate,
    { margin, gap, capHeight, length, lift } = SCHNEIDER_NAME_BAR,
    barHeight = NAME_BAR.bottom - NAME_BAR.top,
    mark = {
      left: NAME_BAR.left + margin,
      right: NAME_BAR.left + margin + barHeight,
      top: NAME_BAR.top + margin,
      bottom: NAME_BAR.bottom - margin
    },
    name = {
      left: mark.right + gap,
      right: mark.right + gap + length * barHeight,
      baseline: NAME_BAR.bottom - lift,
      capHeight: barHeight * capHeight
    }

  return [
    drawDotLetters(plate.letters, ink),
    drawFitted(plate.title.words, plate.title, { weight: 700, ink }),
    drawRuledChart(plate),
    drawFitted(plate.chartHeading.words, plate.chartHeading, { weight: 700, ink }),
    drawFitted(plate.keyHeading.words, plate.keyHeading, { weight: 700, ink }),
    `<g transform="translate(0 ${plate.mapShift})">`,
    drawKeyMap(ink, ink),
    drawSchneiderMark(mark, ink),
    drawFitted("Schneider", name, { weight: 700, ink }),
    "</g>"
  ].join("\n")
}

// The drive plate's artwork in each language it was printed in.
const DRIVE_PLATE_ARTWORK = {
  en: () => drawAmstradDrivePlate(UK_DRIVE_PLATE),
  fr: () => drawAmstradDrivePlate(FRENCH_DRIVE_PLATE),
  de: () => drawSchneiderDrivePlate(SCHNEIDER_DRIVE_PLATE)
}

function drawDrivePlate(language) {
  const drawArtwork = DRIVE_PLATE_ARTWORK[language],
    artwork = drawArtwork()

  return [
    svgOpen(DRIVE_PLATE.width, DRIVE_PLATE.depth),
    `<rect width="${DRIVE_PLATE.width}" height="${DRIVE_PLATE.depth}" fill="${DRIVE_PLATE_GROUND.colour}"/>`,
    artwork,
    "</svg>"
  ].join("\n")
}

export function buildCpc664() {
  const laid = KEYS.map(layKey),
    { leg } = RETURN_KEY,
    returnKey = layKey({ ...RETURN_KEY, ...leg }),
    cursorKeys = CURSOR_KEYS.map(layCursorKey),
    lettered = [...laid, returnKey, ...cursorKeys],
    plates = Object.keys(NAMEPLATE_LETTERING).flatMap(language => [
      { name: BADGE_PRINT, language, svg: drawNameplate(language), pixels: PLATE_PIXELS },
      { name: DRIVE_PLATE_PRINT, language, svg: drawDrivePlate(language), pixels: PLATE_PIXELS }
    ])

  return {
    tessellation: TESSELLATION,
    parts: [
      { name: "cabinet-top", shape: buildCabinetTop().translate(CENTRING), material: CABINET_TOP },
      buildCabinetBottom(),
      buildFeet(),
      buildInterior(),
      { name: "drive", shape: buildDrive().translate(CENTRING), material: BEZEL },
      driveSlot(),
      buildEjectButton(),
      buildDriveLamp(),
      ...buildKeycaps(laid),
      buildReturnKeycap(returnKey),
      ...buildCursorKeycaps(cursorKeys),
      buildBadge(),
      buildPowerLamp(),
      buildDrivePlate(),
      buildPowerKnob(),
      buildVolumeWheel(),
      buildCordBlock(),
      buildDcCord(),
      ...buildDcLead(),
      ...buildTapeLead(),
      ...socketMouths()
    ],
    prints: [
      { name: LEGENDS_PRINT, language: ENGLISH, svg: drawLegends(lettered), pixels: LEGEND_PIXELS },
      ...plates
    ]
  }
}
