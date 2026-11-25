import { draw, drawCircle, drawRectangle, makeBox, makeCompound, makeCylinder } from "replicad"

// The drive's parts: x runs across its front from its left end, y back from the front and z up from the base's underside, in millimetres. The interface's: x along the computer's rear from the socket's middle, y back from the socket's face and z up from the interface's foot.

// "AMSTRAD DISC DRIVE & INTERFACE DDI-1": one 3" drive, a plug-on Interface Unit with its ribbon fixed to it, a CP/M 2.2 and Dr LOGO master disc and the manual [A], User Instructions: https://archive.org/download/manualsonline-id-073a0aea-c864-4724-8004-a2dbc04e2798/073a0aea-c864-4724-8004-a2dbc04e2798.pdf
// The drive is 75 high, 105 wide and 280 deep, the interface 75 high, 165 wide and 35 deep [A], DDI-1/FD-1 Service Manual p2: https://cpcrulez.fr/hardware-service_manual-dd1_fd1.htm, and Amstrad France's brochure: https://archive.org/details/depliants_amstrad
// The Erlangen collection's Schneider drive measures 330 × 104 × 76 [B], the length most likely taking in the mains lead's strain relief: https://iser.wisski.data.fau.de/sites/default/files/2024-02/CPC-FD-Ext.pdf
const WIDTH = 105,
  DEPTH = 280,
  HEIGHT = 75,
  INTERFACE = { width: 165, depth: 35, height: 75 }

// "The front" is a near-square photograph of an early drive's front and top, its front scaled to 105 by 75, ±1.5 across and ±2.5 up [E]: https://oldwiki.cpcwiki.eu/imgs/3/31/DDI-1.jpg
// The lid comes down to the black front's lower edge, 26.7 up, and the base stands below it; a photograph of a Schneider drive's rear reads the parting line about 24 up, ±5 [E], from Erlangen's record above. The lid's front is a frame round the black front, 3.2 at the sides and 7.4 over it.
const PARTING = 26.7,
  BLACK_FRONT = { left: 3.2, right: 102.8, bottom: PARTING, top: 67.6 }

// The front reads its top edge and its corners rounded 3 to 4 [E]. Neither is measured, nor is the base's lower edge: 3.5 is taken for the corners and 3 for the top's edges, which the corners' rounding must not be smaller than, and 1 for the lower edge.
const CORNER_RADIUS = 3.5,
  TOP_EDGE_RADIUS = 3,
  FOOT_EDGE_RADIUS = 1

// The mechanism is Matsushita's EME-150A, Amstrad part 190005 [A], service manual p3, the 664's own [A]: https://archive.org/details/amstrad-cpc-664-service-manual. Its drawing, the EME-150's, makes it 152 long from its bezel's face and puts the slot's middle 21 above the bezel's lower edge, read in the drive's own orientation [A]: https://www.cpcwiki.eu/index.php/File:Panasonic-3_inch_Floppy_Drive_EME-150.pdf
// On the front the slot opens 10.8 to 95.2 across and 44.8 to 57.4 up, its upper edge stepping up 1.6 over a silver flap 33.7 to 69.1 across, standing from the slot's lower edge to 50.6 [E]. The drawing's slot is 81 long and its bezel 95 wide, where the front reads 84.4 and 99.6; the disagreement stands until a real unit is measured.
// How far the black front stands behind the lid's frame, how deep the slot reads and how far behind the face the flap stands are not measured: 1.5, 3 and 1.5 are taken.
const SLOT = { left: 10.8, right: 95.2, bottom: 44.8, top: 57.4, depth: 3 },
  FLAP = { left: 33.7, right: 69.1, bottom: SLOT.bottom, top: 50.6, set: 1.5 },
  FLAP_STEP = 1.6,
  SLOT_MIDDLE = BLACK_FRONT.bottom + 21,
  BLACK_FRONT_SET_BACK = 1.5,
  MECHANISM_LENGTH = 152

