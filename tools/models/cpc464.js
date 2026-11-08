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

// x runs from the left end, y back from the front top edge and z up from the cabinet bottom's base, in millimetres. The feet stand below it, under a negative z.
// What lies on the top is laid out in the top's own plane: across as x, and along the slope from the rear top edge as it was measured, or up it from the front top edge where it is built.

// "DIMENSIONS (mm): w h d — Keyboard : 580 70 170" [A], CPC464 Service Manual 1985 p2, the figures Amstrad printed at the launch and again, unchanged, for the 664: https://archive.org/details/Amstrad_CPC464_Service_Manual_1985_Amstrad_Consumer_Electronics
// Museums measure it 568 to the millimetre twice, "Overall: 70 mm x 165 mm x 568 mm" and "568 x 165 x 65 mm", and 22⅜ in, 568.3; in round figures 570 twice, one of them the unit photographed below [B]: https://collection.sciencemuseumgroup.org.uk/objects/co8413235/amstrad-cpc-464-computer-with-cassette-drive, https://archivesetmanuscrits.bnf.fr/ark:/12148/cc97705f/ca19918160, https://www.computerhistory.org/collections/catalog/102673165, https://archivesetmanuscrits.bnf.fr/ark:/12148/cc97705f/ca19919170 and https://blogs.upm.es/museotelecomunicaciones/ordenador-domestico-amstrad-cpc-464/
// Two more measure 575 to the half centimetre [B], http://ceres.mcu.es/pages/Main?idt=121782&inventary=CE2017/009/009&table=FMUS&museum=MUPV and https://data.tmw.at/object/190299, and the V&A's unit 557 [B], https://collections.vam.ac.uk/item/O1172044/. 568 is taken, and Amstrad's 580, the two 575s and the V&A's 557 stand beside it.
// A public-domain studio photograph of that unit from above, rectified by a homography fitted to 94 points between its keys at their 19.05 pitch, puts the ends 566.3 apart; that pitch is a replacement keyboard's [D], https://github.com/Bread80/CPC_Keyboards, checked there against the 118.0 of a window made to fit the cassette door [D], https://www.thingiverse.com/thing:4599630, to 0.5% [E]: https://commons.wikimedia.org/wiki/Category:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Amstrad_-_CPC_464._Micro-ordinateur_Amstrad_CPC_464,_n%C2%B0_de_s%C3%A9rie_du_clavier_533-7834019_-_btv1b55013024n
// Its plan is kept as it reads from the left end, where a second photograph puts ESC too, so the 1.7 the museums add falls at the right end. Photographs of two rears, scaled by connectors the service manuals' board drawings place, give 571.0 and 572.9 at the parting lip, both reading high by the depth their references stand behind it [E].
const WIDTH = 568,
  DEPTH = 170

// Traced from a square-on photograph of a late German unit's left end, scaled by its joystick socket's pins across and down, corrected for a camera looking down on it by a long-lens view of another unit's ends, and brought from the trace's own 171.7 to Amstrad's 170 [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html and https://www.vecchicomputer.com/2025/02/amstrad-schneider-cpc-464-1984/
// The cabinets part at a lip 22.2 above the base at the rear, the parting line falling 6.0° to 4.4 at the front. Above it the upper rear face leans forward 10.75° to meet the top, a plane falling 6.98° to the front top edge at 43.4, and the front face leans forward 2.54° down to the parting line.
// The long-lens view reads the lip 25.5 to 27.5, the rear top edge 66.4 and the front top edge 45.0, against 22.2, 63.3 and 43.4 here, and the leans of both faces rest on its correction; the disagreement stands until a real unit is measured. A monitor stand made to hold the machine on its front edge allows it no more than 46.35 there [D]: https://www.printables.com/model/527817
const LIP_HEIGHT = 22.2,
  FRONT_PARTING_HEIGHT = 4.4,
  FRONT_TOP_HEIGHT = 43.4,
  TOP_ANGLE = 6.98,
  REAR_FACE_LEAN = 10.75,
  FRONT_FACE_LEAN = 2.54

// The same trace: the cabinet bottom's rear bevels back 32.6° from the vertical from the lip to the base, and its front chamfers at 31.7° from the horizontal through a point 9.2 behind the front top edge and 0.9 up, its top standing behind the front face's foot [E]. How the bevel rounds into the base is not read, and 3 is taken.
// Its ends are not walls but faces inclined 38° from the vertical, stepping in 17.2 at the rear over the lip's height on a square photograph of an early rear and narrowing toward the front on the underside's [E]: https://commons.wikimedia.org/wiki/File:Amstrad_CPC464-IMG_7198.jpg. Whether each end is one plane along its whole length is not known, and one is taken.
const REAR_BEVEL_ANGLE = 32.6,
  FRONT_CHAMFER_ANGLE = 31.7,
  FRONT_CHAMFER_POINT = [9.2, 0.9],
  BEVEL_ROUND = 3,
  END_INCLINE = 38

// The top's corners in plan read 2.8 ±0.5 on the photograph from above; on the end the top-rear edge reads 2 ±0.7, the top-front edge 1.5 to 2 ±0.7, of which 1.8 is taken, and the ends' top edges 1 ±0.5 [E].
const PLAN_RADIUS = 2.8,
  REAR_TOP_RADIUS = 2,
  FRONT_TOP_RADIUS = 1.8,
  END_TOP_RADIUS = 1

// Eight feet about 7 across, their centres read on a square photograph of the same late unit's underside rectified to the top's 568 by 170, ±2, and standing 2 to 2.5 on the end's photograph [E]; 2.2 is taken.
const FOOT = { diameter: 7, height: 2.2 },
  FOOT_PLACES = [
    { middle: 29, fromRear: 20.5 },
    { middle: 171.2, fromRear: 20.5 },
    { middle: 283.6, fromRear: 20.5 },
    { middle: 540.7, fromRear: 20.5 },
    { middle: 32.7, fromRear: 150.5 },
    { middle: 172.4, fromRear: 150.5 },
    { middle: 282.8, fromRear: 150.5 },
    { middle: 535.7, fromRear: 150.5 }
  ]

// The keys stand on the replacement keyboard's 19.05 grid, which its maker says "fits into an original CPC464 case (all variants)" [D]. On the photograph from above, ESC's cell has its left edge 33.8 from the left end and its rear edge 55.6 down the slope from the rear top edge, the photograph's parallax between the key tops and the case taken out [E]. Read without that correction it stands at 32.9 ±1, and on a photograph of the replacement keyboard in a real case at 33.6 ±0.6 [E]; the disagreement stands until a real unit is measured.
const KEY_PITCH = 19.05,
  KEY_GRID_LEFT = 33.8,
  KEY_GRID_FROM_REAR = 55.6

// Every key by its number in the firmware's key matrix [A], SOFT 968 Appendix I, https://archive.org/details/SOFT968TheAmstrad6128FirmwareManual, with its cell's left edge and row in keys from ESC's and its width in keys, from the replacement keyboard's footprints [D], whose centres stand within 1 of the middles of the real openings on the photograph from above [E]. The cursor keys stand in a cross above the keypad, its arms 1.3025 rows above the keypad's top row.
// Each key's colour is read on the same photograph: ESC red; TAB, CAPS LOCK, both SHIFTs, CTRL, DEL and COPY green; both ENTERs blue; the rest dark [E].
const KEYS = [
  { number: 66, left: 0, row: 0, colour: "red" },
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
  { number: 79, left: 14, row: 0, width: 1.5, colour: "green" },
  { number: 68, left: 0, row: 1, width: 1.5, colour: "green" },
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
  { number: 70, left: 0, row: 2, width: 1.75, colour: "green" },
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
  { number: 21, left: 0, row: 3, width: 2.25, colour: "green" },
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
  { number: 21, left: 13.25, row: 3, width: 2.25, colour: "green" },
  { number: 47, left: 3.25, row: 4, width: 9 },
  { number: 23, left: 12.25, row: 4, colour: "green" },
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
  { number: 0, left: 17.5, row: -2.3025 },
  { number: 8, left: 16.5, row: -1.3025 },
  { number: 9, left: 17.5, row: -1.3025, colour: "green" },
  { number: 1, left: 18.5, row: -1.3025 },
  { number: 2, left: 17.5, row: -0.3025 }
]

// ENTER, key 18, is an inverted L over the second and third rows: 2 keys wide across the top from 13.5, 1.75 below from 13.75, sharing its right edge [D].
const RETURN_KEY = {
  number: 18,
  row: 1,
  colour: "blue",
  arm: { left: 13.5, width: 2 },
  leg: { left: 13.75, width: 1.75 }
}

// The block's openings follow the keys' cells: on the photograph from above the main opening stands 1.3 and 1.4 clear of them at the ends, 1.0 behind and 0.7 to 0.95 in front, and the keypad's and the cursor cross's alike within the photograph's ±1; 1.1 is taken all round [E]. The keys rise through them; there is no well.
// No source gives how far below the top the floor under the keys lies; 8 is taken until a real unit is measured.
const KEY_CLEARANCE = 1.1,
  FLOOR_BELOW_TOP = 8

// Wierzbowsky's cap made "to fit the keyboards of Amstrad and Schneider CPC464", measured here, stands 12.02 on an 18.00 base with a top 12.43 across, its top dished 1.0 deep, meeting the top's edges at their middles [D], https://www.thingiverse.com/thing:4596135. Its dish is turned about the cap's axis and a sphere fits it only roughly; a sphere is taken. Such a dish leaves each edge straight, which is why no photograph sees a cap's front edge bow [E].
// Its walls curve in toward the top, where every photograph of a real cap reads them planar with sharp top edges; planar is taken. No cap wider than a key has been measured, and those are left undished.
// A low photograph of the front puts the tops 10 ±1 above the case top, so 2 of each cap stand below it [E]: https://commons.wikimedia.org/wiki/File:Amstrad_CPC464-IMG_7170.jpg
const CAP_GAP = 1.05,
  CAP_HEIGHT = 12.02,
  CAP_TOP_INSET = (18 - 12.43) / 2,
  DISH_DEPTH = 1,
  CAP_SUNK = 2

// The badge plate fills a recess as wide as the main opening, 32.5 to 330.4 across and 22.4 to 46.6 down the slope, and the power lamp's dome, about 4.3 across, stands in it at 317.1 and 29.7 [E]. The recess's depth is not measured and is taken at the plate's thickness; how far the dome stands proud is not measured either, and half its width is taken.
const BADGE = { left: 32.5, right: 330.4, fromRear: 22.4, toRear: 46.6 },
  POWER_LAMP = { middle: 317.1, fromRear: 29.7, diameter: 4.3 },
  PLATE_THICKNESS = 0.3

// Behind the badge, 89 slots 3.1 wide at a 5.99 pitch run across the rear top edge, the first's middle 19.5 from the left end, each reaching 6.6 down the slope on top and about 9 down the rear face [E]. Over the speaker, behind the datacorder, seven of them, the 75th to the 81st, run about 29 down the rear face and stand about 2 wide [E], on the late unit's square rear: https://commons.wikimedia.org/wiki/File:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Amstrad_-_CPC_464._Micro-ordinateur_Amstrad_CPC_464,_n%C2%B0_de_s%C3%A9rie_du_clavier_533-7834019_-_btv1b55013024n_(5).jpg
// The case's wall is not measured and 2.5 is taken; through the slots the inside of the case shows.
const VENTS = { first: 19.5, count: 89, pitch: 5.99, width: 3.1, onTop: 6.6, downRear: 9 },
  SPEAKER_SLOTS = { firstSlot: 74, count: 7, width: 2, downRear: 29 },
  CASE_WALL = 2.5

// How far forward the inside behind the rear is drawn, from the rear top edge along the top and from the bevel's foot along the base, and where the rear's openings begin inside it: choices of drawing, not figures of the machine.
const INTERIOR_REACH = { top: 8, floor: 10 },
  OPENINGS_FROM = 152.2

