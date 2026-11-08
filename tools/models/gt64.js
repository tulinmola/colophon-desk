import {
  Plane,
  draw,
  drawRectangle,
  makeBox,
  makeCompound,
  makeCylinder,
  makeSphere
} from "replicad"

// x runs from the left side, y back from the lower edge of the face and z up from the desk, in millimetres.

// The monitor is two mouldings over a tube: front cabinet 170501, rear cabinet 170513, the three thumbwheels 170514 of the brightness, contrast and vertical hold, the power button 170515 on its switch 170516, and the C.R.T. 170507, a 310GNB31 [A], CPC464/CTM640/GT64 Service Manual p15, GT64 exploded view and parts list: https://archive.org/details/amstrad-cpc-464-micro-computer-ctm-640-color-monitor-gt-64-green-monitor-service-manual
// The GT65 keeps the rear cabinet and the fittings and redraws only the front, 170831, to carry a 12V DC jack [A], CPC6128/CTM644/GT65 Service Manual p19: https://archive.org/details/amstrad-cpc-6128-micro-computer-ctm-644-color-monitor-gt-65-green-monitor-service-manual
// Amstrad's own photograph of a GT64 and an English GT65's, rectified to one scale, agree within 1 to 2 everywhere but that jack [E], so GT65s stand in wherever no GT64 was photographed: most of what lies behind the face, where the Schneider GT64s photographed since agree with them. The GT64 is Amstrad's, captioned "Moniteur monochrome vert (GT64)" [A]: https://amstrad.eu/wp-content/uploads/ftp_cpcscene/Pubs/CPC/CPC464_Au_premier_coup_d_oeil.pdf, and photographed square-on in https://amstrad.eu/wp-content/uploads/ftp_cpcscene/Pubs/CPC/CPC464_Un_ordinateur_complet.pdf
// The GT65s are the Living Computer Museum's English unit, https://commons.wikimedia.org/wiki/File:CPC464(2).jpg, and a Schneider unit seen from the front, the side and behind, https://oldcrap.org/2018/11/04/amstrad-schneider-gt-65-monitor/

// "DIMENSIONS (mm): w h d … GT64 305 315 335" [A], the same manual p2. The Universitat Politècnica de València's museum measures a GT65 of the GT64's own generation, its badge at the left, "Altura = 31,50 cm; Anchura = 29,50 cm; Profundidad = 36 cm; Peso = 5,30 Kg" [B]: https://ceres.mcu.es/pages/Main?idt=121856&inventary=CE2017/007/005&table=FMUS&museum=MUPV — and the same table gives the 464 580 wide, where museums measure 568 to 575.
// The side view puts the whole height at 1.070 of the face's width [E], so the 315 both sources agree on makes the face 294.5 wide; the thumbwheels' pitch against the pitch of their pots on the GT64's board drawing makes it 295 to 301 [E], same manual p17. The face is taken 295 wide, and Amstrad's 305 stands beside it.
// The face's and the side's figures below were read in proportion on photographs and scaled to that width.
const WIDTH = 295,
  HEIGHT = 315

const RADIANS = Math.PI / 180

// The face stands 0.832 of its width tall on the English and Schneider units and on Amstrad's photograph, and leans back 16.3° on the side view [E].
const FACE_LEAN = 16.3,
  FACE_HEIGHT = 0.832 * WIDTH,
  FACE_REACH = FACE_HEIGHT * Math.sin(FACE_LEAN * RADIANS),
  FACE_BOTTOM = HEIGHT - FACE_HEIGHT * Math.cos(FACE_LEAN * RADIANS)

// The same side view: the front moulding runs 60 back along the top, which falls 5.4° toward the rear, and meets the rear moulding on a line parallel to the face. Under the face its frame runs back 27 and down 14 to a lower panel standing upright, which carries the controls [E].
const SLEEVE_DEPTH = 60,
  SLEEVE_FALL = 5.4,
  UNDERSIDE_DROP = 14,
  PANEL_SET_BACK = 27