// On the front [E]: the red lamp centred 16.5 across and 34.3 up, about 5 by 2.5; the eject button 75.8 to 95.2 across and 34.6 to 41.5 up, a gap at its left end showing light to 77.8; the badge plate 9.7 to 38.4 across and 7.9 to 19.4 up; and the green lamp centred 47.6 across and 10.8 up, about 5 by 2.
// The red is the mechanism's own IN USE LED [A], EME-150M specification; the green is the POWER ON indicator, "Both the green and red indicators on the front panel of the FD1 should be illuminated" [A], CPC6128 User Instructions: https://archive.org/details/amstrad-cpc-6128-user-manual
// No depth on the front is measured: the lamps' openings are taken 1.1 deep and their lenses 0.6 thick, as the 6128's are, the eject button's recess 2 deep with the button standing 1 proud of the face, where its upper edge reads lit, and the plate 0.5 thick.
const RED_LAMP = { left: 14, right: 19, bottom: 33.05, top: 35.55 },
  EJECT_RECESS = { left: 75.8, right: 95.2, bottom: 34.6, top: 41.5, depth: 2 },
  EJECT_BUTTON = { left: 77.8, right: 95.2, bottom: 34.6, top: 41.5, standing: 1 },
  BADGE = { left: 9.7, right: 38.4, bottom: 7.9, top: 19.4, thickness: 0.5 },
  GREEN_LAMP = { left: 45.1, right: 50.1, bottom: 9.8, top: 11.8 },
  LAMP_OPENING_DEPTH = 1.1,
  LENS_THICKNESS = 0.6

// The top, rectified on its four corners to 105 by 280, ±2 [E], the front's photograph again: along each long edge a row of slots runs across the edge and over it, 25 to 270 back, at a 5.4 pitch, reaching 15 in on the top; two banks of 19 more cross the top behind its middle, 33.3 to 50.0 and 53.3 to 69.7 across, from 173 back at a 5.37 pitch, each pitch measured over its row.
// How far the edge's slots run down the side, how wide a slot is and how deep it is cut are not read: 15, half the pitch and 3.5 are taken, the case's wall 2.5, and through the slots the inside shows dark, drawn from 10 behind the front, clear of what the front's openings show. The base's own side slots, the lid's tongues and screws over them and the feet are not drawn.
const EDGE_VENTS = { first: 25, last: 270, pitch: 5.4, onTop: 15, downSide: 15 },
  TOP_VENTS = [
    { left: 33.3, right: 50 },
    { left: 53.3, right: 69.7 }
  ],
  TOP_VENT_ROWS = { first: 173, count: 19, pitch: 5.37 },
  VENT_DEPTH = 3.5,
  WALL = 2.5,
  INSIDE_FROM = 10

// The rear, on Erlangen's one oblique photograph of a Schneider drive, read seen from behind and given here from the front, ±5 [E]: the mains lead leaves low near the right end through a square grommet 78 to 99 across and 7 to 33 up, the strain relief standing 40 to 50 proud; the ribbon's 2×17 header, CP501 [A], service manual p14, opens 23 to 72 across and 14 to 30 up; and the POWER slide, OFF and ON, stands 25 to 37 across and 36 to 45 up in a raised panel lettered over it, its knob at ON, toward the drive's left end. The panel is not read: it is taken 3 past the slot at either end and below, and 5 above it for its lettering, which is not drawn.
// "Always switch the disc drives' POWER switch ON before switching the computer's POWER switch ON" [A], User Instructions, so the drive here is on from the start.
// None of these is measured in depth: the grommet stands 2, the panel 0.5 and the knob 3, a third of its slot long; the strain relief is taken 12 across and 40 long, its middle 17 up, where the lead leaves the grommet on the photograph, and the lead 7 across, laid to the desk and on behind the drive for 250, to a socket the desk does not show.
const GROMMET = { left: 78, right: 99, bottom: 7, top: 33, standing: 2 },
  HEADER = { left: 23, right: 72, bottom: 14, top: 30 },
  SWITCH_SLOT = { left: 25, right: 37, bottom: 36, top: 45 },
  SWITCH_PANEL = {
    left: SWITCH_SLOT.left - 3,
    right: SWITCH_SLOT.right + 3,
    bottom: SWITCH_SLOT.bottom - 3,
    top: SWITCH_SLOT.top + 5,
    standing: 0.5
  },
  SWITCH_KNOB = { standing: 3 },
  STRAIN_RELIEF = { diameter: 12, length: 40, height: 17 },
  LEAD = { diameter: 7, run: 250 }