// The late rear on the same photograph, its places scaled from its own 572.9 at the lip to the case's width [E]: a recessed panel from 13.6 to 423.1 standing 24 up the rear face from the lip and open onto it, holding the printer's edge connector 14.3 to 93.3, the 5V DC socket 97.2 to 107.6, the monitor's DIN 111.7 to 129.2 and the expansion's edge connector 147.8 to 243.6. The service manual's later board drawing puts the two edge connectors' middles 143.5 apart [A], amendment service manual p5: https://retronik.silicium.org/DOCUMENTS/Info/Amstrad_CPC/Amstrad%20CPC464%206128%20GT65%20CTM644%20MP3%20CT1%20amendment%20service%20manual.pdf
// The two edge connectors open from 7.5 up the rear face down into the bevel to 17.2 above the base, and the DIN and DC sockets stand 10.1 up the face; the DIN's opening is round-topped, as tall as it is wide, and the DC socket's square, 9 tall [E]. The panel's depth is not measured and 1 is taken.
// Scaled so, the edge connectors' middles stand 141.9 apart, against the board drawing's 143.5, and the disagreement stands until a real unit is measured.
const REAR_PANEL = { left: 13.6, right: 423.1, upFace: 24, depth: 1 },
  EDGE_CONNECTORS = [
    { left: 14.3, right: 93.3 },
    { left: 147.8, right: 243.6 }
  ],
  EDGE_CONNECTOR_TOP_UP_FACE = 7.5,
  EDGE_CONNECTOR_BOTTOM = 17.2,
  DIN_SOCKET = { left: 111.7, right: 129.2, upFace: 10.1 },
  DC_SOCKET = { left: 97.2, right: 107.6, upFace: 10.1, height: 9 }

// Below the lip the bevel is slotted along its length at the top's pitch, but for under the two edge connectors; each slot is taken 2.2 wide and from 6 to 18 above the base, by the square rear [E].
const BEVEL_SLOTS = { width: 2.2, bottom: 6, top: 18 }

// The late left end, on the photograph the profile is traced from: a recessed panel from 40.8 to 126.3 forward of the lip, its top 17.8 below the top and parallel to it, open onto the parting line; in it the stereo jack's round-topped opening 53.7 to 61.9 forward of the lip and 14.9 to 23.9 above the base, and the joystick socket's 97.3 to 118.8 and 9.9 to 24.4 [E]. The panel's depth is not measured and 1.5 is taken.
// The right end, on the same unit: a panel 50.5 to 124.7 forward of the lip, its top 18 below the top, holding the POWER slide's slot 56.9 to 71.8 and 20.0 to 28.5 above the base and the VOLUME wheel's window 91.7 to 117.2 and 17.2 to 24.1, ±2 to 3 [E]. The switch's knob, the wheel and how far either stands proud are not measured: a knob a third of its slot long standing 2, and a wheel standing 1 and stopping 1 short of its window's ends, are taken, the knob at ON, toward the front, as the end's own legend "POWER OFF I I ON" has it read from the rear.
const LEFT_PANEL = { rear: 40.8, front: 126.3, belowTop: 17.8, depth: 1.5 },
  JACK = { rear: 53.7, front: 61.9, bottom: 14.9, top: 23.9 },
  JOYSTICK = { rear: 97.3, front: 118.8, bottom: 9.9, top: 24.4 },
  RIGHT_PANEL = { rear: 50.5, front: 124.7, belowTop: 18, depth: 1.5 },
  POWER_SLOT = { rear: 56.9, front: 71.8, bottom: 20, top: 28.5 },
  VOLUME_WINDOW = { rear: 91.7, front: 117.2, bottom: 17.2, top: 24.1 },
  POWER_KNOB = { share: 1 / 3, standing: 2 },
  WHEEL_STANDING = 1,
  WHEEL_INSET = 1

// The datacorder, measured on the photograph from above rectified at 10 pixels to the millimetre, ±0.5 [E]. Its counter stands in a recess 445.8 to 471.7 across and 19.7 to 27.8 down the slope, three digit wheels showing through a window 449.2 to 460 by 21.7 to 26.2 and the RESET lever 465 to 470 by 20.8 to 26.7; the lever stands about 4 proud on the square rear [E]. The recess's depth is not measured and 2 is taken.
// Above it the case is moulded with "CONT." over "COUNTER" and "INICIO" over "RESET", the late case's own words in its two languages, raised lettering about 1.9 tall from 12.5 down the slope, each pair centred over what it names, at 454.6 and 466.7 across [E]. A plate a print's thickness, sunk flush, stands in for the moulded relief, and can only take the words as the light catches them.
const COUNTER = { left: 445.8, right: 471.7, fromRear: 19.7, toRear: 27.8, depth: 2 },
  COUNTER_WINDOW = { left: 449.2, right: 460, fromRear: 21.7, toRear: 26.2 },
  COUNTER_WHEELS = ["counter-hundreds", "counter-tens", "counter-units"],
  RESET_LEVER = { left: 465, right: 470, fromRear: 20.8, toRear: 26.7, standing: 4 },
  COUNTER_LEGEND = { left: 446, right: 472, fromRear: 12, toRear: 18.5 }

// The cassette lid sits in a recess 428.4 to 547.0 across and 31.7 to 108.0 down the slope; behind it a dark gap runs to 35.5, where the lid hinges, then the lid's own rail to 37.5, its window to 77.2 and its lower panel on to 106.7, where a gap with a finger's notch 5 wide at 478.3 parts it from the inlay, 428.3 to 546.7 by 110.8 to 138.3 [E]. Whether the lid stands proud or sunk is not measured: it is taken flush, 1.5 thick, the notch as deep, and the inlay is printed at a plate's thickness.
// The window is a plate of its own clipped into the lid across its whole width, a near clear one through which a cassette's label keeps 85 to 90 per cent of its red [E]; a replacement made for the lid is 118.0 by 39.0 and 2.0 thick [D], https://www.thingiverse.com/thing:4599630. The lower panel is opaque.
const LID_RECESS = { left: 428.4, right: 547, fromRear: 31.7, toRear: 108 },
  LID_RAIL = { left: 428.4, right: 547, fromRear: 35.5, toRear: 37.5 },
  LID_WINDOW = { left: 428.4, right: 547, fromRear: 37.5, toRear: 77.2 },
  LID_PANEL = { left: 428.4, right: 547, fromRear: 77.2, toRear: 106.7 },
  LID_THICKNESS = 1.5,
  WINDOW_THICKNESS = 2,
  FINGER_NOTCH = { middle: 478.3, width: 5, depth: 1.5 },
  INLAY = { left: 428.3, right: 546.7, fromRear: 110.8, toRear: 138.3 }

// Through the shut lid the photograph from above shows the cassette holder hanging under the window, its opening 443.6 to 532.7 across from 41.9 down the slope; three tabs over a cassette's back edge, their middles 458.9, 485.3 and 516.0 across and 44.7 down, the outer two plastic 6.0 and 7.6 wide, the middle one a metal clip about 3 wide; and a dark block 443.8 to 452.3 by 42.4 to 51.4 at the opening's rear left, where the write-protect tab is felt for [E]. Opened, the holder's walls and the compartment's floor read black, nearly as the inside does [E]: https://commons.wikimedia.org/wiki/File:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Amstrad_-_CPC_464._Micro-ordinateur_Amstrad_CPC_464,_n%C2%B0_de_s%C3%A9rie_du_clavier_533-7834019_-_btv1b55013024n_(16).jpg
// On the floor stand the two spindles, black cones with bright metal tips 69.6 down the slope, ±1.5, about a middle 487.85 across [E], and 42.5 apart, the hubs' pitch the compact cassette's standard gives [A], ECMA-34 Fig. 4: https://ecma-international.org/wp-content/uploads/ECMA-34_3rd_edition_september_1976.pdf. The photograph's 42.2 between the tips is what its parallax makes of 42.5 at their depth [E].
// Between them a bright metal plate 23.2 by 13.1, 62.4 to 75.5 down the slope, stands centred between the cones' feet on the photograph [E], in the opening the cabinet drawing places in the floor between the spindles' holes [A], CPC464 Service Manual p3. The heads lie under the opaque panel, and are not drawn.
// None of the depths is measured. The holder is taken 1.5 thick, a hairline under the window; the floor 20 below the top, under a seated cassette and the holder's lips; the compartment reaching under the opaque panel to 105, past the 104.4 a cassette's tape edge reaches [E], and the holder's opening on under it to 100, where no photograph sees; each spindle a cone 13 across at the floor narrowing to 11 at 2.5 up, under a seated cassette, then a shaft 7.5 across, inside a hub's teeth, to 9.5 up, and its metal tip 2.5 across and 1.5 tall, short of a seated cassette's face; the tabs reaching as far past their middles as their middles stand from the opening's edge; the block up to 17 below the top, under a seated cassette.
const HOLDER_THICKNESS = 1.5,
  HOLDER_OPENING = { left: 443.6, right: 532.7, fromRear: 41.9, toRear: 100 },
  HOLDER_TABS = {
    plastic: [
      { middle: 458.9, width: 6 },
      { middle: 516, width: 7.6 }
    ],
    metal: { middle: 485.3, width: 3 },
    fromRear: 44.7
  },
  COMPARTMENT = { ...LID_WINDOW, toRear: 105, depth: 20 },
  SPINDLES = { middle: 487.85, pitch: 42.5, fromRear: 69.6 },
  SPINDLE = {
    base: 13,
    shoulder: 11,
    shoulderHeight: 2.5,
    shaft: 7.5,
    height: 9.5,
    tip: 2.5,
    tipHeight: 1.5
  },
  DECK_PLATE = { width: 23.2, fromRear: 62.4, toRear: 75.5 },
  SENSOR_BLOCK = { left: 443.8, right: 452.3, fromRear: 42.4, toRear: 51.4, top: 17 }

// A cassette slides into the holder under the lid, label up and its tape's edge toward the keys, and the lid carries it down onto the spindles [A], CPC464 User Instructions, Fig. 2.1: https://archive.org/details/cpc464.en. Seated, it stands 437.5 to 537.9 across, about the spindles' middle, from 40.6 to 104.4 down the slope [E], on the photograph from above of a loaded deck: https://commons.wikimedia.org/wiki/File:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Amstrad_-_CPC_464._Micro-ordinateur_Amstrad_CPC_464,_n%C2%B0_de_s%C3%A9rie_du_clavier_533-7834019_-_btv1b55013024n_(18).jpg
// Its upper face stands 6 to 9 below the top, where the tape at the head window solves to on the museum's photographs taken from one tripod, the deck shut, open and loaded, through a camera calibrated on the prints [E]; 7.5 is taken. Its body is 100.4 across [A], ECMA-34: https://ecma-international.org/wp-content/uploads/ECMA-34_3rd_edition_september_1976.pdf, and 8.7 thick [A], IEC 94-7 in JIS C 5568:1997, where ECMA-34 has 8.6: https://kikakurui.com/c5/C5568-1997-01.html
// On those photographs the holder is a channel hanging from the lid, open at the front, its walls 15 to 16 deep to lips about 6 wide under the cassette's ends; and the lid's marks, shut and open, fit best turned about a hinge 23 down the slope and 12 below the top, behind and under the lid's own rear edge, where its rear corners carry the pivot hooks the cabinet drawing shows [E], CPC464 Service Manual p3 [A]. Forced onto the recess's rear edge, the hinge fits them worse.
// The walls are taken 1.5 thick, 1.2 clear of the cassette's ends, and the lips 1.5 thick.
const CASSETTE = {
    fromRear: 40.6,
    toRear: 104.4,
    width: 100.4,
    upperFace: 7.5,
    bodyThickness: 8.7
  },
  HOLDER_WALL = { thickness: 1.5, clearance: 1.2, lip: 6 },
  HINGE = { fromRear: 23, below: 12 }

// The six keys stand in a notch 428.1 to 547.0 across from 140.9 down the slope, open at the front, where the front edge drops 4.6 [E]. Their tops measure 11.5 across at an 18.05 pitch on the rectified photograph, PLAY's middle 461.7 across [E], where a photograph taken from in front reads 17.42 and its tops about 15.6, their edges caught in its slant, and an earlier reading gave 17.84; a replacement made to fit gives them a 16.8 by 15.8 base and an 11.8 by 10.8 top, 11.98 tall [D], https://www.printables.com/model/284139. Their tops stand about level with the top, about 8 of each front showing above the notch's floor [E].
// The service manual names them Record, Play, Rewind, Fast Forward, Stop/Eject and Pause, 170015 to 170020 [A].
// Each cap stands on a lever turning on one rod behind them all: "The buttons are removed by removing a circlip from the end of the button rod and sliding the rod out of the mechanism" [C], https://andrewdorey.com/post/amstrad-cpc-464-repair. The replacement's lever puts the rod 13.7 behind the middle of a cap's top and 14.7 below it [D], and the rod stands about 14.2 behind on that page's photograph of the bare mechanism [E]. Each key turns about it.
const NOTCH = { left: 428.1, right: 547, fromRear: 140.9, lipDrop: 4.6, floorBelowTop: 8 },
  PIANO_KEY = {
    pitch: 18.05,
    playMiddle: 461.7,
    base: [16.8, 15.8],
    top: [11.8, 10.8],
    height: 11.98,
    rod: { behind: 13.7, below: 14.7 }
  },
  PIANO_KEYS = [
    { name: "record-key", symbol: "record", words: ["REC"], colour: "red" },
    { name: "play-key", symbol: "play", words: ["PLAY"] },
    { name: "rewind-key", symbol: "rewind", words: ["REW"] },
    { name: "fast-forward-key", symbol: "fast-forward", words: ["F.F."] },
    { name: "stop-eject-key", symbol: "none", words: ["STOP", "EJECT"] },
    { name: "pause-key", symbol: "none", words: ["PAUSE"] }
  ]