// Behind the joint the top falls 30.4° to the rear top corner, the rear face leans 9.9° with its top back down to 24 above the desk, and a chamfer about 27 across takes it to the base [E]. That corner stands 343 to 357 behind the face's lower edge on the side view, which allows neither Amstrad's 335 nor the museum's 360; 350 is taken.
// No view squares the rear face. The Schneider unit seen from behind makes it as wide as it is tall, about 180 against the side view's height, and a Schneider GT64 seen from behind and above bounds it at 200 [E]: https://www.kleinanzeigen.de/s-anzeige/schneider-cpc-464-original-gt64-gruenmonitor-gereinigt-gepruef/3538996032-228-2054. The rear moulding runs straight from the joint's full width to it, as the views from behind show.
const TOP_SLOPE = 30.4,
  REAR_DEPTH = 350,
  REAR_LEAN = 9.9,
  REAR_FOOT = 24,
  REAR_CHAMFER = 27,
  REAR_WIDTH = 180

// The outer edges read rounded over 2 to 3 [E], and 2.5 is taken. The badge's lettering runs within 1.2 of the face's lower edge, so that edge is rounded over no more than 1. No view reads the rear top corner's rounding; 5 is taken.
const EDGE_RADIUS = 2.5,
  LOWER_EDGE_RADIUS = 1,
  REAR_TOP_RADIUS = 5

// On the face, square-on, measured down from its top [E]: a flat band 5.3 across at the top and the sides, and the badge band from 234.4 to the lower edge. Inside them a tunnel falls to the opening, its walls ending about 18 behind the face, ±4; its outer rim reads sharp, and 2 is taken.
const FLAT_BAND = 5.3,
  BADGE_BAND = 234.4,
  RIM_RADIUS = 2,
  WALL_DEPTH = 18

// The opening spans 22.4 to 270.3 across and 21.9 to 221.0 down, its corners rounded over 28.3, and its edges bow outward as the tube's face does: the top 5.6 over ±87 from its middle, the bottom 5.8, the sides 4.4 over ±70 [E]. Each edge is drawn as one arc between the corners those bows put it through, rising 10.1 at the top, 10.5 at the bottom and 7.2 at the sides.
const OPENING = {
    left: 22.4,
    right: 270.3,
    top: 21.9,
    bottom: 221.0,
    radius: 28.3,
    bows: { top: 10.1, bottom: 10.5, side: 7.2 }
  },
  OPENING_WIDTH = OPENING.right - OPENING.left,
  OPENING_HEIGHT = OPENING.bottom - OPENING.top

// The 310GNB31 is interchangeable with Philips' M31-334GH [C]: https://www.nightfallcrew.com/08/08/2014/commodore-4032-fat40-8032-crt-replacement/
// That tube's face contour falls 21.4 from its centre to the useful screen's diagonal edge [A], Philips M31-330 series, March 1978: https://frank.pocnet.net/other/CRT_Heerlen/M31-330-Series.pdf, and read off the same contour 10.1 and 16.1 to its vertical and horizontal edges, each ±1.5 [E]: a sphere of 509 radius on all three, 470 to 555 within those readings. Philips' later M31-340 bulbs draw 635, and which bulb Orion followed is not known.
// Parallax between two views puts the glass about 25 behind the face at the opening's sides [E], ±5, so its apex stands 9.7 behind. It is cut to the opening and a margin the walls hide, and 30 deep, which clears the 20.4 its face falls to the margin's farthest corner.
const FACE_RADIUS = 509,
  GLASS_SETBACK = 25,
  GLASS_MARGIN = 2,
  GLASS_THICKNESS = 30

// How far the faceplate falls from its apex at a distance from the tube's axis.
function sagitta(across) {
  return FACE_RADIUS - Math.sqrt(FACE_RADIUS ** 2 - across ** 2)
}

const GLASS_APEX = GLASS_SETBACK - sagitta(OPENING_WIDTH / 2)

// Behind the walls the bore runs on to the glass, which falls about 30 behind the face at the opening's corners.
const BORE_DEPTH = 20

// The picture is the whole beam path the machine draws, 1024 samples by 312 lines [A], CPC_FRAMEBUFFER_WIDTH and CPC_FRAMEBUFFER_HEIGHT in the emulator's src/cpc.h. At power-on its paper stands at samples 272 to 911 and lines 70 to 269, read on the desk's own module from the start-up text, whose "Ready" stands in the paper's first column [E].
// A running Schneider GT64, photographed nearly square-on, shows 44.2 µs across its opening's middle, the paper 2.1 µs in from either side, and 257 lines down it, the paper 51 lines from the top [E]: https://www.kleinanzeigen.de/s-anzeige/schneider-cpc464-mit-gruenmonitor/3557591301-228-9501. At 16 samples a µs the opening shows samples 238 to 944 and lines 19 to 275, which sets the scale both ways and stands the picture as low in the glass as that unit's neck magnets left it; the service manual centres the raster by those magnets, not by a figure [A], p17.
// The camera stood a little above that glass, so the lines are the less certain; a running Schneider GT65 shows 269 down its opening, 49 above the paper [E]: oldcrap.org, above.
const RASTER = { columns: 1024, rows: 312 },
  SHOWN = { left: 238, columns: 707, top: 19, rows: 257 },
  SHOWN_MIDDLE = [SHOWN.left + SHOWN.columns / 2, SHOWN.top + SHOWN.rows / 2],
  SAMPLE = OPENING_WIDTH / SHOWN.columns,
  LINE = OPENING_HEIGHT / SHOWN.rows