// The interface, on a photograph of its socket face square-on, scaled to its 165 by 75 [E]: https://oldwiki.cpcwiki.eu/imgs/9/91/DDI-1_Tomdalby.jpg. The socket's housing stands 12.6 to 110.8 from the face's left end, seen from the computer's front, and 19.8 to 36.1 above its lower edge, its contacts' slot 22.9 to 97.1 and 22.3 to 32.9; a rib 2.5 wide runs up near each end, 8.7 and 156.5 from the left end, 10.6 to 63.9 up; and the ribbon leaves the right-hand end, 19.3 to 66.3 up.
// Scaled by the contacts' pitch instead, the same photograph puts the socket's middle 21 to 24 up, ±4, and the French brochure's cover about 21 [E]; the computer's edge connector stands 25.6 up on the desk here, and the interface stands on the desk either way, as the German manual's Bild 3 shows it: "Plug the Interface Unit firmly into the edge-connector marked FLOPPY DISC at the rear of the computer" [A], User Instructions.
// How far the housing and the ribs stand proud, how deep the slot is, and the box's own rounding, are not measured: 9, 2, 3 and 2 are taken. Whether Amstrad's 35 takes in the housing is not said: the box is taken 35 deep behind it. The housing's face rests on the computer's rear at its parting lip.
const HOUSING = { left: 12.6, right: 110.8, bottom: 19.8, top: 36.1, standing: 9 },
  CONTACT_SLOT = { left: 22.9, right: 97.1, bottom: 22.3, top: 32.9, depth: 3 },
  RIBS = { places: [8.7, 156.5], width: 2.5, bottom: 10.6, top: 63.9, standing: 2 },
  RIBBON_EXIT = { bottom: 19.3, top: 66.3 },
  INTERFACE_RADIUS = 2

// The ribbon is 34-way flat cable, two female sockets on it, the end one for drive A and one "slightly further back in the cable" for an FD-1 [A], User Instructions F1.2; "The maximum permissible cable length is 0.75 metre" [A], SOFT 158A: https://web.archive.org/web/20260121184155/https://cpcrulez.fr/codingBOOK_soft158a-ddi-1_firmware_0500.htm. Its conductors are taken 1.27 apart, flat cable's usual pitch for a header of two rows, 43.18 across 34; it is not measured.
// It reads light grey on the front's photograph [E]. Its thickness, the socket's size and how the ribbon lies are not measured: 1.2 thick; the socket 48 across, inside the header's opening, 9 high and 14 deep, 6 of it inside; from the interface it twists down to the desk over 60, falling through heights chosen so its lower edge clears the desk at each of five sections; from the socket it runs back 5 and falls to the desk; each end then lies a ribbon's width along the desk, and the page lays the ribbon across between the two. The second drive's socket is not drawn.
const RIBBON = { width: 43.18, thickness: 1.2 },
  RIBBON_SOCKET = { width: 48, height: 9, depth: 14, inside: 6 },
  INTERFACE_TAIL = { run: 60, heights: [31, 20, 10], flat: 45 },
  DRIVE_TAIL = { back: 5, flat: 45 }

// Sampled on a studio photograph of a drive on a near-neutral ground, uncalibrated, good for the hue and no more [E]: https://coimages.sciencemuseumgroup.org.uk/461/243/large_smg00279271.jpg. The lid reads #4c4c4e and the base #4b4a4b there, and the badge's ground #3e3e40 and its letters and border #cacacc: white on dark, as Amstrad's photographs show it [A], French brochure p1.
// On the front's photograph the lid reads #363938, 1.41 times darker in each channel, and what was sampled there only is carried by that ratio: the black front #141516, the interface #272725 and the ribbon #8a8a86; the flap reads #bdbcbd there and is kept as it reads [E].
// The rest are guesses: the lamps' lenses, which read #876171 and #496262 under the flash, are taken darker, as unlit lenses; the inside, the sockets, the knob, the lead and the strain relief are taken black; the flap's sheen is taken at 0.35.
const CABINET_TOP = { name: "cabinet-top", colour: "#4c4c4e" },
  CABINET_BOTTOM = { name: "cabinet-bottom", colour: "#4b4a4b" },
  INTERIOR = { name: "interior", colour: "#141414" },
  BEZEL = { name: "bezel", colour: "#1c1d1f" },
  FLAP_METAL = { name: "flap", colour: "#bdbcbd", roughness: 0.35 },
  RED_LENS = { name: "red-lamp", colour: "#6e2a33" },
  GREEN_LENS = { name: "green-lamp", colour: "#3d5e57" },
  BADGE_PLATE = { name: "badge", colour: "#3e3e40" },
  INTERFACE_CASE = { name: "interface", colour: "#373734" },
  SOCKET_PLASTIC = { name: "socket", colour: "#1b1b1c" },
  RIBBON_CABLE = { name: "ribbon", colour: "#c3c3be" },
  LEAD_RUBBER = { name: "lead", colour: "#1d1d1e" }