// Read by eye on the rectified photograph, ±0.3: each key's legend stands centred on its top, a symbol about 1.8 tall in its rear half over a word in bold capitals about 2.1, STOP over EJECT in two lines and PAUSE alone in one [E]. Where the keys share one print, each one's sixth runs half the gap between them either side of its top.
const PIANO_ART = {
    size: 1.8,
    dot: 0.55,
    symbolMiddle: 3.2,
    capHeight: 2.1,
    oneLine: [7.4],
    twoLines: [6.2, 9.1]
  },
  PIANO_MARGIN = (PIANO_KEY.pitch - PIANO_KEY.top[0]) / 2

// Colours sampled on the late unit's studio photographs, taken against a near-neutral grey #a5a6aa, as medians of each patch: the top #454648, the cabinet bottom's underside #363639 and its feet #2a2a2c, the badge plate #484b4c, the inside seen through the vents #141414 and the power lamp's dome, dark red while the machine stands off, #5b2227. Uncalibrated, good for the hue and no more [E].
const CABINET_TOP = { name: "cabinet-top", colour: "#454648" },
  CABINET_BOTTOM = { name: "cabinet-bottom", colour: "#363639" },
  FOOT_RUBBER = { name: "foot", colour: "#2a2a2c" },
  INTERIOR = { name: "interior", colour: "#141414" },
  LAMP = { name: "lamp", colour: "#5b2227" }

// The caps, sampled clear of their legends: dark #424345, ESC #be4a3d, green #779b72, blue #5f73ac; the legends' ink, the brightest twentieth of their strokes, #c3c7c7 [E].
const KEYCAPS = {
    dark: { name: "keycap", colour: "#424345" },
    red: { name: "keycap-red", colour: "#be4a3d" },
    green: { name: "keycap-green", colour: "#779b72" },
    blue: { name: "keycap-blue", colour: "#5f73ac" }
  },
  LEGEND_INK = "#c3c7c7"

// The datacorder's parts and inks: the lid #474a4d; the counter's recess #3a3b3a; the piano keys #2d2d2d and REC #c85244, the RESET lever as dark as the keys, their legends #c8c8c3; on the lid the tape scale #cbcdcd and the label bar #b24034; on the inlay its ground #48494d, its green #547d43, its red #b24237 under darker lettering #a94c46, and its white #c1c1c2 [E].
// Through the window the holder reads #575b5b, its tabs #686a67, the metal plate #abacab and the dark of its opening #4c4c4d, which the open lid shows near black: so the glass lays a veil of reflected light over all of it, and under the veil the holder is #353738, its tabs #515250 and the plate #a8a9a8 [E].
// The page draws no reflection, so the veil is drawn as the glass's own light grey over an eighth of what lies behind it, and the glass and the metal as smooth, roughness 0.1 and 0.3; those shares, that grey and those roughnesses are a guess. With no surroundings to reflect, metal is drawn as a bright grey.
const LID = { name: "cassette-lid", colour: "#474a4d" },
  LID_RAIL_FACE = { name: "cassette-lid-rail", colour: LID.colour },
  WINDOW = { name: "cassette-window", colour: "#d8dadb", opacity: 0.12, roughness: 0.1 },
  HOLDER_PLASTIC = { name: "cassette-holder", colour: "#353738" },
  HOLDER_TAB = { name: "holder-tab", colour: "#515250" },
  DECK_METAL = { name: "deck-metal", colour: "#a8a9a8", roughness: 0.3 },
  COUNTER_FACE = { name: "counter", colour: "#3a3b3a" },
  COUNTER_LEGEND_PLATE = { name: "counter-legend", colour: CABINET_TOP.colour },
  RESET = { name: "reset", colour: "#2d2d2d" },
  INLAY_PLATE = { name: "inlay", colour: "#48494d" },
  BADGE_PLATE = { name: "badge", colour: "#484b4c" },
  PIANO_KEY_PLASTIC = { name: "piano-key", colour: "#2d2d2d" },
  RECORD_KEY_PLASTIC = { name: "piano-key-red", colour: "#c85244" },
  PIANO_INK = "#c8c8c3",
  SCALE_INK = "#cbcdcd",
  LABEL_BAR_RED = "#b24034",
  INLAY_GREEN = "#547d43",
  INLAY_RED = "#b24237",
  INLAY_RED_INK = "#a94c46",
  INLAY_WHITE = "#c1c1c2"

// The badge, measured on the rectified photograph from above and, for the Spanish words, on a photograph of a Spanish unit rectified on the plate's corners to 296.6 by 23.9, its positions agreeing with the first's within 0.4 [E]: https://commons.wikimedia.org/wiki/File:Amstrad_CPC464_keyboard.jpg. Positions run from the plate's rear left corner.
// The Spanish logo's box leans 9.9°, 10.8 to 49.3 across at its foot and 3.8 to 21.7 down, cut by a gap leaning 34.8° from the vertical, 7.4 wide, its left edge 28.0 across at 21 down; AMSTRAD runs across both, leaning with it. The box reads #8d8d8b and its letters #cfced0, which a snapshot sees dark: they are a foil, and a print can only take them white.
// "64k ORDENADOR PERSONAL EN COLOR" stands 3.2 tall on a baseline at 19.7, from 56.3 to 154.4, its words where a plainer Spanish badge puts them, moved 3.0 to meet the two words this photograph resolves [E]: https://www.cpcwiki.eu/index.php/CPC_464. "CPC 464" stands 7.9 tall from 208.5 to 242.5 on a baseline at 19.5, in a thin squared face Heros only stands in for.
// The colour plate, #aaa8a2, stands 246.3 to 267.4 by 12.2 to 19.2, carrying three bars #a32f2d, #57984b and #3a72b1, 5.9 wide at a 6.5 pitch from 1.0 in, each split by a 0.6 line, its outer ends rounded about 1.2. "COLOR" follows from 268 on the words' baseline, and "ENC." stands 2.7 tall over the lamp from 273.9, on a baseline at 8.7; the words read #c6c9c8, "CPC 464" #babcbb.
const BADGE_ART = {
    box: { left: 10.8, right: 49.3, top: 3.8, bottom: 21.7, lean: 9.9 },
    gap: { left: 28, at: 21, width: 7.4, lean: 34.8 },
    logo: { word: "AMSTRAD", capHeight: 9.5, baseline: 19.4, left: 12.6, width: 35.4 },
    words: [
      { word: "64k", left: 56.3, width: 8 },
      { word: "ORDENADOR", left: 67.8, width: 29.7 },
      { word: "PERSONAL", left: 101, width: 24.6 },
      { word: "EN", left: 129.2, width: 6 },
      { word: "COLOR", left: 138.4, width: 16 }
    ],
    wordsCapHeight: 3.2,
    wordsBaseline: 19.7,
    model: { word: "CPC 464", left: 208.5, width: 34, capHeight: 7.9, baseline: 19.5 },
    plate: { left: 246.3, right: 267.4, top: 12.2, bottom: 19.2 },
    bars: { first: 1, width: 5.9, pitch: 6.5, top: 1.25, split: 0.6, bottom: 6.15, round: 1.2 },
    colour: { word: "COLOR", left: 268, width: 13.4 },
    switchedOn: { word: "ENC.", left: 273.9, width: 7.5, capHeight: 2.7, baseline: 8.7 }
  },
  BADGE_INKS = {
    box: "#8d8d8b",
    letters: "#cfced0",
    words: "#c6c9c8",
    model: "#babcbb",
    plate: "#aaa8a2",
    bars: ["#a32f2d", "#57984b", "#3a72b1"]
  }

// The lid's lower panel and the inlay, on the same rectified photograph, from each one's rear left corner [E].
// The tape scale is a line 42.5 long, 7.2 down, with a short bar at each end 5.8 tall and two longer ticks at 10.8 and 31.3 rising 6.4, a tick every 2 between them 2.2 tall, and the middle one running 3.3 below the line; its strokes are about 0.35. The label bar is 62.2 by 5.9 from 27.8 across and 18.8 down. On the Spanish unit its words, dark red on the red, are unread on every photograph and are left off.
// The inlay's three boxes stand 10.0 to 45.0 across and 3.4 to 8.0, 11.7 to 16.4 and 20.0 to 25.0 down; the green square 79.4 to 94.1 by 3.4 to 13.9; the datacorder's outline 66.4 to 108.0 by 16.6 to 25.6, its tape slot 69.5 to 94.2 by 20.5 to 23.5 and its red block 96.4 to 106.2 by 18.4 to 23.5. A green line runs from the first box to the square and on round to the outline's top at 101.4; a red one from the second steps down at 55.9 to 19.2 and on to the outline; a white one from the third. The words, about 2.1 tall, are the Spanish unit's own, MONITOR, CINTA and ORDENADOR [E]: https://www.cpcwiki.eu/index.php/CPC_472
const LID_ART = {
    scale: {
      left: 37.8,
      right: 80.3,
      line: 7.2,
      ends: 5.8,
      ticks: [48.6, 69.1],
      tickRise: 6.4,
      step: 2,
      stepRise: 2.2,
      middleDrop: 3.3,
      stroke: 0.35
    },
    labelBar: { left: 27.8, width: 62.2, top: 18.8, height: 5.9 }
  },
  INLAY_ART = {
    boxes: [
      { word: "MONITOR", top: 3.4, bottom: 8, fill: INLAY_GREEN, ink: INLAY_WHITE },
      { word: "CINTA", top: 11.7, bottom: 16.4, fill: INLAY_RED, ink: INLAY_RED_INK },
      { word: "ORDENADOR", top: 20, bottom: 25, fill: "none", ink: INLAY_WHITE }
    ],
    boxLeft: 10,
    boxRight: 45,
    capHeight: 2.1,
    square: { left: 79.4, right: 94.1, top: 3.4, bottom: 13.9 },
    outline: { left: 66.4, right: 108, top: 16.6, bottom: 25.6 },
    slot: { left: 69.5, right: 94.2, top: 20.5, bottom: 23.5 },
    block: { left: 96.4, right: 106.2, top: 18.4, bottom: 23.5 },
    greenTurn: 101.4,
    redStep: 55.9,
    redLevel: 19.2,
    stroke: 0.35
  }

// The counter's three white numerals on dark wheels, #aaadae on #2d2e2f, about 3 tall; and the raised words above it, which read #525253 where the light catches them against the top's #454648 [E]. Each wheel carries the ten figures.
const COUNTER_ART = {
    capHeight: 3,
    lines: [
      { words: ["CONT.", "COUNTER"], middle: 8.6 },
      { words: ["INICIO", "RESET"], middle: 20.7 }
    ],
    lineBaselines: [2.6, 5.4],
    lineCapHeight: 1.9
  },
  COUNTER_DIGITS = "#aaadae",
  COUNTER_WHEELS_COLOUR = "#2d2e2f",
  COUNTER_FIGURES = 10,
  COUNTER_RELIEF = "#525253"

// A printed part carries a material of its own, because the page inks its print over the material it finds.
const COUNTER_WHEEL_PLASTICS = COUNTER_WHEELS.map(name => ({ name, colour: COUNTER_WHEELS_COLOUR }))

// The legends of a Spanish unit, read on its photograph and a close one beside it, laid out by the sizes measured on a UK unit's photograph from above: every legend centred across its key, a letter's capital 5.5 tall and centred down it, a pair's lower character 4.0 under an upper 3.2 in a stack 8.6 tall, and a word's capitals 2.65, two-line words stacked [E]: https://commons.wikimedia.org/wiki/File:Amstrad_CPC464_keyboard.jpg, https://commons.wikimedia.org/wiki/File:Amstrad_CPC_keyboard_closeup.jpg and https://commons.wikimedia.org/wiki/File:Amstrad_CPC464-IMG_7169.jpg
// The face is an upright grotesque of middle weight with a slashed zero; TeX Gyre Heros stands in for it: https://www.gust.org.pl/projects/e-foundry/tex-gyre/heros, and sets BORR 10.5 across at a word's height. The arrows, the peseta, Ñ's tilde, the broken bar and the zero's slash are measured on no 464's caps, and are drawn near the 6128's own.
const LETTER_HEIGHT = 5.5,
  WORD_HEIGHT = 2.65,
  UPPER_HEIGHT = 3.2,
  LOWER_HEIGHT = 4,
  STACK = 8.6,
  LINE_GAP = 1.3,
  ARROW = { length: 7, shaft: 1.1, headWidth: 2.6, headLength: 2.4 },
  THIN_ARROW = { length: 3.9, shaft: 0.4, headWidth: 1.2, headLength: 1.2 },
  DELETE_ARROW = { length: 3, shaft: 0.35, headWidth: 1.3, headLength: 1.3 },
  ARROW_TURNS = { up: 0, right: 90, down: 180, left: 270 },
  DELETE_GAP = 0.3,
  SLASH = { reach: 0.38, stroke: 0.1 },
  PESETA_T = { height: 0.6, offset: 0.3 },
  BROKEN_BAR = { dash: 0.42, width: 0.12 },
  DELETE_WORD_WIDTH = 10.5,
  TILDE = { width: 4.6, height: 0.8, above: 1, stroke: 0.4 }