// The lower panel carries three slots for the thumbwheels, 24.0 by 5.1 about centres 96.7, 131.0 and 165.4 across, and the power button, about 9.7 by 4.4 and level with them [E]. The GT65s centre their button over its word, at 252.4 and 254.8 across [E], and the GT64's is centred so over its own, at 255.6. Their height on the panel reads only on the BnF's later GT65-2 seen from a little above, about 13.6 under the panel's top, ±4, and so 52 up here [E]: https://commons.wikimedia.org/wiki/Category:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Amstrad_-_CPC_464._Micro-ordinateur_Amstrad_CPC_464,_n%C2%B0_de_s%C3%A9rie_du_clavier_533-7834019_-_btv1b55013024n
// The thumbwheels are black discs about 27.3 across turning on upright axles, read on the Schneider unit's board against its pots' pitch [E]. How thick they are, how far they stand proud of the panel, how deep the slots run and how far the button stands are not measured: 4, which the slot's 5.1 bounds, 3, 10 and 1.5 are taken.
const CONTROLS_HEIGHT = 52,
  SLOT = { width: 24, height: 5.1, depth: 10 },
  WHEEL_PLACES = [96.7, 131.0, 165.4],
  WHEEL = { diameter: 27.3, thickness: 4, standing: 3 },
  POWER_BUTTON = { middle: 255.6, width: 9.7, height: 4.4, standing: 1.5, depth: 4 }

// The top carries a grille ending at the rear top corner, 30 columns by 5 rows of slots across 0.916 of the rear face's width on a Schneider GT64 seen from behind, 0.93 on the Schneider GT65 [E]. How far it runs along the top was read here, roughly, on the GT65's view alone, about 170; the slots' share of their pitch, the bars between the rows and the slots' depth are not read: 0.7, 3 and 4 are taken, and behind the slots is the dark of the cabinet's inside. Its slots run on over the corner onto the rear face, which is not drawn, nor is the rear face's lower vent block, its cord hooks or its label.
const GRILLE = {
  columns: 30,
  rows: 5,
  width: 0.916 * REAR_WIDTH,
  length: 170,
  fill: 0.7,
  bar: 3,
  depth: 4,
  setBack: REAR_TOP_RADIUS + 1
}

// The badge band carries the AMSTRAD wordmark, outlined condensed capitals 7.5 tall, 16.4 to 44.5 across about a middle 239.5 down, and "GT 64 Monitor", capitals 3.7 tall, 47.2 to 85.5 across on a baseline 244.2 down, all on Amstrad's photograph [E]. The outline's stroke is not resolved there; the other monitor's 0.7 on capitals 12.5 tall, brought to these, gives the 0.45 taken.
// The lower panel names each control in lower case 3 to 4 tall over its descenders, 2.7 to its ascenders as read here on the English unit, the middle of its lower case about 9.5 below the control's — "brightness" 85.7 to 111.2 across, "contrast" 122.4 to 142.5, "v-hold" 160.5 to 174.1 — and beside them "power" 248.2 to 263.1 across, 5.65 below, a dash and a filled square 9 below over "on" 247.0 to 252.4 and "off" 257.3 to 264.0, 12.35 below, read here on Amstrad's photograph, the English unit's agreeing within 1 below the controls and placing the whole block 3 to the left [E]. The square reads about 1.2 across and the dash about twice as long; their thickness is taken.
// Amstrad's lettering is a geometric sans no source names; TeX Gyre Heros stands in, as it does on the other monitor, its capitals 0.729 of its size, its condensed cut's 0.718 and its lower case 0.523: https://www.gust.org.pl/projects/e-foundry/tex-gyre/heros. The panel's lower case is sized by its ascenders, which stand about as tall as its capitals. Every word is fitted to the width measured for it.
const AMSTRAD_WORD = {
    word: "AMSTRAD",
    left: 16.4,
    width: 28.1,
    capHeight: 7.5,
    baseline: 243.25,
    stroke: 0.45
  },
  MODEL_WORD = { word: "GT 64 Monitor", left: 47.2, width: 38.3, capHeight: 3.7, baseline: 244.2 },
  BADGE_PANEL = { left: 15.4, right: 86.5, top: 234.9, bottom: 244.5 },
  LEGEND_HEIGHT = 2.7,
  LEGEND_DROP = 9.5,
  CONTROL_WORDS = [
    { word: "brightness", left: 85.7, width: 25.5 },
    { word: "contrast", left: 122.4, width: 20.1 },
    { word: "v-hold", left: 160.5, width: 13.6 }
  ],
  POWER_WORDS = [
    { word: "power", left: 248.2, width: 14.9, drop: 5.65 },
    { word: "on", left: 247.0, width: 5.4, drop: 12.35 },
    { word: "off", left: 257.3, width: 6.7, drop: 12.35 }
  ],
  POWER_MARKS = { on: 249.7, off: 260.65, drop: 9, size: 1.2 },
  LEGEND_PANEL = {
    left: 84.7,
    right: 265,
    top: CONTROLS_HEIGHT - 4.2,
    bottom: CONTROLS_HEIGHT - 14.3
  }