// On the studio photograph the badge's letters stand 6.4 of its 11.5, centred, across 23.4 of its 28.7, in a bold condensed grotesque, inside a border 0.5 wide inset 0.6 [E].
const BADGE_INK = "#cacacc",
  BADGE_ART = { inset: 0.6, rule: 0.5, capHeight: 6.4, width: 23.4 }

// TeX Gyre Heros stands in for the badge's face, as on the 6128's plates, its condensed cut's capitals 0.718 of its size: https://www.gust.org.pl/projects/e-foundry/tex-gyre/heros
const HEROS_CONDENSED = "TeX Gyre Heros Cn",
  HEROS_CONDENSED_CAP_HEIGHT = 0.718

const BADGE_PIXELS = 40

const TESSELLATION = { tolerance: 0.1, angularTolerance: 0.5 }

// How far a cut reaches past the face it opens, so no face of it lies in the face it opens.
const OVERRUN = 1

const HAIRLINE = 0.1

const LANGUAGE = "es",
  BADGE_PRINT = "badge"

const RADIANS = Math.PI / 180,
  HOUSING_MIDDLE = (HOUSING.left + HOUSING.right) / 2,
  INTERFACE_LEFT = -HOUSING_MIDDLE,
  INTERFACE_RIGHT = INTERFACE.width - HOUSING_MIDDLE,
  INTERFACE_BACK = HOUSING.standing + INTERFACE.depth,
  RIBBON_LINE = HOUSING.standing + INTERFACE.depth / 2,
  RIBBON_HEIGHT = (RIBBON_EXIT.bottom + RIBBON_EXIT.top) / 2,
  INTERFACE_TAIL_FLAT = INTERFACE_RIGHT + INTERFACE_TAIL.run - HAIRLINE,
  INTERFACE_TAIL_END = INTERFACE_TAIL_FLAT + INTERFACE_TAIL.flat,
  HEADER_MIDDLE = (HEADER.left + HEADER.right) / 2,
  SOCKET_HEIGHT = (HEADER.bottom + HEADER.top) / 2,
  SOCKET_BACK = DEPTH + RIBBON_SOCKET.depth - RIBBON_SOCKET.inside,
  DRIVE_TAIL_BEND = SOCKET_BACK + DRIVE_TAIL.back,
  DRIVE_TAIL_RADIUS = (SOCKET_HEIGHT - RIBBON.thickness / 2) / 2,
  DRIVE_TAIL_END = DRIVE_TAIL_BEND + 2 * DRIVE_TAIL_RADIUS + DRIVE_TAIL.flat

function onFront({ left, right, bottom, top }, [front, back]) {
  return makeBox([left, front, bottom], [right, back, top])
}

function onRear({ left, right, bottom, top }, [front, back]) {
  return makeBox([left, DEPTH - front, bottom], [right, DEPTH + back, top])
}

function buildBlock() {
  const block = makeBox([0, 0, 0], [WIDTH, DEPTH, HEIGHT])

  return block
    .fillet(CORNER_RADIUS, edge => edge.inDirection("Z"))
    .fillet(TOP_EDGE_RADIUS, edge => edge.inPlane("XY", HEIGHT))
    .fillet(FOOT_EDGE_RADIUS, edge => edge.inPlane("XY", 0))
}

// What lies further than the slots reach in, which a slot's box is cut against so it follows the case's skin.
function buildCore() {
  return makeBox(
    [VENT_DEPTH, VENT_DEPTH, VENT_DEPTH],
    [WIDTH - VENT_DEPTH, DEPTH - VENT_DEPTH, HEIGHT - VENT_DEPTH]
  )
}