// How finely a print is rendered: the legend atlas, a tile a key across the whole block, stands 3715 wide at 10 pixels to the millimetre, inside the 4096 a mobile GPU may hold; the smaller prints take 12.
const LEGEND_PIXELS = 10,
  PLATE_PIXELS = 12

const LANGUAGE = "es",
  LEGENDS_PRINT = "legends",
  BADGE_PRINT = "badge",
  COUNTER_PRINT = "counter",
  COUNTER_DIGITS_PRINT = "counter-digits",
  COUNTER_LEGEND_PRINT = "counter-legend",
  LID_PRINT = "cassette-lid",
  INLAY_PRINT = "inlay",
  PIANO_PRINT = "piano-keys"

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

// The end openings are cut through the panel and the wall behind it, and show a dark back there, the sockets behind them not drawn.
const LEFT_HOLE = { from: -OVERRUN, to: LEFT_PANEL.depth + CASE_WALL },
  RIGHT_HOLE = { from: -OVERRUN, to: RIGHT_PANEL.depth + CASE_WALL },
  BACK_THICKNESS = 0.5

// The window's top stands a hairline below the top, as every plate's does, and the holder hangs a hairline under the window; the well's floor stands on its liner.
const HOLDER_TOP = WINDOW_THICKNESS + 2 * HAIRLINE,
  HOLDER_BOTTOM = HOLDER_TOP + HOLDER_THICKNESS,
  WELL_FLOOR = -(COMPARTMENT.depth - HAIRLINE - BACK_THICKNESS)

// A seated cassette's middle plane stands half its body below its upper face.
const CASSETTE_BELOW = CASSETTE.upperFace + CASSETTE.bodyThickness / 2

const RADIANS = Math.PI / 180,
  SLOPE = Math.tan(TOP_ANGLE * RADIANS),
  REAR_LEAN = Math.tan(REAR_FACE_LEAN * RADIANS),
  FRONT_FOOT = (FRONT_TOP_HEIGHT - FRONT_PARTING_HEIGHT) * Math.tan(FRONT_FACE_LEAN * RADIANS),
  PARTING_SLOPE = (LIP_HEIGHT - FRONT_PARTING_HEIGHT) / (DEPTH - FRONT_FOOT)

// Where the top meets the upper rear face, solved from the two planes.
const REAR_TOP_HEIGHT =
    (FRONT_TOP_HEIGHT + SLOPE * (DEPTH + REAR_LEAN * LIP_HEIGHT)) / (1 + SLOPE * REAR_LEAN),
  REAR_TOP_Y = DEPTH - REAR_LEAN * (REAR_TOP_HEIGHT - LIP_HEIGHT),
  SLOPE_LENGTH = REAR_TOP_Y / Math.cos(TOP_ANGLE * RADIANS)

const KEY_ATLAS_TOP_ROW = -2.3025,
  KEY_ATLAS_ROWS = 5 - KEY_ATLAS_TOP_ROW,
  KEY_ATLAS_KEYS = 19.5,
  LEGEND_ATLAS_WIDTH = KEY_ATLAS_KEYS * KEY_PITCH,
  LEGEND_ATLAS_DEPTH = KEY_ATLAS_ROWS * KEY_PITCH

const CENTRING = [-WIDTH / 2, -DEPTH / 2, FOOT.height],
  QUARTERS = ["", "¼", "½", "¾"]

function tangent(degrees) {
  return Math.tan(degrees * RADIANS)
}

function partingHeightAt(y) {
  return FRONT_PARTING_HEIGHT + PARTING_SLOPE * (y - FRONT_FOOT)
}

function topHeightAt(y) {
  return FRONT_TOP_HEIGHT + SLOPE * y
}

function upSlope(fromRear) {
  return SLOPE_LENGTH - fromRear
}

// A point given in the top's plane — across, up the slope from the front top edge and out of it — in the case's own terms.
function onTopAt(x, along, above) {
  const cosine = Math.cos(TOP_ANGLE * RADIANS),
    sine = Math.sin(TOP_ANGLE * RADIANS)

  return [x, along * cosine - above * sine, FRONT_TOP_HEIGHT + along * sine + above * cosine]
}

// A shape built in the top's plane, carried into the case.
function onTop(shape) {
  return shape.rotate(TOP_ANGLE, [0, 0, 0], [1, 0, 0]).translate([0, 0, FRONT_TOP_HEIGHT])
}

// A box in the top's plane from an outline measured down the slope, reaching from below the top to above it.
function topBox({ left, right, fromRear, toRear }, below, above = OVERRUN) {
  const front = upSlope(toRear),
    rear = upSlope(fromRear),
    box = makeBox([left, front, -below], [right, rear, above])

  return onTop(box)
}

function topProfile() {
  return draw([FRONT_FOOT, FRONT_PARTING_HEIGHT])
    .lineTo([0, FRONT_TOP_HEIGHT])
    .customCorner(FRONT_TOP_RADIUS)
    .lineTo([REAR_TOP_Y, REAR_TOP_HEIGHT])
    .customCorner(REAR_TOP_RADIUS)
    .lineTo([DEPTH, LIP_HEIGHT])
    .close()
}

// The chamfer climbs from its foot toward the front until it meets the parting line.
function bottomProfile() {
  const bevelFoot = DEPTH - LIP_HEIGHT * tangent(REAR_BEVEL_ANGLE),
    climb = tangent(FRONT_CHAMFER_ANGLE),
    [throughY, throughZ] = FRONT_CHAMFER_POINT,
    chamferFoot = throughY + throughZ / climb,
    chamferTop =
      (chamferFoot * climb - FRONT_PARTING_HEIGHT + PARTING_SLOPE * FRONT_FOOT) /
      (climb + PARTING_SLOPE),
    chamferHeight = partingHeightAt(chamferTop)

  return draw([chamferTop, chamferHeight])
    .lineTo([chamferFoot, 0])
    .lineTo([bevelFoot, 0])
    .customCorner(BEVEL_ROUND)
    .lineTo([DEPTH, LIP_HEIGHT])
    .close()
}

function sketchAcross(profile, left = 0, width = WIDTH) {
  return profile.sketchOnPlane("YZ", left).extrude(width)
}

// Every edge of an end but the parting line's.
function endEdges(edge) {
  const middle = (FRONT_FOOT + DEPTH) / 2,
    parting = partingHeightAt(middle)

  return edge
    .either([leftEnd => leftEnd.inPlane("YZ", 0), rightEnd => rightEnd.inPlane("YZ", WIDTH)])
    .not(lower => lower.containsPoint([0, middle, parting]))
    .not(lower => lower.containsPoint([WIDTH, middle, parting]))
}

// A plan outline with rounded corners at a height, its front and rear carried along the faces' leans so that the rounding follows them.
function planOutlineAt(height) {
  const front = (FRONT_TOP_HEIGHT - height) * tangent(FRONT_FACE_LEAN),
    rear = DEPTH - (height - LIP_HEIGHT) * REAR_LEAN,
    outline = drawRoundedRectangle(WIDTH, rear - front, PLAN_RADIUS)

  return outline.translate(WIDTH / 2, (front + rear) / 2).sketchOnPlane("XY", height)
}

function buildPlan() {
  const below = planOutlineAt(-OVERRUN),
    above = planOutlineAt(REAR_TOP_HEIGHT + OVERRUN)

  return below.loftWith(above)
}

function keyCell(left, row, width = 1, rows = 1) {
  return {
    left: KEY_GRID_LEFT + left * KEY_PITCH,
    right: KEY_GRID_LEFT + (left + width) * KEY_PITCH,
    fromRear: KEY_GRID_FROM_REAR + row * KEY_PITCH,
    toRear: KEY_GRID_FROM_REAR + (row + rows) * KEY_PITCH
  }
}

function cleared({ left, right, fromRear, toRear }) {
  return {
    left: left - KEY_CLEARANCE,
    right: right + KEY_CLEARANCE,
    fromRear: fromRear - KEY_CLEARANCE,
    toRear: toRear + KEY_CLEARANCE
  }
}

function buildKeyOpenings() {
  const cells = [
      keyCell(0, 0, 15.5, 4),
      keyCell(3.25, 4, 10),
      keyCell(16.5, 1, 3, 4),
      keyCell(17.5, -2.3025, 1, 3),
      keyCell(16.5, -1.3025, 3)
    ],
    boxes = cells.map(cell => {
      const opening = cleared(cell)

      return topBox(opening, FLOOR_BELOW_TOP)
    })

  return boxes.reduce((whole, box) => whole.fuse(box))
}

// The inside the vents and sockets open into: a wall inside the top, the upper rear face, the bevel and the base, and reaching forward only as far as they need, clear of the cursor keys' opening.
function interiorProfile(inset) {
  const wall = CASE_WALL + inset,
    bevel = tangent(REAR_BEVEL_ANGLE),
    topLine = FRONT_TOP_HEIGHT - wall / Math.cos(TOP_ANGLE * RADIANS),
    rearLine = DEPTH - wall / Math.cos(REAR_FACE_LEAN * RADIANS),
    bevelLine = DEPTH - wall / Math.cos(REAR_BEVEL_ANGLE * RADIANS),
    cornerY = (rearLine - REAR_LEAN * (topLine - LIP_HEIGHT)) / (1 + REAR_LEAN * SLOPE),
    cornerZ = topLine + SLOPE * cornerY,
    elbowZ = LIP_HEIGHT + (rearLine - bevelLine) / (REAR_LEAN + bevel),
    elbowY = bevelLine - (LIP_HEIGHT - elbowZ) * bevel,
    footY = bevelLine - (LIP_HEIGHT - wall) * bevel,
    reachY = REAR_TOP_Y - INTERIOR_REACH.top

  return draw([footY - INTERIOR_REACH.floor, wall])
    .lineTo([footY, wall])
    .lineTo([elbowY, elbowZ])
    .lineTo([cornerY, cornerZ])
    .lineTo([reachY, topLine + SLOPE * reachY])
    .close()
}

function buildInteriorSpace(inset = 0) {
  const side = CASE_WALL + inset,
    profile = interiorProfile(inset)

  return sketchAcross(profile, side, WIDTH - 2 * side)
}

function ventMiddle(index) {
  return VENTS.first + index * VENTS.pitch
}

function buildVentSlot(index) {
  const speaker =
      index >= SPEAKER_SLOTS.firstSlot && index < SPEAKER_SLOTS.firstSlot + SPEAKER_SLOTS.count,
    width = speaker ? SPEAKER_SLOTS.width : VENTS.width,
    downRear = speaker ? SPEAKER_SLOTS.downRear : VENTS.downRear,
    middle = ventMiddle(index),
    topFront = REAR_TOP_Y - VENTS.onTop * Math.cos(TOP_ANGLE * RADIANS),
    rearBottom = REAR_TOP_HEIGHT - downRear * Math.cos(REAR_FACE_LEAN * RADIANS)

  return makeBox(
    [middle - width / 2, topFront, rearBottom],
    [middle + width / 2, DEPTH + OVERRUN, REAR_TOP_HEIGHT + OVERRUN]
  )
}

function buildVentSlots() {
  const slots = []

  for (let index = 0; index < VENTS.count; index++) {
    const slot = buildVentSlot(index)

    slots.push(slot)
  }

  return makeCompound(slots)
}

function heightUpRearFace(upFace) {
  return LIP_HEIGHT + upFace * Math.cos(REAR_FACE_LEAN * RADIANS)
}

function rearFaceAt(height) {
  return DEPTH - REAR_LEAN * (height - LIP_HEIGHT)
}