// A printed part is the thinnest plate that can carry a print, sunk flush into the moulding, its rectangle grown by 1 so that no stroke falls on an edge; the panel words want their strokes clean at twelve pixels to the millimetre, as the other monitor's do.
const PLATE_THICKNESS = 0.3,
  PLATE_PIXELS = 12

// Amstrad's photographs show the monitor and the 464 in one plastic [E]; the 464's top, sampled in the BnF's studio, is taken for both. The BnF's later GT65-2 reads 0.55 to 0.65 of the 464's light against the same backdrop [E], which may be its moulding or the light it stood in. The thumbwheels and the button are taken as dark as the 464's own volume wheel, and the inside as dark as the 464's seen through its vents.
const CABINET = { name: "cabinet", colour: "#454648" },
  FITTING = { name: "fitting", colour: "#2d2d2d" },
  INSIDE = { name: "inside", colour: "#141414" },
  PHOSPHOR = { name: "phosphor", colour: "#0b0c0d" }

// The lettering reads light grey, and the 464's legend ink in the same studio is taken for it.
// A printed part carries a material of its own because the page inks a print over the material it finds, and a material shared with the shell would carry the print onto the shell.
const LEGEND_INK = "#c3c7c7",
  BADGE_FACE = { name: "badge", colour: CABINET.colour },
  LEGEND_FACE = { name: "panel-legends", colour: CABINET.colour }

const HEROS = "TeX Gyre Heros",
  HEROS_CONDENSED = "TeX Gyre Heros Cn",
  HEROS_CAP_HEIGHT = 0.729,
  HEROS_CONDENSED_CAP_HEIGHT = 0.718,
  HEROS_X_HEIGHT = 0.523

// The one GT64 photographed is lettered in English. A Spanish GT65 is lettered in Spanish, BRILLO, CONTRASTE and SINCRO VERT. under its thumbwheels [E], https://commons.wikimedia.org/wiki/File:Amstrad_CPC_464_(1984)_1.jpg, and a Spanish GT64 may have been too, but none has been seen, so the English is drawn.
const LANGUAGE = "es",
  BADGE_PRINT = "badge",
  LEGEND_PRINT = "panel-legends"

// A cut runs this far past the faces it opens, so the kernel is never left two coplanar faces to join.
const OVERRUN = 1

// How far the triangles may stray from a curved face, in millimetres, and turn from one another along it, in radians: a choice of how finely to draw, not a figure of the machine.
const TESSELLATION = { tolerance: 0.1, angularTolerance: 0.5 }

const JOINT_TOP = [
    FACE_REACH + SLEEVE_DEPTH,
    HEIGHT - SLEEVE_DEPTH * Math.tan(SLEEVE_FALL * RADIANS)
  ],
  JOINT_FOOT = JOINT_TOP[0] - JOINT_TOP[1] * Math.tan(FACE_LEAN * RADIANS),
  PANEL_TOP = FACE_BOTTOM - UNDERSIDE_DROP,
  REAR_TOP = [
    REAR_DEPTH,
    JOINT_TOP[1] - (REAR_DEPTH - JOINT_TOP[0]) * Math.tan(TOP_SLOPE * RADIANS)
  ],
  REAR_BOTTOM = [REAR_DEPTH - (REAR_TOP[1] - REAR_FOOT) * Math.tan(REAR_LEAN * RADIANS), REAR_FOOT]