function buildVents() {
  const core = buildCore(),
    slotWidth = EDGE_VENTS.pitch / 2,
    count = Math.round((EDGE_VENTS.last - EDGE_VENTS.first) / EDGE_VENTS.pitch) + 1,
    slots = []

  for (let index = 0; index < count; index++) {
    const front = EDGE_VENTS.first + index * EDGE_VENTS.pitch,
      back = front + slotWidth,
      bottom = HEIGHT - EDGE_VENTS.downSide

    for (const [left, right] of [
      [-OVERRUN, EDGE_VENTS.onTop],
      [WIDTH - EDGE_VENTS.onTop, WIDTH + OVERRUN]
    ]) {
      const box = makeBox([left, front, bottom], [right, back, HEIGHT + OVERRUN]),
        skin = box.cut(core)

      slots.push(skin)
    }
  }

  for (let row = 0; row < TOP_VENT_ROWS.count; row++) {
    const front = TOP_VENT_ROWS.first + row * TOP_VENT_ROWS.pitch,
      back = front + slotWidth

    for (const { left, right } of TOP_VENTS) {
      const box = makeBox([left, front, HEIGHT - VENT_DEPTH], [right, back, HEIGHT + OVERRUN])

      slots.push(box)
    }
  }

  return makeCompound(slots)
}

function buildLampOpening(lamp, setBack) {
  return onFront(lamp, [setBack - OVERRUN, setBack + LAMP_OPENING_DEPTH])
}

function buildCabinetTop() {
  const block = buildBlock(),
    below = makeBox([-OVERRUN, -OVERRUN, -OVERRUN], [WIDTH + OVERRUN, DEPTH + OVERRUN, PARTING]),
    frontOpening = onFront({ ...BLACK_FRONT, bottom: PARTING - OVERRUN }, [
      -OVERRUN,
      BLACK_FRONT_SET_BACK + MECHANISM_LENGTH
    ]),
    panel = onRear(SWITCH_PANEL, [HAIRLINE, SWITCH_PANEL.standing]),
    slot = onRear(SWITCH_SLOT, [WALL + OVERRUN, OVERRUN]),
    vents = buildVents()

  return block.cut(below).cut(frontOpening).fuse(panel).cut(slot).cut(vents)
}

function buildCabinetBottom() {
  const block = buildBlock(),
    above = makeBox(
      [-OVERRUN, -OVERRUN, PARTING],
      [WIDTH + OVERRUN, DEPTH + OVERRUN, HEIGHT + OVERRUN]
    ),
    lamp = buildLampOpening(GREEN_LAMP, 0),
    header = onRear(HEADER, [RIBBON_SOCKET.inside, OVERRUN]),
    grommet = onRear(GROMMET, [HAIRLINE, GROMMET.standing])

  return block.cut(above).cut(lamp).cut(header).fuse(grommet)
}

// The inside, dark, standing where the wall ends, so a slot opens onto it.
function buildInterior() {
  const inside = makeBox([WALL, INSIDE_FROM, WALL], [WIDTH - WALL, DEPTH - WALL, HEIGHT - WALL])

  return { name: "interior", shape: inside, material: INTERIOR }
}

// The black front and the mechanism behind it, the part the disc goes into.
function buildBlackFront() {
  const block = onFront(BLACK_FRONT, [
      BLACK_FRONT_SET_BACK,
      BLACK_FRONT_SET_BACK + MECHANISM_LENGTH
    ]),
    slot = onFront(SLOT, [-OVERRUN, BLACK_FRONT_SET_BACK + SLOT.depth]),
    step = onFront(
      {
        left: FLAP.left,
        right: FLAP.right,
        bottom: SLOT.top - HAIRLINE,
        top: SLOT.top + FLAP_STEP
      },
      [-OVERRUN, BLACK_FRONT_SET_BACK + SLOT.depth]
    ),
    lamp = buildLampOpening(RED_LAMP, BLACK_FRONT_SET_BACK),
    eject = onFront(EJECT_RECESS, [-OVERRUN, BLACK_FRONT_SET_BACK + EJECT_RECESS.depth])

  return block.cut(slot).cut(step).cut(lamp).cut(eject)
}

function buildFlap() {
  const face = BLACK_FRONT_SET_BACK + FLAP.set,
    flap = onFront(FLAP, [face, BLACK_FRONT_SET_BACK + SLOT.depth])

  return { name: "slot-flap", shape: flap, material: FLAP_METAL }
}