function buildRearPanelRecess() {
  const top = heightUpRearFace(REAR_PANEL.upFace),
    rearAtTop = rearFaceAt(top),
    panel = draw([DEPTH - REAR_PANEL.depth, LIP_HEIGHT - OVERRUN])
      .lineTo([rearAtTop - REAR_PANEL.depth, top])
      .lineTo([rearAtTop + OVERRUN, top])
      .lineTo([DEPTH + OVERRUN, LIP_HEIGHT - OVERRUN])
      .close()

  return sketchAcross(panel, REAR_PANEL.left, REAR_PANEL.right - REAR_PANEL.left)
}

function buildRearOpenings() {
  const inside = OPENINGS_FROM,
    edgeTop = heightUpRearFace(EDGE_CONNECTOR_TOP_UP_FACE),
    dinMiddle = heightUpRearFace(DIN_SOCKET.upFace),
    dinRadius = (DIN_SOCKET.right - DIN_SOCKET.left) / 2,
    dcMiddle = heightUpRearFace(DC_SOCKET.upFace),
    openings = EDGE_CONNECTORS.map(connector =>
      makeBox(
        [connector.left, inside, EDGE_CONNECTOR_BOTTOM],
        [connector.right, DEPTH + OVERRUN, edgeTop]
      )
    ),
    dinRound = makeCylinder(
      dinRadius,
      DEPTH + OVERRUN - inside,
      [(DIN_SOCKET.left + DIN_SOCKET.right) / 2, inside, dinMiddle],
      [0, 1, 0]
    ),
    dinFoot = makeBox(
      [DIN_SOCKET.left, inside, dinMiddle - dinRadius],
      [DIN_SOCKET.right, DEPTH + OVERRUN, dinMiddle]
    ),
    dc = makeBox(
      [DC_SOCKET.left, inside, dcMiddle - DC_SOCKET.height / 2],
      [DC_SOCKET.right, DEPTH + OVERRUN, dcMiddle + DC_SOCKET.height / 2]
    ),
    din = dinRound.fuse(dinFoot)

  return makeCompound([...openings, din, dc])
}

function underEdgeConnector(middle) {
  return EDGE_CONNECTORS.some(
    connector =>
      middle > connector.left - VENTS.pitch / 2 && middle < connector.right + VENTS.pitch / 2
  )
}

function buildBevelSlots() {
  const inside = OPENINGS_FROM,
    slots = []

  for (let index = 0; index < VENTS.count; index++) {
    const middle = ventMiddle(index),
      blocked = underEdgeConnector(middle)

    if (blocked) {
      continue
    }

    const slot = makeBox(
      [middle - BEVEL_SLOTS.width / 2, inside, BEVEL_SLOTS.bottom],
      [middle + BEVEL_SLOTS.width / 2, DEPTH + OVERRUN, BEVEL_SLOTS.top]
    )

    slots.push(slot)
  }

  return makeCompound(slots)
}

// An end's recessed panel, its top parallel to the top, open below onto the parting line; y here is forward of the lip.
function buildEndPanel(panel, atLeft) {
  const front = DEPTH - panel.front,
    rear = DEPTH - panel.rear,
    frontTop = topHeightAt(front) - panel.belowTop,
    rearTop = topHeightAt(rear) - panel.belowTop,
    outline = draw([front, -OVERRUN])
      .lineTo([front, frontTop])
      .lineTo([rear, rearTop])
      .lineTo([rear, -OVERRUN])
      .close(),
    left = atLeft ? -OVERRUN : WIDTH - panel.depth

  return sketchAcross(outline, left, panel.depth + OVERRUN)
}

// An opening in an end, from the end's face to the given depth and shrunk by the given margin; the jack's is round-topped.
function buildEndOpening(opening, { atLeft, roundTopped, from, to, margin = 0 }) {
  const front = DEPTH - opening.front + margin,
    rear = DEPTH - opening.rear - margin,
    bottom = opening.bottom + margin,
    top = opening.top - margin,
    left = atLeft ? from : WIDTH - to,
    right = atLeft ? to : WIDTH - from,
    box = makeBox([left, front, bottom], [right, rear, top])

  if (!roundTopped) {
    return box
  }

  const radius = (rear - front) / 2,
    middle = (front + rear) / 2,
    round = makeCylinder(radius, right - left, [left, middle, top - radius], [1, 0, 0]),
    foot = makeBox([left, front, bottom], [right, rear, top - radius])

  return round.fuse(foot)
}

// Each end's openings run through its panel, so they are fused with it before the cut: a cut whose tools overlap loses them without a word.
function buildEndCuts() {
  const leftPanel = buildEndPanel(LEFT_PANEL, true),
    rightPanel = buildEndPanel(RIGHT_PANEL, false),
    jack = buildEndOpening(JACK, { atLeft: true, roundTopped: true, ...LEFT_HOLE }),
    joystick = buildEndOpening(JOYSTICK, { atLeft: true, roundTopped: false, ...LEFT_HOLE }),
    power = buildEndOpening(POWER_SLOT, { atLeft: false, roundTopped: false, ...RIGHT_HOLE }),
    volume = buildEndOpening(VOLUME_WINDOW, { atLeft: false, roundTopped: false, ...RIGHT_HOLE }),
    left = leftPanel.fuse(jack).fuse(joystick),
    right = rightPanel.fuse(power).fuse(volume)

  return makeCompound([left, right])
}

// The lid's hinge gap shows dark, as the end openings do.
function buildLidGapBack() {
  const gap = {
    left: LID_RECESS.left,
    right: LID_RECESS.right,
    fromRear: LID_RECESS.fromRear,
    toRear: LID_RAIL.fromRear - HAIRLINE
  }

  return topBox(gap, LID_THICKNESS - HAIRLINE, BACK_THICKNESS - LID_THICKNESS)
}

// What the end openings show behind them: a dark back standing a hairline in front of each one's floor.
function buildEndBacks() {
  const leftBack = {
      from: LEFT_HOLE.to - BACK_THICKNESS,
      to: LEFT_HOLE.to - HAIRLINE,
      margin: HAIRLINE
    },
    rightBack = {
      from: RIGHT_HOLE.to - BACK_THICKNESS,
      to: RIGHT_HOLE.to - HAIRLINE,
      margin: HAIRLINE
    },
    jack = buildEndOpening(JACK, { atLeft: true, roundTopped: true, ...leftBack }),
    joystick = buildEndOpening(JOYSTICK, { atLeft: true, roundTopped: false, ...leftBack }),
    power = buildEndOpening(POWER_SLOT, { atLeft: false, roundTopped: false, ...rightBack }),
    volume = buildEndOpening(VOLUME_WINDOW, { atLeft: false, roundTopped: false, ...rightBack })

  return makeCompound([jack, joystick, power, volume])
}

// The notch is a well behind a front wall a case's wall thick, which drops to let the keys' fronts show.
function buildNotch() {
  const lip = makeBox(
      [NOTCH.left, -OVERRUN, FRONT_TOP_HEIGHT - NOTCH.lipDrop],
      [NOTCH.right, CASE_WALL, FRONT_TOP_HEIGHT + OVERRUN]
    ),
    wellOutline = {
      left: NOTCH.left,
      right: NOTCH.right,
      fromRear: NOTCH.fromRear,
      toRear: SLOPE_LENGTH - CASE_WALL
    },
    well = topBox(wellOutline, NOTCH.floorBelowTop)

  return lip.fuse(well)
}

function grown({ left, right, fromRear, toRear }, margin) {
  return {
    left: left - margin,
    right: right + margin,
    fromRear: fromRear - margin,
    toRear: toRear + margin
  }
}

// The finger's notch runs into the lid's recess, and a cut whose tools overlap loses them without a word, so each recess is cut on its own.
function buildTopRecesses() {
  const fingerNotch = {
      left: FINGER_NOTCH.middle - FINGER_NOTCH.width / 2,
      right: FINGER_NOTCH.middle + FINGER_NOTCH.width / 2,
      fromRear: LID_PANEL.toRear,
      toRear: INLAY.fromRear
    },
    recesses = [
      [BADGE, PLATE_THICKNESS],
      [COUNTER, COUNTER.depth],
      [COUNTER_LEGEND, PLATE_THICKNESS],
      [LID_RECESS, LID_THICKNESS],
      [COMPARTMENT, COMPARTMENT.depth],
      [INLAY, PLATE_THICKNESS]
    ],
    boxes = recesses.map(([outline, depth]) => {
      const room = grown(outline, HAIRLINE)

      return topBox(room, depth)
    }),
    notch = topBox(fingerNotch, FINGER_NOTCH.depth)

  return [...boxes, notch]
}

function buildCabinetTop() {
  const profile = topProfile(),
    plan = buildPlan(),
    body = sketchAcross(profile).fillet(END_TOP_RADIUS, endEdges).intersect(plan),
    keyOpenings = buildKeyOpenings(),
    recesses = buildTopRecesses(),
    notch = buildNotch(),
    inside = buildInteriorSpace(),
    vents = buildVentSlots(),
    rearPanel = buildRearPanelRecess(),
    rearOpenings = buildRearOpenings(),
    endCuts = buildEndCuts()

  const recessed = recesses.reduce((cut, recess) => cut.cut(recess), body)

  return recessed
    .cut(keyOpenings)
    .cut(notch)
    .cut(inside)
    .cut(vents)
    .cut(rearPanel)
    .cut(rearOpenings)
    .cut(endCuts)
}

// Each end of the cabinet bottom is cut away below a plane through the parting line's end, leaning in at the end's incline.
function buildEndChamfer(atLeft) {
  const reach = 1000,
    left = atLeft ? -reach : WIDTH,
    halfSpace = makeBox([left, -reach, -reach], [left + reach, reach, reach]),
    pivot = [atLeft ? 0 : WIDTH, FRONT_FOOT, FRONT_PARTING_HEIGHT],
    along = [0, DEPTH - FRONT_FOOT, LIP_HEIGHT - FRONT_PARTING_HEIGHT],
    turn = atLeft ? -END_INCLINE : END_INCLINE

  return halfSpace.rotate(turn, pivot, along)
}

function buildCabinetBottom() {
  const profile = bottomProfile(),
    leftChamfer = buildEndChamfer(true),
    rightChamfer = buildEndChamfer(false),
    inside = buildInteriorSpace(),
    slots = buildBevelSlots(),
    rearOpenings = buildRearOpenings(),
    endCuts = buildEndCuts(),
    body = sketchAcross(profile)
      .cut(leftChamfer)
      .cut(rightChamfer)
      .cut(inside)
      .cut(slots)
      .cut(rearOpenings)
      .cut(endCuts)

  return { name: "cabinet-bottom", shape: body.translate(CENTRING), material: CABINET_BOTTOM }
}

function buildFeet() {
  const feet = FOOT_PLACES.map(place =>
      makeCylinder(FOOT.diameter / 2, FOOT.height, [
        place.middle,
        DEPTH - place.fromRear,
        -FOOT.height
      ])
    ),
    standing = makeCompound(feet)

  return { name: "feet", shape: standing.translate(CENTRING), material: FOOT_RUBBER }
}

function spindlePlaces() {
  return [SPINDLES.middle - SPINDLES.pitch / 2, SPINDLES.middle + SPINDLES.pitch / 2]
}

// A tab reaches from the holder's opening's rear edge as far past its middle as its middle stands from that edge.
function holderTab({ middle, width }) {
  const reach = 2 * (HOLDER_TABS.fromRear - HOLDER_OPENING.fromRear),
    tab = {
      left: middle - width / 2,
      right: middle + width / 2,
      fromRear: HOLDER_OPENING.fromRear,
      toRear: HOLDER_OPENING.fromRear + reach
    }

  return topBox(tab, HOLDER_BOTTOM, -HOLDER_TOP)
}

// The compartment's black floor and walls line its hole in the top a hairline inside it, and the spindles and the block stand on that floor.
function buildCassetteWell() {
  const inner = grown(COMPARTMENT, -HAIRLINE),
    room = grown(COMPARTMENT, -HAIRLINE - BACK_THICKNESS),
    tray = topBox(inner, COMPARTMENT.depth - HAIRLINE, -HOLDER_TOP),
    hollow = topBox(room, -WELL_FLOOR, OVERRUN),
    lined = tray.cut(hollow),
    block = topBox(SENSOR_BLOCK, -WELL_FLOOR, -SENSOR_BLOCK.top),
    along = upSlope(SPINDLES.fromRear),
    spindles = spindlePlaces().map(function (middle) {
      const shoulderAt = WELL_FLOOR + SPINDLE.shoulderHeight,
        base = drawCircle(SPINDLE.base / 2).sketchOnPlane("XY", WELL_FLOOR),
        shoulder = drawCircle(SPINDLE.shoulder / 2).sketchOnPlane("XY", shoulderAt),
        cone = base.loftWith(shoulder),
        shaftHeight = SPINDLE.height - SPINDLE.shoulderHeight + HAIRLINE,
        shaft = makeCylinder(SPINDLE.shaft / 2, shaftHeight, [0, 0, shoulderAt - HAIRLINE]),
        spindle = makeCompound([cone, shaft]),
        standing = spindle.translate([middle, along, 0])

      return onTop(standing)
    })

  return makeCompound([lined, block, ...spindles])
}