const CENTRING = [-WIDTH / 2, -REAR_DEPTH / 2, 0]

// Down from the face's top, as the face was measured, to up from its lower edge, where it is drawn.
function up(fromTop) {
  return FACE_HEIGHT - fromTop
}

// A point on the face, x across it, y up it from its lower edge and z out of it, where it stands in the monitor.
function fromFace([across, along, out]) {
  const lean = FACE_LEAN * RADIANS

  return [
    across,
    along * Math.sin(lean) - out * Math.cos(lean),
    FACE_BOTTOM + along * Math.cos(lean) + out * Math.sin(lean)
  ]
}

// A shape drawn on the face is turned and lifted to stand where the face stands.
function onFace(shape) {
  return shape.rotate(90 - FACE_LEAN, [0, 0, 0], [1, 0, 0]).translate([0, 0, FACE_BOTTOM])
}

// A shape drawn on the top's slope, x across, y down the slope from the rear top corner and z out of it, is turned to stand there.
function onSlope(shape) {
  return shape.rotate(-TOP_SLOPE, [0, 0, 0], [1, 0, 0]).translate([0, REAR_TOP[0], REAR_TOP[1]])
}

function placed(point) {
  return point.map((coordinate, axis) => coordinate + CENTRING[axis])
}

function openingOutline(step) {
  const { bows, radius } = OPENING,
    corner = radius + step,
    left = OPENING.left - step + bows.side,
    right = OPENING.right + step - bows.side,
    top = up(OPENING.top - step) - bows.top,
    bottom = up(OPENING.bottom + step) + bows.bottom

  return draw([left, bottom])
    .sagittaArcTo([right, bottom], -bows.bottom)
    .customCorner(corner)
    .sagittaArcTo([right, top], -bows.side)
    .customCorner(corner)
    .sagittaArcTo([left, top], -bows.top)
    .customCorner(corner)
    .sagittaArcTo([left, bottom], -bows.side)
    .closeWithCustomCorner(corner)
}

function rimOutline() {
  const left = FLAT_BAND,
    right = WIDTH - FLAT_BAND,
    top = up(FLAT_BAND),
    bottom = up(BADGE_BAND)

  return draw([left, bottom])
    .lineTo([right, bottom])
    .customCorner(RIM_RADIUS)
    .lineTo([right, top])
    .customCorner(RIM_RADIUS)
    .lineTo([left, top])
    .customCorner(RIM_RADIUS)
    .closeWithCustomCorner(RIM_RADIUS)
}

function buildFrontShell() {
  const side = draw([0, FACE_BOTTOM])
    .lineTo([FACE_REACH, HEIGHT])
    .customCorner(EDGE_RADIUS)
    .lineTo(JOINT_TOP)
    .lineTo([JOINT_FOOT, 0])
    .lineTo([PANEL_SET_BACK, 0])
    .lineTo([PANEL_SET_BACK, PANEL_TOP])
    .closeWithCustomCorner(LOWER_EDGE_RADIUS)

  return side.sketchOnPlane("YZ").extrude(WIDTH)
}

// A sketch is destroyed by the loft or the extrusion it feeds, so each outline is drawn again for the next.
function buildTunnel() {
  const rim = rimOutline().sketchOnPlane("XY"),
    opening = openingOutline(0).sketchOnPlane("XY", -WALL_DEPTH),
    walls = rim.loftWith(opening, { ruled: true }),
    mouth = rimOutline().sketchOnPlane("XY").extrude(OVERRUN),
    bore = openingOutline(0).sketchOnPlane("XY", -WALL_DEPTH).extrude(-BORE_DEPTH),
    cavity = walls.fuse(mouth).fuse(bore)

  return onFace(cavity)
}

function buildBadgeRecess() {
  const recess = makeBox(
    [BADGE_PANEL.left, up(BADGE_PANEL.bottom), -PLATE_THICKNESS],
    [BADGE_PANEL.right, up(BADGE_PANEL.top), OVERRUN]
  )

  return onFace(recess)
}