function buildLens(name, lamp, setBack, material) {
  const face = setBack + LAMP_OPENING_DEPTH - HAIRLINE,
    lens = onFront(lamp, [face, face + LENS_THICKNESS])

  return { name, shape: lens, material }
}

function buildEjectButton() {
  const button = onFront(EJECT_BUTTON, [
    BLACK_FRONT_SET_BACK - EJECT_BUTTON.standing,
    BLACK_FRONT_SET_BACK + EJECT_RECESS.depth
  ])

  return { name: "eject-button", shape: button, material: BEZEL }
}

// The plate is built flat and stood up on the front, so its print lies across it as drawn.
function buildBadge() {
  const width = BADGE.right - BADGE.left,
    height = BADGE.top - BADGE.bottom,
    plate = drawRectangle(width, height).sketchOnPlane("XY").extrude(BADGE.thickness),
    middle = [(BADGE.left + BADGE.right) / 2, 0, (BADGE.bottom + BADGE.top) / 2]

  return {
    name: "badge",
    shape: plate,
    material: BADGE_PLATE,
    face: { left: -width / 2, right: width / 2, front: -height / 2, rear: height / 2 },
    print: BADGE_PRINT,
    place: middle,
    tilt: 90
  }
}

function buildPowerSwitch() {
  const length = (SWITCH_SLOT.right - SWITCH_SLOT.left) / 3,
    knob = onRear({ ...SWITCH_SLOT, right: SWITCH_SLOT.left + length }, [
      WALL,
      SWITCH_PANEL.standing + SWITCH_KNOB.standing
    ])

  return { name: "power-switch", shape: knob, material: SOCKET_PLASTIC }
}

// A point on a bend of the ribbon, drawn in the plane across its run, about the bend's centre.
function arcPoint([across, up], radius, degrees) {
  return [across + radius * Math.cos(degrees * RADIANS), up + radius * Math.sin(degrees * RADIANS)]
}

// From the socket the ribbon runs back, bends down round one centre and back again round another onto the desk, and runs on along it: drawn in the YZ plane and laid across the socket's width.
function driveTailProfile() {
  const half = RIBBON.thickness / 2,
    radius = DRIVE_TAIL_RADIUS,
    start = SOCKET_BACK - HAIRLINE,
    upper = [DRIVE_TAIL_BEND, SOCKET_HEIGHT - radius],
    lower = [DRIVE_TAIL_BEND + 2 * radius, SOCKET_HEIGHT - radius],
    topFirst = arcPoint(upper, radius + half, 0),
    topFirstMiddle = arcPoint(upper, radius + half, 45),
    topSecond = arcPoint(lower, radius - half, 270),
    topSecondMiddle = arcPoint(lower, radius - half, 225),
    bottomSecondStart = arcPoint(lower, radius + half, 270),
    bottomSecond = arcPoint(lower, radius + half, 180),
    bottomSecondMiddle = arcPoint(lower, radius + half, 225),
    bottomFirst = arcPoint(upper, radius - half, 90),
    bottomFirstMiddle = arcPoint(upper, radius - half, 45)

  return draw([start, SOCKET_HEIGHT + half])
    .lineTo([DRIVE_TAIL_BEND, SOCKET_HEIGHT + half])
    .threePointsArcTo(topFirst, topFirstMiddle)
    .threePointsArcTo(topSecond, topSecondMiddle)
    .lineTo([DRIVE_TAIL_END, 2 * half])
    .lineTo([DRIVE_TAIL_END, 0])
    .lineTo(bottomSecondStart)
    .threePointsArcTo(bottomSecond, bottomSecondMiddle)
    .threePointsArcTo(bottomFirst, bottomFirstMiddle)
    .lineTo([start, SOCKET_HEIGHT - half])
    .close()
}

function buildRibbonSocket() {
  const socket = makeBox(
    [
      HEADER_MIDDLE - RIBBON_SOCKET.width / 2,
      DEPTH - RIBBON_SOCKET.inside,
      SOCKET_HEIGHT - RIBBON_SOCKET.height / 2
    ],
    [HEADER_MIDDLE + RIBBON_SOCKET.width / 2, SOCKET_BACK, SOCKET_HEIGHT + RIBBON_SOCKET.height / 2]
  )

  return { name: "ribbon-socket", shape: socket, material: SOCKET_PLASTIC }
}