function buildInterior() {
  const space = buildInteriorSpace(HAIRLINE),
    backs = buildEndBacks(),
    lidGap = buildLidGapBack(),
    well = buildCassetteWell(),
    whole = makeCompound([space, backs, lidGap, well])

  return { name: "interior", shape: whole.translate(CENTRING), material: INTERIOR }
}

// The holder hangs under the window, open over the spindles, its tabs reaching into the opening over a cassette's back edge, and its walls down the cassette's ends, their lips under them.
function buildHolder() {
  const outline = grown(COMPARTMENT, -2 * HAIRLINE - BACK_THICKNESS),
    plate = topBox(outline, HOLDER_BOTTOM, -HOLDER_TOP),
    opening = topBox(HOLDER_OPENING, HOLDER_BOTTOM + OVERRUN, OVERRUN),
    framed = plate.cut(opening),
    { thickness, clearance, lip } = HOLDER_WALL,
    underCassette = CASSETTE_BELOW + CASSETTE.bodyThickness / 2 + HAIRLINE,
    lipBottom = underCassette + thickness,
    cassetteLeft = SPINDLES.middle - CASSETTE.width / 2,
    cassetteRight = SPINDLES.middle + CASSETTE.width / 2,
    along = { fromRear: CASSETTE.fromRear, toRear: CASSETTE.toRear },
    walls = [
      { left: cassetteLeft - clearance - thickness, right: cassetteLeft - clearance, ...along },
      { left: cassetteRight + clearance, right: cassetteRight + clearance + thickness, ...along }
    ].map(wall => topBox(wall, lipBottom, -HOLDER_BOTTOM)),
    lips = [
      { left: cassetteLeft - clearance, right: cassetteLeft - clearance + lip, ...along },
      { left: cassetteRight + clearance - lip, right: cassetteRight + clearance, ...along }
    ].map(lipOutline => topBox(lipOutline, lipBottom, -underCassette)),
    holder = makeCompound([framed, ...walls, ...lips])

  return { name: "cassette-holder", shape: holder.translate(CENTRING), material: HOLDER_PLASTIC }
}

function buildHolderTabs() {
  const tabs = HOLDER_TABS.plastic.map(holderTab),
    both = makeCompound(tabs)

  return { name: "holder-tabs", shape: both.translate(CENTRING), material: HOLDER_TAB }
}

function buildHolderClip() {
  const clip = holderTab(HOLDER_TABS.metal)

  return { name: "holder-clip", shape: clip.translate(CENTRING), material: DECK_METAL }
}

// What shines in the compartment: the plate lying on the floor in its opening and the spindles' tips.
function buildDeckMetal() {
  const outline = {
      left: SPINDLES.middle - DECK_PLATE.width / 2,
      right: SPINDLES.middle + DECK_PLATE.width / 2,
      fromRear: DECK_PLATE.fromRear,
      toRear: DECK_PLATE.toRear
    },
    plate = topBox(outline, -WELL_FLOOR, WELL_FLOOR + PLATE_THICKNESS),
    along = upSlope(SPINDLES.fromRear),
    tips = spindlePlaces().map(function (middle) {
      const foot = [middle, along, WELL_FLOOR + SPINDLE.height - HAIRLINE],
        tip = makeCylinder(SPINDLE.tip / 2, SPINDLE.tipHeight, foot, [0, 0, 1])

      return onTop(tip)
    }),
    shining = makeCompound([plate, ...tips])

  return { name: "deck-metal", shape: shining.translate(CENTRING), material: DECK_METAL }
}

function centred(place) {
  return [place[0] + CENTRING[0], place[1] + CENTRING[1], place[2] + CENTRING[2]]
}

// The dome rises from the case's top through the badge plate's hole.
function buildPowerLamp() {
  const radius = POWER_LAMP.diameter / 2,
    sphere = makeSphere(radius),
    upper = makeBox([-radius, -radius, 0], [radius, radius, radius]),
    dome = sphere.intersect(upper),
    along = upSlope(POWER_LAMP.fromRear),
    placed = dome.translate([POWER_LAMP.middle, along, -PLATE_THICKNESS]),
    standing = onTop(placed)

  return { name: "power-lamp", shape: standing.translate(CENTRING), material: LAMP }
}

// A part that carries a print lies flat in its own frame and is turned onto the top, as a key is, its top a hairline below the top's own face, or below the floor it stands on.
function buildTopPlate({ name, outline, thickness, material, print, standing = 0 }) {
  const width = outline.right - outline.left,
    depth = outline.toRear - outline.fromRear,
    plate = drawRectangle(width, depth).sketchOnPlane("XY").extrude(-thickness),
    face = { left: -width / 2, right: width / 2, front: -depth / 2, rear: depth / 2 },
    middle = (outline.fromRear + outline.toRear) / 2,
    along = upSlope(middle),
    place = onTopAt((outline.left + outline.right) / 2, along, standing - HAIRLINE),
    part = { name, shape: plate, material, face, tilt: TOP_ANGLE, place: centred(place) }

  return print ? { ...part, print } : part
}

function buildBadge() {
  const badge = buildTopPlate({
      name: BADGE_PRINT,
      outline: BADGE,
      thickness: PLATE_THICKNESS,
      material: BADGE_PLATE,
      print: BADGE_PRINT
    }),
    radius = POWER_LAMP.diameter / 2,
    lampX = POWER_LAMP.middle - (BADGE.left + BADGE.right) / 2,
    lampY = (BADGE.fromRear + BADGE.toRear) / 2 - POWER_LAMP.fromRear,
    hole = makeCylinder(radius + HAIRLINE, PLATE_THICKNESS + 2 * OVERRUN, [
      lampX,
      lampY,
      -PLATE_THICKNESS - OVERRUN
    ]),
    pierced = badge.shape.cut(hole)

  return { ...badge, shape: pierced }
}

function buildResetLever() {
  const lever = topBox(RESET_LEVER, COUNTER.depth - HAIRLINE, RESET_LEVER.standing)

  return { name: "reset-lever", shape: lever.translate(CENTRING), material: RESET }
}

// The switch's knob and the wheel stand in the right end's openings, through its panel.
function buildPowerKnob() {
  const front = DEPTH - POWER_SLOT.front,
    length = (POWER_SLOT.front - POWER_SLOT.rear) * POWER_KNOB.share,
    face = WIDTH - RIGHT_PANEL.depth,
    knob = makeBox(
      [face - CASE_WALL, front + HAIRLINE, POWER_SLOT.bottom + HAIRLINE],
      [face + POWER_KNOB.standing, front + length, POWER_SLOT.top - HAIRLINE]
    )

  return { name: "power-switch", shape: knob.translate(CENTRING), material: RESET }
}

function buildVolumeWheel() {
  const front = DEPTH - VOLUME_WINDOW.front,
    rear = DEPTH - VOLUME_WINDOW.rear,
    face = WIDTH - RIGHT_PANEL.depth,
    wheel = makeBox(
      [face - CASE_WALL, front + WHEEL_INSET, VOLUME_WINDOW.bottom + HAIRLINE],
      [face + WHEEL_STANDING, rear - WHEEL_INSET, VOLUME_WINDOW.top - HAIRLINE]
    )

  return { name: "volume-wheel", shape: wheel.translate(CENTRING), material: RESET }
}

function capTop(width, depth) {
  return { width: width - 2 * CAP_TOP_INSET, depth: depth - 2 * CAP_TOP_INSET }
}

function buildCapBody(width, depth) {
  const top = capTop(width, depth),
    base = drawRectangle(width, depth).sketchOnPlane("XY"),
    lid = drawRectangle(top.width, top.depth).sketchOnPlane("XY", CAP_HEIGHT)

  return base.loftWith(lid)
}

function buildDishedCap(width, depth) {
  const top = capTop(width, depth),
    half = top.width / 2,
    radius = (half ** 2 + DISH_DEPTH ** 2) / (2 * DISH_DEPTH),
    body = buildCapBody(width, depth),
    sphere = makeSphere(radius),
    dish = sphere.translate([0, 0, CAP_HEIGHT - DISH_DEPTH + radius])

  return body.cut(dish)
}

function widthInKeys(width) {
  const whole = Math.floor(width),
    quarters = Math.round((width - whole) * 4)

  return `${whole}${QUARTERS[quarters]}`
}

function layKey({ number, left, row, width = 1, rows = 1, colour = "dark" }) {
  const capWidth = width * KEY_PITCH - CAP_GAP,
    capDepth = rows * KEY_PITCH - CAP_GAP,
    top = capTop(capWidth, capDepth),
    face = {
      left: -top.width / 2,
      right: top.width / 2,
      front: -top.depth / 2,
      rear: top.depth / 2
    },
    axis = (left + width / 2) * KEY_PITCH,
    middle = (row - KEY_ATLAS_TOP_ROW + rows / 2) * KEY_PITCH,
    rear = middle - top.depth / 2,
    fromRear = KEY_GRID_FROM_REAR + (row + rows / 2) * KEY_PITCH,
    along = upSlope(fromRear),
    centre = onTopAt(KEY_GRID_LEFT + axis, along, -CAP_SUNK),
    legend = [
      (axis - top.width / 2) / LEGEND_ATLAS_WIDTH,
      rear / LEGEND_ATLAS_DEPTH,
      top.width / LEGEND_ATLAS_WIDTH,
      top.depth / LEGEND_ATLAS_DEPTH
    ]

  return {
    number,
    width,
    colour,
    place: centred(centre),
    face,
    legend,
    printedAt: [axis, rear],
    top
  }
}