function buildLegendRecess() {
  return makeBox(
    [LEGEND_PANEL.left, PANEL_SET_BACK - OVERRUN, LEGEND_PANEL.bottom],
    [LEGEND_PANEL.right, PANEL_SET_BACK + PLATE_THICKNESS, LEGEND_PANEL.top]
  )
}

function buildControlHoles() {
  const slots = WHEEL_PLACES.map(function (middle) {
      return makeBox(
        [middle - SLOT.width / 2, PANEL_SET_BACK - OVERRUN, CONTROLS_HEIGHT - SLOT.height / 2],
        [middle + SLOT.width / 2, PANEL_SET_BACK + SLOT.depth, CONTROLS_HEIGHT + SLOT.height / 2]
      )
    }),
    button = makeBox(
      [
        POWER_BUTTON.middle - POWER_BUTTON.width / 2,
        PANEL_SET_BACK - OVERRUN,
        CONTROLS_HEIGHT - POWER_BUTTON.height / 2
      ],
      [
        POWER_BUTTON.middle + POWER_BUTTON.width / 2,
        PANEL_SET_BACK + POWER_BUTTON.depth,
        CONTROLS_HEIGHT + POWER_BUTTON.height / 2
      ]
    )

  return makeCompound([...slots, button])
}

function buildFrontCabinet() {
  const shell = buildFrontShell(),
    tunnel = buildTunnel(),
    badgeRecess = buildBadgeRecess(),
    legendRecess = buildLegendRecess(),
    controlHoles = buildControlHoles(),
    cut = shell.cut(tunnel).cut(badgeRecess).cut(legendRecess).cut(controlHoles)

  return { name: "front-cabinet", shape: cut.translate(CENTRING), material: CABINET }
}

// The rear moulding narrows from the joint to the rear face, so it is lofted between the two and cut to the side view. Each section runs past the view so that only its sides are kept, and stands an overrun outside the face it would otherwise lie on.
function buildTaper() {
  const reach = 2 * HEIGHT,
    joint = new Plane(
      [0, JOINT_FOOT - OVERRUN, 0],
      [1, 0, 0],
      [0, -Math.cos(FACE_LEAN * RADIANS), Math.sin(FACE_LEAN * RADIANS)]
    ),
    rearFoot = REAR_TOP[0] - REAR_TOP[1] * Math.tan(REAR_LEAN * RADIANS),
    rear = new Plane(
      [0, rearFoot + OVERRUN, 0],
      [1, 0, 0],
      [0, -Math.cos(REAR_LEAN * RADIANS), Math.sin(REAR_LEAN * RADIANS)]
    ),
    inset = (WIDTH - REAR_WIDTH) / 2,
    front = drawRectangle(WIDTH, 2 * reach)
      .translate(WIDTH / 2, 0)
      .sketchOnPlane(joint),
    back = drawRectangle(REAR_WIDTH, 2 * reach)
      .translate(inset + REAR_WIDTH / 2, 0)
      .sketchOnPlane(rear)

  return front.loftWith(back, { ruled: true })
}

function buildRearShell() {
  const side = draw([JOINT_FOOT, 0])
      .lineTo(JOINT_TOP)
      .lineTo(REAR_TOP)
      .customCorner(REAR_TOP_RADIUS)
      .lineTo(REAR_BOTTOM)
      .customCorner(EDGE_RADIUS)
      .lineTo([REAR_BOTTOM[0] - REAR_CHAMFER, 0])
      .close(),
    body = side.sketchOnPlane("YZ").extrude(WIDTH),
    taper = buildTaper()

  return body.intersect(taper)
}

function grilleSlots() {
  const pitch = GRILLE.width / GRILLE.columns,
    slotWidth = pitch * GRILLE.fill,
    rowLength = (GRILLE.length - (GRILLE.rows - 1) * GRILLE.bar) / GRILLE.rows,
    first = (WIDTH - GRILLE.width) / 2 + (pitch - slotWidth) / 2,
    slots = []

  for (let row = 0; row < GRILLE.rows; row++) {
    const nearer = -GRILLE.setBack - row * (rowLength + GRILLE.bar)

    for (let column = 0; column < GRILLE.columns; column++) {
      const left = first + column * pitch,
        slot = makeBox(
          [left, nearer - rowLength, -GRILLE.depth],
          [left + slotWidth, nearer, OVERRUN]
        )

      slots.push(slot)
    }
  }

  return slots
}