function buildDriveTail() {
  const profile = driveTailProfile(),
    left = HEADER_MIDDLE - RIBBON.width / 2,
    tail = profile.sketchOnPlane("YZ", left).extrude(RIBBON.width)

  return { name: "ribbon-drive-end", shape: tail, material: RIBBON_CABLE }
}

// Where the page folds the ribbon's run over this end: the middle of its last ribbon's width on the desk.
function ribbonTo() {
  const place = [HEADER_MIDDLE, DRIVE_TAIL_END - RIBBON.width / 2, 0]

  return { name: "ribbon-to", place, parts: [] }
}

// A ring of the lead's section swept round an axis along x through a centre, kept in the quarter toward the given signs of y and z.
function quarterTorus([x, y, z], sweep, radius, [towardY, towardZ]) {
  const section = drawCircle(radius)
      .translate([x, z + sweep])
      .sketchOnPlane("XZ", [0, y, 0]),
    torus = section.revolve([1, 0, 0], { origin: [x, y, z] }),
    reach = sweep + radius + OVERRUN,
    alongY = towardY > 0 ? [y, y + reach] : [y - reach, y],
    alongZ = towardZ > 0 ? [z, z + reach] : [z - reach, z],
    quarter = makeBox([x - reach, alongY[0], alongZ[0]], [x + reach, alongY[1], alongZ[1]])

  return torus.intersect(quarter)
}

// The lead runs back out of the strain relief, bends down round one centre and back again round another onto the desk, and runs on along it.
function buildMainsLead() {
  const middle = (GROMMET.left + GROMMET.right) / 2,
    from = DEPTH + GROMMET.standing,
    reliefEnd = from + STRAIN_RELIEF.length,
    radius = LEAD.diameter / 2,
    sweep = (STRAIN_RELIEF.height - radius) / 2,
    bendHeight = STRAIN_RELIEF.height - sweep,
    relief = makeCylinder(
      STRAIN_RELIEF.diameter / 2,
      STRAIN_RELIEF.length,
      [middle, from, STRAIN_RELIEF.height],
      [0, 1, 0]
    ),
    upper = quarterTorus([middle, reliefEnd, bendHeight], sweep, radius, [1, 1]),
    lower = quarterTorus([middle, reliefEnd + 2 * sweep, bendHeight], sweep, radius, [-1, -1]),
    run = makeCylinder(radius, LEAD.run, [middle, reliefEnd + 2 * sweep, radius], [0, 1, 0]),
    lead = relief.fuse(upper).fuse(lower).fuse(run)

  return { name: "mains-lead", shape: lead, material: LEAD_RUBBER }
}

function buildInterfaceCase() {
  const body = makeBox(
      [INTERFACE_LEFT, HOUSING.standing, 0],
      [INTERFACE_RIGHT, INTERFACE_BACK, INTERFACE.height]
    ).fillet(INTERFACE_RADIUS),
    ribs = RIBS.places.map(function (place) {
      const middle = place - HOUSING_MIDDLE

      return makeBox(
        [middle - RIBS.width / 2, HOUSING.standing - RIBS.standing, RIBS.bottom],
        [middle + RIBS.width / 2, HOUSING.standing + HAIRLINE, RIBS.top]
      )
    }),
    both = makeCompound(ribs)

  return { name: "interface", shape: body.fuse(both), material: INTERFACE_CASE }
}

function buildHousing() {
  const housing = makeBox(
      [HOUSING.left - HOUSING_MIDDLE, 0, HOUSING.bottom],
      [HOUSING.right - HOUSING_MIDDLE, HOUSING.standing + HAIRLINE, HOUSING.top]
    ),
    slot = makeBox(
      [CONTACT_SLOT.left - HOUSING_MIDDLE, -OVERRUN, CONTACT_SLOT.bottom],
      [CONTACT_SLOT.right - HOUSING_MIDDLE, CONTACT_SLOT.depth, CONTACT_SLOT.top]
    )

  return { name: "interface-socket", shape: housing.cut(slot), material: SOCKET_PLASTIC }
}