function buildKeycaps(laid) {
  const groups = Map.groupBy(laid, key => `${widthInKeys(key.width)}-${key.colour}`),
    keycaps = []

  for (const [group, keys] of groups) {
    const [first] = keys,
      capWidth = first.width * KEY_PITCH - CAP_GAP,
      capDepth = KEY_PITCH - CAP_GAP,
      dished = first.width == 1,
      cap = dished ? buildDishedCap(capWidth, capDepth) : buildCapBody(capWidth, capDepth)

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

function buildReturnKeycap(key) {
  const { arm, leg } = RETURN_KEY,
    legBody = buildCapBody(leg.width * KEY_PITCH - CAP_GAP, 2 * KEY_PITCH - CAP_GAP),
    armBody = buildCapBody(arm.width * KEY_PITCH - CAP_GAP, KEY_PITCH - CAP_GAP),
    armShift = (arm.left + arm.width / 2 - leg.left - leg.width / 2) * KEY_PITCH,
    shiftedArm = armBody.translate([armShift, KEY_PITCH / 2, 0]),
    whole = legBody.fuse(shiftedArm)

  return {
    name: "keycaps-RETURN",
    shape: whole,
    material: KEYCAPS[RETURN_KEY.colour],
    face: key.face,
    tilt: TOP_ANGLE,
    legends: LEGENDS_PRINT,
    keys: [key]
  }
}

function buildPianoKeyShape() {
  const [baseWidth, baseDepth] = PIANO_KEY.base,
    [topWidth, topDepth] = PIANO_KEY.top,
    base = drawRectangle(baseWidth, baseDepth).sketchOnPlane("XY", -PIANO_KEY.height),
    lid = drawRectangle(topWidth, topDepth).sketchOnPlane("XY")

  return base.loftWith(lid)
}

// The six keys share one print, each one's face reaching across the whole of it so that its own top lands on its own sixth. Each key stands on its lever's rod, so that the page turns it there.
function buildPianoKeys() {
  const [topWidth, topDepth] = PIANO_KEY.top,
    { behind, below } = PIANO_KEY.rod,
    middleFromRear = (NOTCH.fromRear + SLOPE_LENGTH - CASE_WALL) / 2,
    along = upSlope(middleFromRear),
    keys = []

  for (const [index, key] of PIANO_KEYS.entries()) {
    const middle = PIANO_KEY.playMiddle + (index - 1) * PIANO_KEY.pitch,
      place = onTopAt(middle, along + behind, -HAIRLINE - below),
      left = -topWidth / 2 - index * PIANO_KEY.pitch - PIANO_MARGIN,
      face = {
        left,
        right: left + PIANO_KEYS.length * PIANO_KEY.pitch,
        front: -topDepth / 2 - behind,
        rear: topDepth / 2 - behind
      },
      red = key.colour == "red",
      cap = buildPianoKeyShape(),
      shape = cap.translate([0, -behind, below]),
      placed = centred(place)

    keys.push({
      name: key.name,
      shape,
      material: red ? RECORD_KEY_PLASTIC : PIANO_KEY_PLASTIC,
      face,
      tilt: TOP_ANGLE,
      place: placed,
      print: PIANO_PRINT
    })
  }

  return keys
}

function fontSize(capHeight, capHeightPerEm = HEROS_CAP_HEIGHT) {
  return capHeight / capHeightPerEm
}

function escapeXml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

function drawText(text, { x = 0, baseline, capHeight, weight = 400, ink = null }) {
  const size = fontSize(capHeight),
    escaped = escapeXml(text),
    fill = ink ? ` fill="${ink}"` : ""

  return `<text x="${x}" y="${baseline}" font-size="${size}" font-weight="${weight}" text-anchor="middle"${fill}>${escaped}</text>`
}

function drawFittedText(fitted, { capHeight, baseline, ink }) {
  const size = fontSize(capHeight),
    escaped = escapeXml(fitted.word)

  return `<text x="${fitted.left}" y="${baseline}" font-size="${size}" fill="${ink}" textLength="${fitted.width}" lengthAdjust="spacingAndGlyphs">${escaped}</text>`
}

function drawLine([fromX, fromY], [toX, toY], thickness, colour) {
  return `<line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="${colour}" stroke-width="${thickness}"/>`
}

function drawBox({ left, right, top, bottom }, { fill, stroke = null, thickness = 0, radius = 0 }) {
  const outline = stroke ? ` stroke="${stroke}" stroke-width="${thickness}"` : ""

  return `<rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" rx="${radius}" fill="${fill}"${outline}/>`
}

function drawPolygon(corners, colour) {
  const points = corners.map(([x, y]) => `${x},${y}`)

  return `<polygon points="${points.join(" ")}" fill="${colour}"/>`
}

function drawPolyline(points, colour, thickness) {
  const listed = points.map(([x, y]) => `${x},${y}`)

  return `<polyline points="${listed.join(" ")}" fill="none" stroke="${colour}" stroke-width="${thickness}"/>`
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

// Where a legend's lines stand on a top of the given depth, measured down from its rear edge.
function legendPlaces(depth) {
  const middle = depth / 2

  return {
    letter: { baseline: middle + LETTER_HEIGHT / 2, capHeight: LETTER_HEIGHT },
    word: { baseline: middle + WORD_HEIGHT / 2, capHeight: WORD_HEIGHT },
    upper: { baseline: middle - STACK / 2 + UPPER_HEIGHT, capHeight: UPPER_HEIGHT },
    lower: { baseline: middle + STACK / 2, capHeight: LOWER_HEIGHT },
    firstLine: { baseline: middle - LINE_GAP / 2, capHeight: WORD_HEIGHT },
    secondLine: { baseline: middle + LINE_GAP / 2 + WORD_HEIGHT, capHeight: WORD_HEIGHT },
    middle
  }
}

const TOP_DEPTH = KEY_PITCH - CAP_GAP - 2 * CAP_TOP_INSET,
  PLACES = legendPlaces(TOP_DEPTH),
  RETURN_PLACES = legendPlaces(2 * KEY_PITCH - CAP_GAP - 2 * CAP_TOP_INSET)

function drawPair(upper, lower) {
  const above = drawText(upper, PLACES.upper),
    below = drawText(lower, PLACES.lower)

  return above + below
}

function drawSlashedZero(place) {
  const zero = drawText("0", place),
    reach = place.capHeight * SLASH.reach,
    stroke = place.capHeight * SLASH.stroke,
    slash = drawLine(
      [-reach, place.baseline],
      [reach, place.baseline - place.capHeight],
      stroke,
      LEGEND_INK
    )

  return zero + slash
}

function drawPeseta(place) {
  const small = { capHeight: place.capHeight * PESETA_T.height, baseline: place.baseline },
    offset = place.capHeight * PESETA_T.offset,
    letter = drawText("P", place),
    t = drawText("t", { ...small, x: offset })

  return letter + t
}

// A cubic whose controls stand a third of the way along its chord, pulled to either side of it, swings from crest to trough 1/√3 of the pull.
function drawEnye(place) {
  const reach = (TILDE.width - TILDE.stroke) / 2,
    middle = place.baseline - place.capHeight - TILDE.above - TILDE.height / 2,
    pull = Math.sqrt(3) * (TILDE.height - TILDE.stroke),
    letter = drawText("N", place)

  return `${letter}<path d="M ${-reach} ${middle} C ${-reach / 3} ${middle - pull} ${reach / 3} ${middle + pull} ${reach} ${middle}" fill="none" stroke="${LEGEND_INK}" stroke-width="${TILDE.stroke}" stroke-linecap="round"/>`
}

function drawDelete(word, place) {
  const size = fontSize(place.capHeight),
    total = DELETE_ARROW.length + DELETE_GAP + DELETE_WORD_WIDTH,
    left = -total / 2,
    middle = [left + DELETE_ARROW.length / 2, place.baseline - place.capHeight / 2],
    arrow = drawArrow(DELETE_ARROW, middle, ARROW_TURNS.left)

  return `${arrow}<text x="${left + DELETE_ARROW.length + DELETE_GAP}" y="${place.baseline}" font-size="${size}">${word}</text>`
}

function drawBrokenBar(place) {
  const dash = place.capHeight * BROKEN_BAR.dash,
    width = place.capHeight * BROKEN_BAR.width,
    top = place.baseline - place.capHeight

  return `<rect x="${-width / 2}" y="${top}" width="${width}" height="${dash}"/><rect x="${-width / 2}" y="${place.baseline - dash}" width="${width}" height="${dash}"/>`
}

function drawCursor(turn) {
  return drawArrow(ARROW, [0, PLACES.middle], ARROW_TURNS[turn])
}

function drawPesetaKey() {
  const peseta = drawPeseta(PLACES.upper),
    arrow = drawArrow(
      THIN_ARROW,
      [0, PLACES.lower.baseline - THIN_ARROW.length / 2],
      ARROW_TURNS.up
    )

  return peseta + arrow
}

function drawWord(word, place = PLACES.word) {
  return drawText(word, place)
}

function drawLetter(letter) {
  return drawText(letter, PLACES.letter)
}

function drawLines(first, second) {
  const above = drawText(first, PLACES.firstLine),
    below = drawText(second, PLACES.secondLine)

  return above + below
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
  [32, drawText("_", PLACES.upper) + drawSlashedZero(PLACES.lower)],
  [25, drawPair("=", "-")],
  [24, drawPesetaKey()],
  [16, drawWord("CLR")],
  [79, drawDelete("BORR", PLACES.word)],
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
  [17, drawPair("*", "[")],
  [18, drawWord("INTRO", RETURN_PLACES.word)],
  [70, drawLines("FIJA", "MAYS")],
  [69, drawLetter("A")],
  [60, drawLetter("S")],
  [61, drawLetter("D")],
  [53, drawLetter("F")],
  [52, drawLetter("G")],
  [44, drawLetter("H")],
  [45, drawLetter("J")],
  [37, drawLetter("K")],
  [36, drawLetter("L")],
  [29, drawEnye(PLACES.letter)],
  [28, drawPair(":", ";")],
  [19, drawPair("+", "]")],
  [21, drawWord("MAYS")],
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
  [10, drawLetter("7")],
  [11, drawLetter("8")],
  [3, drawLetter("9")],
  [20, drawLetter("4")],
  [12, drawLetter("5")],
  [4, drawLetter("6")],
  [13, drawLetter("1")],
  [14, drawLetter("2")],
  [5, drawLetter("3")],
  [15, drawSlashedZero(PLACES.letter)],
  [7, drawLetter(".")],
  [6, drawWord("INTRO")],
  [0, drawCursor("up")],
  [8, drawCursor("left")],
  [9, drawWord("COPIA")],
  [1, drawCursor("right")],
  [2, drawCursor("down")]
])

function drawLegends(keys) {
  const drawn = [svgOpen(LEGEND_ATLAS_WIDTH, LEGEND_ATLAS_DEPTH, LEGEND_INK)]

  for (const key of keys) {
    const [axis, rear] = key.printedAt,
      legend = LEGENDS.get(key.number)

    drawn.push(`<g transform="translate(${axis} ${rear})">${legend}</g>`)
  }

  drawn.push("</svg>")

  return drawn.join("\n")
}

function leaningCorners({ left, right, top, bottom, lean }) {
  const shift = (bottom - top) * tangent(lean)

  return [
    [left + shift, top],
    [right + shift, top],
    [right, bottom],
    [left, bottom]
  ]
}

function gapCorners({ box, gap }) {
  const run = tangent(gap.lean),
    above = (gap.at - box.top) * run,
    below = (box.bottom - gap.at) * run

  return [
    [gap.left + above, box.top - HAIRLINE],
    [gap.left + gap.width + above, box.top - HAIRLINE],
    [gap.left + gap.width - below, box.bottom + HAIRLINE],
    [gap.left - below, box.bottom + HAIRLINE]
  ]
}

function drawColourBars({ plate, bars }) {
  const drawn = [],
    halfway = plate.top + (bars.top + bars.bottom - bars.split) / 2,
    last = BADGE_INKS.bars.length - 1

  for (const [index, ink] of BADGE_INKS.bars.entries()) {
    const left = plate.left + bars.first + index * bars.pitch,
      right = left + bars.width,
      upper = { left, right, top: plate.top + bars.top, bottom: halfway },
      lower = { left, right, top: halfway + bars.split, bottom: plate.top + bars.bottom },
      outer = index == 0 || index == last,
      radius = outer ? bars.round : 0,
      upperBar = drawBox(upper, { fill: ink, radius }),
      lowerBar = drawBox(lower, { fill: ink, radius })

    drawn.push(upperBar, lowerBar)
  }

  return drawn.join("\n")
}

function drawLogo({ box, logo }) {
  const size = fontSize(logo.capHeight, HEROS_CONDENSED_CAP_HEIGHT)

  return `<text transform="translate(${logo.left} ${logo.baseline}) skewX(${-box.lean})" font-family="${HEROS_CONDENSED}" font-size="${size}" font-weight="700" fill="${BADGE_INKS.letters}" textLength="${logo.width}" lengthAdjust="spacingAndGlyphs">${logo.word}</text>`
}

function drawBadge() {
  const width = BADGE.right - BADGE.left,
    depth = BADGE.toRear - BADGE.fromRear,
    wordsStyle = {
      capHeight: BADGE_ART.wordsCapHeight,
      baseline: BADGE_ART.wordsBaseline,
      ink: BADGE_INKS.words
    },
    words = BADGE_ART.words.map(word => drawFittedText(word, wordsStyle)),
    boxCorners = leaningCorners(BADGE_ART.box),
    cut = gapCorners(BADGE_ART),
    { model, switchedOn } = BADGE_ART

  return [
    svgOpen(width, depth),
    `<rect width="${width}" height="${depth}" fill="${BADGE_PLATE.colour}"/>`,
    drawPolygon(boxCorners, BADGE_INKS.box),
    drawPolygon(cut, BADGE_PLATE.colour),
    drawLogo(BADGE_ART),
    ...words,
    drawFittedText(model, {
      capHeight: model.capHeight,
      baseline: model.baseline,
      ink: BADGE_INKS.model
    }),
    drawBox(BADGE_ART.plate, { fill: BADGE_INKS.plate }),
    drawColourBars(BADGE_ART),
    drawFittedText(BADGE_ART.colour, wordsStyle),
    drawFittedText(switchedOn, {
      capHeight: switchedOn.capHeight,
      baseline: switchedOn.baseline,
      ink: BADGE_INKS.words
    }),
    "</svg>"
  ].join("\n")
}

function drawCounter() {
  const width = COUNTER.right - COUNTER.left,
    depth = COUNTER.toRear - COUNTER.fromRear,
    window = {
      left: COUNTER_WINDOW.left - COUNTER.left,
      right: COUNTER_WINDOW.right - COUNTER.left,
      top: COUNTER_WINDOW.fromRear - COUNTER.fromRear,
      bottom: COUNTER_WINDOW.toRear - COUNTER.fromRear
    }

  return [
    svgOpen(width, depth),
    `<rect width="${width}" height="${depth}" fill="${COUNTER_FACE.colour}"/>`,
    drawBox(window, { fill: COUNTER_WHEELS_COLOUR }),
    "</svg>"
  ].join("\n")
}

// One wheel's figures, 0 to 9 down a strip a window's depth apiece, which the page rolls past the window; which way a real wheel's figures run is not seen, and is a guess.
function drawCounterDigits() {
  const width = (COUNTER_WINDOW.right - COUNTER_WINDOW.left) / COUNTER_WHEELS.length,
    cell = COUNTER_WINDOW.toRear - COUNTER_WINDOW.fromRear,
    depth = cell * COUNTER_FIGURES,
    figures = []

  for (let figure = 0; figure < COUNTER_FIGURES; figure++) {
    const baseline = (figure + 0.5) * cell + COUNTER_ART.capHeight / 2,
      drawn = drawText(String(figure), {
        x: width / 2,
        baseline,
        capHeight: COUNTER_ART.capHeight,
        ink: COUNTER_DIGITS
      })

    figures.push(drawn)
  }

  return [
    svgOpen(width, depth),
    `<rect width="${width}" height="${depth}" fill="${COUNTER_WHEELS_COLOUR}"/>`,
    ...figures,
    "</svg>"
  ].join("\n")
}

function drawCounterLegend() {
  const width = COUNTER_LEGEND.right - COUNTER_LEGEND.left,
    depth = COUNTER_LEGEND.toRear - COUNTER_LEGEND.fromRear,
    drawn = [
      svgOpen(width, depth),
      `<rect width="${width}" height="${depth}" fill="${CABINET_TOP.colour}"/>`
    ]

  for (const line of COUNTER_ART.lines) {
    for (const [index, word] of line.words.entries()) {
      const place = {
          x: line.middle,
          baseline: COUNTER_ART.lineBaselines[index],
          capHeight: COUNTER_ART.lineCapHeight,
          ink: COUNTER_RELIEF
        },
        drawnWord = drawText(word, place)

      drawn.push(drawnWord)
    }
  }

  drawn.push("</svg>")

  return drawn.join("\n")
}

function drawTick(scale, x, rise, drop = 0) {
  return drawLine([x, scale.line - rise], [x, scale.line + drop], scale.stroke, SCALE_INK)
}

function drawScale(scale) {
  const [from, to] = scale.ticks,
    middle = (from + to) / 2,
    strokes = [
      drawLine([scale.left, scale.line], [scale.right, scale.line], scale.stroke, SCALE_INK),
      drawTick(scale, scale.left, scale.ends / 2, scale.ends / 2),
      drawTick(scale, scale.right, scale.ends / 2, scale.ends / 2),
      drawTick(scale, from, scale.tickRise),
      drawTick(scale, to, scale.tickRise)
    ]

  for (let x = from + scale.step; x < to - scale.step / 2; x += scale.step) {
    const centre = Math.abs(x - middle) < scale.step / 2,
      tick = centre
        ? drawTick(scale, middle, scale.stepRise, scale.middleDrop)
        : drawTick(scale, x, scale.stepRise)

    strokes.push(tick)
  }

  return strokes.join("\n")
}

function drawLid() {
  const width = LID_PANEL.right - LID_PANEL.left,
    depth = LID_PANEL.toRear - LID_PANEL.fromRear,
    bar = LID_ART.labelBar,
    barOutline = {
      left: bar.left,
      right: bar.left + bar.width,
      top: bar.top,
      bottom: bar.top + bar.height
    }

  return [
    svgOpen(width, depth),
    `<rect width="${width}" height="${depth}" fill="${LID.colour}"/>`,
    drawScale(LID_ART.scale),
    drawBox(barOutline, { fill: LABEL_BAR_RED }),
    "</svg>"
  ].join("\n")
}

function drawInlayBox(box, art) {
  const outline = { left: art.boxLeft, right: art.boxRight, top: box.top, bottom: box.bottom },
    stroked = box.fill == "none",
    style = stroked ? { fill: "none", stroke: box.ink, thickness: art.stroke } : { fill: box.fill },
    word = {
      x: (art.boxLeft + art.boxRight) / 2,
      baseline: (box.top + box.bottom) / 2 + art.capHeight / 2,
      capHeight: art.capHeight,
      ink: box.ink
    }

  return drawBox(outline, style) + drawText(box.word, word)
}

function drawInlay() {
  const width = INLAY.right - INLAY.left,
    depth = INLAY.toRear - INLAY.fromRear,
    art = INLAY_ART,
    [green, red, white] = art.boxes,
    levelOf = box => (box.top + box.bottom) / 2,
    boxes = art.boxes.map(box => drawInlayBox(box, art)),
    outline = { fill: "none", stroke: INLAY_WHITE, thickness: art.stroke },
    greenLine = [
      [art.boxRight, levelOf(green)],
      [art.square.left, levelOf(green)]
    ],
    greenOnward = [
      [art.square.right, levelOf(green)],
      [art.greenTurn, levelOf(green)],
      [art.greenTurn, art.outline.top]
    ],
    redLine = [
      [art.boxRight, levelOf(red)],
      [art.redStep, levelOf(red)],
      [art.redStep, art.redLevel],
      [art.outline.left, art.redLevel]
    ],
    whiteLine = [
      [art.boxRight, levelOf(white)],
      [art.outline.left, levelOf(white)]
    ]

  return [
    svgOpen(width, depth),
    `<rect width="${width}" height="${depth}" fill="${INLAY_PLATE.colour}"/>`,
    ...boxes,
    drawBox(art.square, { fill: INLAY_GREEN }),
    drawBox(art.outline, outline),
    drawBox(art.slot, outline),
    drawBox(art.block, { fill: INLAY_RED }),
    drawPolyline(greenLine, INLAY_GREEN, art.stroke),
    drawPolyline(greenOnward, INLAY_GREEN, art.stroke),
    drawPolyline(redLine, INLAY_RED, art.stroke),
    drawPolyline(whiteLine, INLAY_WHITE, art.stroke),
    "</svg>"
  ].join("\n")
}

// The piano keys' symbols, drawn: a dot, and triangles pointing the way the tape runs.
function drawSymbol(symbol, [x, y]) {
  const { size } = PIANO_ART,
    half = size / 2,
    triangle = (tipX, turn) =>
      `<polygon points="${tipX + turn * half},${y} ${tipX - turn * half},${y - half} ${tipX - turn * half},${y + half}" fill="${PIANO_INK}"/>`

  switch (symbol) {
    case "record":
      return `<circle cx="${x}" cy="${y}" r="${half * PIANO_ART.dot}" fill="${PIANO_INK}"/>`
    case "play":
      return triangle(x, 1)
    case "rewind":
      return triangle(x - half, -1) + triangle(x + half, -1)
    case "fast-forward":
      return triangle(x - half, 1) + triangle(x + half, 1)
    default:
      return ""
  }
}

function drawPianoLegends() {
  const [topWidth, topDepth] = PIANO_KEY.top,
    width = PIANO_KEYS.length * PIANO_KEY.pitch,
    drawn = [svgOpen(width, topDepth)]

  for (const [index, key] of PIANO_KEYS.entries()) {
    const left = index * PIANO_KEY.pitch,
      ground = key.colour == "red" ? RECORD_KEY_PLASTIC.colour : PIANO_KEY_PLASTIC.colour,
      axis = left + PIANO_MARGIN + topWidth / 2,
      baselines = key.words.length == 2 ? PIANO_ART.twoLines : PIANO_ART.oneLine,
      symbol = drawSymbol(key.symbol, [axis, PIANO_ART.symbolMiddle])

    drawn.push(
      `<rect x="${left}" y="0" width="${PIANO_KEY.pitch}" height="${topDepth}" fill="${ground}"/>`,
      symbol
    )

    for (const [line, word] of key.words.entries()) {
      const place = {
          x: axis,
          baseline: baselines[line],
          capHeight: PIANO_ART.capHeight,
          weight: 700,
          ink: PIANO_INK
        },
        drawnWord = drawText(word, place)

      drawn.push(drawnWord)
    }
  }

  drawn.push("</svg>")

  return drawn.join("\n")
}

function subtracted(place, origin) {
  return place.map((value, axis) => value - origin[axis])
}

// The lid swings on its hinge, so each of its parts is given from the hinge's line, and a cassette's seat stands among them.
function buildLid() {
  const middle = (LID_RECESS.left + LID_RECESS.right) / 2,
    hingeAt = onTopAt(middle, upSlope(HINGE.fromRear), -HINGE.below),
    hinge = centred(hingeAt),
    seatAt = onTopAt(
      SPINDLES.middle,
      upSlope((CASSETTE.fromRear + CASSETTE.toRear) / 2),
      -CASSETTE_BELOW
    ),
    seat = centred(seatAt),
    toHinge = hinge.map(value => -value),
    parts = [
      buildTopPlate({
        name: "cassette-lid-rail",
        outline: LID_RAIL,
        thickness: LID_THICKNESS,
        material: LID_RAIL_FACE
      }),
      buildTopPlate({
        name: "cassette-window",
        outline: LID_WINDOW,
        thickness: WINDOW_THICKNESS,
        material: WINDOW
      }),
      buildTopPlate({
        name: "lid-panel",
        outline: LID_PANEL,
        thickness: LID_THICKNESS,
        material: LID,
        print: LID_PRINT
      }),
      buildHolder(),
      buildHolderTabs(),
      buildHolderClip()
    ],
    hinged = parts.map(function (part) {
      const placed = Object.hasOwn(part, "place")

      if (placed) {
        return { ...part, place: subtracted(part.place, hinge) }
      }

      return { ...part, shape: part.shape.translate(toHinge) }
    })

  return {
    name: "cassette-lid",
    place: hinge,
    parts: [
      ...hinged,
      { name: "cassette-seat", place: subtracted(seat, hinge), tilt: TOP_ANGLE, parts: [] }
    ]
  }
}

// Each wheel shows through its third of the counter's window, a hairline proud of the counter's face, and carries its own print, which the page rolls.
function buildCounterWheels() {
  const width = (COUNTER_WINDOW.right - COUNTER_WINDOW.left) / COUNTER_WHEELS.length

  return COUNTER_WHEELS.map(function (name, index) {
    const left = COUNTER_WINDOW.left + index * width

    return buildTopPlate({
      name,
      outline: { ...COUNTER_WINDOW, left, right: left + width },
      thickness: PLATE_THICKNESS,
      material: COUNTER_WHEEL_PLASTICS[index],
      print: COUNTER_DIGITS_PRINT,
      standing: PLATE_THICKNESS - COUNTER.depth + 2 * HAIRLINE
    })
  })
}

export function buildCpc464() {
  const laid = KEYS.map(layKey),
    returnKey = layKey({
      ...RETURN_KEY,
      left: RETURN_KEY.leg.left,
      width: RETURN_KEY.leg.width,
      rows: 2
    }),
    keycaps = buildKeycaps(laid),
    returnKeycap = buildReturnKeycap(returnKey),
    cabinetTop = buildCabinetTop(),
    prints = [
      [LEGENDS_PRINT, drawLegends([...laid, returnKey]), LEGEND_PIXELS],
      [BADGE_PRINT, drawBadge(), PLATE_PIXELS],
      [COUNTER_PRINT, drawCounter(), PLATE_PIXELS],
      [COUNTER_DIGITS_PRINT, drawCounterDigits(), PLATE_PIXELS],
      [COUNTER_LEGEND_PRINT, drawCounterLegend(), PLATE_PIXELS],
      [LID_PRINT, drawLid(), PLATE_PIXELS],
      [INLAY_PRINT, drawInlay(), PLATE_PIXELS],
      [PIANO_PRINT, drawPianoLegends(), PLATE_PIXELS]
    ]

  return {
    tessellation: TESSELLATION,
    parts: [
      { name: "cabinet-top", shape: cabinetTop.translate(CENTRING), material: CABINET_TOP },
      buildCabinetBottom(),
      buildFeet(),
      buildInterior(),
      ...keycaps,
      returnKeycap,
      buildBadge(),
      buildPowerLamp(),
      buildTopPlate({
        name: COUNTER_PRINT,
        outline: COUNTER,
        thickness: PLATE_THICKNESS,
        material: COUNTER_FACE,
        print: COUNTER_PRINT,
        standing: PLATE_THICKNESS - COUNTER.depth
      }),
      buildTopPlate({
        name: COUNTER_LEGEND_PRINT,
        outline: COUNTER_LEGEND,
        thickness: PLATE_THICKNESS,
        material: COUNTER_LEGEND_PLATE,
        print: COUNTER_LEGEND_PRINT
      }),
      buildResetLever(),
      ...buildCounterWheels(),
      buildLid(),
      buildDeckMetal(),
      buildTopPlate({
        name: INLAY_PRINT,
        outline: INLAY,
        thickness: PLATE_THICKNESS,
        material: INLAY_PLATE,
        print: INLAY_PRINT
      }),
      ...buildPianoKeys(),
      buildPowerKnob(),
      buildVolumeWheel()
    ],
    prints: prints.map(([name, svg, pixels]) => ({ name, language: LANGUAGE, svg, pixels }))
  }
}