function buildRearCabinet() {
  const shell = buildRearShell(),
    slots = grilleSlots(),
    flat = makeCompound(slots),
    grille = onSlope(flat),
    cut = shell.cut(grille)

  return { name: "rear-cabinet", shape: cut.translate(CENTRING), material: CABINET }
}

// The dark behind the grille is a plate under the slots' floors, which shows through each slot and nowhere else.
function buildGrilleFloor() {
  const left = (WIDTH - GRILLE.width) / 2,
    floor = makeBox(
      [left, -GRILLE.setBack - GRILLE.length, -GRILLE.depth - 0.5],
      [left + GRILLE.width, -GRILLE.setBack, -GRILLE.depth + 0.5]
    )

  return { name: "grille-floor", shape: onSlope(floor).translate(CENTRING), material: INSIDE }
}

function buildWheels() {
  const radius = WHEEL.diameter / 2,
    wheels = WHEEL_PLACES.map(function (middle) {
      const axle = [
        middle,
        PANEL_SET_BACK + radius - WHEEL.standing,
        CONTROLS_HEIGHT - WHEEL.thickness / 2
      ]

      return makeCylinder(radius, WHEEL.thickness, axle, [0, 0, 1])
    })

  return { name: "thumbwheels", shape: makeCompound(wheels).translate(CENTRING), material: FITTING }
}

function buildPowerButton() {
  const button = makeBox(
    [
      POWER_BUTTON.middle - POWER_BUTTON.width / 2,
      PANEL_SET_BACK - POWER_BUTTON.standing,
      CONTROLS_HEIGHT - POWER_BUTTON.height / 2
    ],
    [
      POWER_BUTTON.middle + POWER_BUTTON.width / 2,
      PANEL_SET_BACK + POWER_BUTTON.depth,
      CONTROLS_HEIGHT + POWER_BUTTON.height / 2
    ]
  )

  return { name: "power-button", shape: button.translate(CENTRING), material: FITTING }
}

// The kernel meshes a sphere on its own poles, so a pole left at the apex rings the middle of the picture with slivers. Turned a quarter aside it is the same solid, meshed as a grid.
function buildScreen() {
  const middle = [(OPENING.left + OPENING.right) / 2, up((OPENING.top + OPENING.bottom) / 2)],
    outline = openingOutline(GLASS_MARGIN)
      .translate(-middle[0], -middle[1])
      .sketchOnPlane("XY")
      .extrude(-GLASS_THICKNESS),
    turned = makeSphere(FACE_RADIUS).rotate(90, [0, 0, 0], [1, 0, 0]),
    ball = turned.translate([0, 0, -FACE_RADIUS]),
    cap = ball.intersect(outline),
    face = {
      left: -SHOWN_MIDDLE[0] * SAMPLE,
      right: (RASTER.columns - SHOWN_MIDDLE[0]) * SAMPLE,
      front: (SHOWN_MIDDLE[1] - RASTER.rows) * LINE,
      rear: SHOWN_MIDDLE[1] * LINE
    },
    apex = fromFace([...middle, -GLASS_APEX])

  return {
    name: "screen",
    shape: cap,
    material: PHOSPHOR,
    face,
    tilt: 90 - FACE_LEAN,
    place: placed(apex),
    screen: "LUM"
  }
}

function buildBadgePanel() {
  const width = BADGE_PANEL.right - BADGE_PANEL.left,
    height = BADGE_PANEL.bottom - BADGE_PANEL.top,
    panel = drawRectangle(width, height).sketchOnPlane("XY").extrude(-PLATE_THICKNESS),
    face = { left: -width / 2, right: width / 2, front: -height / 2, rear: height / 2 },
    middle = [
      (BADGE_PANEL.left + BADGE_PANEL.right) / 2,
      up((BADGE_PANEL.top + BADGE_PANEL.bottom) / 2),
      0
    ],
    standing = fromFace(middle)

  return {
    name: BADGE_PRINT,
    shape: panel,
    material: BADGE_FACE,
    face,
    tilt: 90 - FACE_LEAN,
    place: placed(standing),
    print: BADGE_PRINT
  }
}