// The ribbon leaves the interface's end on edge and twists flat as it falls to the desk, drawn through five sections across its run.
function buildInterfaceTail() {
  const steps = [0, 0.25, 0.5, 0.75, 1],
    heights = [RIBBON_HEIGHT, ...INTERFACE_TAIL.heights, RIBBON.thickness / 2],
    sections = steps.map(function (step, index) {
      const across = INTERFACE_RIGHT - HAIRLINE + step * INTERFACE_TAIL.run,
        section = drawRectangle(RIBBON.thickness, RIBBON.width)
          .rotate(step * 90, [0, 0])
          .translate([RIBBON_LINE, heights[index]])

      return section.sketchOnPlane("YZ", across)
    }),
    [first, ...rest] = sections,
    twisted = first.loftWith(rest, { ruled: false }),
    flat = makeBox(
      [INTERFACE_TAIL_FLAT, RIBBON_LINE - RIBBON.width / 2, 0],
      [INTERFACE_TAIL_END, RIBBON_LINE + RIBBON.width / 2, RIBBON.thickness]
    )

  return { name: "ribbon-interface-end", shape: twisted.fuse(flat), material: RIBBON_CABLE }
}

// Where the page folds the ribbon's run over this end: the middle of its last ribbon's width on the desk.
function ribbonFrom() {
  const place = [INTERFACE_TAIL_END - RIBBON.width / 2, RIBBON_LINE, 0]

  return { name: "ribbon-from", place, parts: [] }
}

// The ribbon across the desk, a millimetre long, which the page stretches from one fold to the other and on past each by half its width: it lies on the two ends where it crosses them, as a fold does.
function buildRibbonRun() {
  const run = makeBox(
    [0, -RIBBON.width / 2, RIBBON.thickness],
    [1, RIBBON.width / 2, 2 * RIBBON.thickness]
  )

  return { name: "ribbon", shape: run, material: RIBBON_CABLE }
}

function drawBadge() {
  const width = BADGE.right - BADGE.left,
    height = BADGE.top - BADGE.bottom,
    { inset, rule, capHeight } = BADGE_ART,
    baseline = (height + capHeight) / 2,
    edge = inset + rule / 2,
    size = capHeight / HEROS_CONDENSED_CAP_HEIGHT,
    left = (width - BADGE_ART.width) / 2

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="${BADGE_PLATE.colour}"/>`,
    `<rect x="${edge}" y="${edge}" width="${width - 2 * edge}" height="${height - 2 * edge}" fill="none" stroke="${BADGE_INK}" stroke-width="${rule}"/>`,
    `<text x="${left}" y="${baseline}" font-family="${HEROS_CONDENSED}" font-size="${size}" font-weight="700" fill="${BADGE_INK}" textLength="${BADGE_ART.width}" lengthAdjust="spacingAndGlyphs">AMSTRAD</text>`,
    "</svg>"
  ].join("\n")
}

export function buildDdi1() {
  const blackFront = buildBlackFront(),
    slot = [(SLOT.left + SLOT.right) / 2, BLACK_FRONT_SET_BACK, SLOT_MIDDLE]

  return {
    tessellation: TESSELLATION,
    parts: [
      {
        name: "disc-interface",
        parts: [buildInterfaceCase(), buildHousing(), buildInterfaceTail(), ribbonFrom()]
      },
      {
        name: "disc-drive",
        parts: [
          { name: "cabinet-top", shape: buildCabinetTop(), material: CABINET_TOP },
          { name: "cabinet-bottom", shape: buildCabinetBottom(), material: CABINET_BOTTOM },
          buildInterior(),
          { name: "drive", shape: blackFront, material: BEZEL },
          { name: "drive-slot", place: slot, parts: [] },
          buildFlap(),
          buildLens("drive-lamp", RED_LAMP, BLACK_FRONT_SET_BACK, RED_LENS),
          buildEjectButton(),
          buildLens("power-lamp", GREEN_LAMP, 0, GREEN_LENS),
          buildBadge(),
          buildPowerSwitch(),
          buildMainsLead(),
          buildRibbonSocket(),
          buildDriveTail(),
          ribbonTo()
        ]
      },
      buildRibbonRun()
    ],
    prints: [{ name: BADGE_PRINT, language: LANGUAGE, svg: drawBadge(), pixels: BADGE_PIXELS }]
  }
}