function buildLegendPanel() {
  const width = LEGEND_PANEL.right - LEGEND_PANEL.left,
    height = LEGEND_PANEL.top - LEGEND_PANEL.bottom,
    panel = drawRectangle(width, height).sketchOnPlane("XY").extrude(-PLATE_THICKNESS),
    face = { left: -width / 2, right: width / 2, front: -height / 2, rear: height / 2 },
    middle = [
      (LEGEND_PANEL.left + LEGEND_PANEL.right) / 2,
      PANEL_SET_BACK,
      (LEGEND_PANEL.top + LEGEND_PANEL.bottom) / 2
    ]

  return {
    name: LEGEND_PRINT,
    shape: panel,
    material: LEGEND_FACE,
    face,
    tilt: 90,
    place: placed(middle),
    print: LEGEND_PRINT
  }
}

function fontSize(height, heightPerEm) {
  return height / heightPerEm
}

function drawFittedWord(fitted, height, baseline) {
  const size = fontSize(height, HEROS_CAP_HEIGHT)

  return `<text x="${fitted.left}" y="${baseline}" font-family="${HEROS}" font-size="${size}" fill="${LEGEND_INK}" textLength="${fitted.width}" lengthAdjust="spacingAndGlyphs">${fitted.word}</text>`
}

function drawOutlinedWord(fitted) {
  const size = fontSize(fitted.capHeight, HEROS_CONDENSED_CAP_HEIGHT)

  return `<text x="${fitted.left}" y="${fitted.baseline}" font-family="${HEROS_CONDENSED}" font-size="${size}" font-weight="700" fill="none" stroke="${LEGEND_INK}" stroke-width="${fitted.stroke}" textLength="${fitted.width}" lengthAdjust="spacingAndGlyphs">${fitted.word}</text>`
}

// Each print is drawn in its moulding's own measurements and shifted into its panel's frame, so that every figure above reads as it was measured.
function drawPanel(outline, backing, drawn) {
  const width = outline.right - outline.left,
    height = Math.abs(outline.bottom - outline.top)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="${backing}"/>`,
    `<g transform="translate(${-outline.left} ${-outline.top})">`,
    drawn,
    "</g>",
    "</svg>"
  ].join("\n")
}

function drawBadge() {
  const amstrad = drawOutlinedWord(AMSTRAD_WORD),
    model = drawFittedWord(MODEL_WORD, MODEL_WORD.capHeight, MODEL_WORD.baseline)

  return drawPanel(BADGE_PANEL, BADGE_FACE.colour, [amstrad, model].join("\n"))
}

// The lower panel's words were measured down from the controls' middle, which stands above the print's top edge.
function drawLegends() {
  const controls = LEGEND_PANEL.top - CONTROLS_HEIGHT,
    size = fontSize(LEGEND_HEIGHT, HEROS_CAP_HEIGHT),
    middle = (HEROS_X_HEIGHT * size) / 2,
    controlBaseline = controls + LEGEND_DROP + middle,
    words = CONTROL_WORDS.map(fitted => drawFittedWord(fitted, LEGEND_HEIGHT, controlBaseline)),
    power = POWER_WORDS.map(fitted =>
      drawFittedWord(fitted, LEGEND_HEIGHT, controls + fitted.drop + middle)
    ),
    markTop = controls + POWER_MARKS.drop - POWER_MARKS.size / 2,
    marks = [
      `<rect x="${POWER_MARKS.on - POWER_MARKS.size}" y="${markTop + POWER_MARKS.size / 3}" width="${2 * POWER_MARKS.size}" height="${POWER_MARKS.size / 3}" fill="${LEGEND_INK}"/>`,
      `<rect x="${POWER_MARKS.off - POWER_MARKS.size / 2}" y="${markTop}" width="${POWER_MARKS.size}" height="${POWER_MARKS.size}" fill="${LEGEND_INK}"/>`
    ],
    frame = {
      left: LEGEND_PANEL.left,
      right: LEGEND_PANEL.right,
      top: 0,
      bottom: LEGEND_PANEL.top - LEGEND_PANEL.bottom
    }

  return drawPanel(frame, LEGEND_FACE.colour, [...words, ...power, ...marks].join("\n"))
}

export function buildGt64() {
  return {
    tessellation: TESSELLATION,
    parts: [
      buildFrontCabinet(),
      buildRearCabinet(),
      buildGrilleFloor(),
      buildWheels(),
      buildPowerButton(),
      buildScreen(),
      buildBadgePanel(),
      buildLegendPanel()
    ],
    prints: [
      { name: BADGE_PRINT, language: LANGUAGE, svg: drawBadge(), pixels: PLATE_PIXELS },
      { name: LEGEND_PRINT, language: LANGUAGE, svg: drawLegends(), pixels: PLATE_PIXELS }
    ]
  }
}
