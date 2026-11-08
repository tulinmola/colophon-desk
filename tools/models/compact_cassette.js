import { draw, drawCircle, drawRectangle, makeBox, makeCompound, makeCylinder } from "replicad"

// x runs across side A from its left end, seen with the tape's openings toward the reader, y back from that front edge, and z up from the shell's middle plane, in millimetres.

// The compact cassette as the Amsoft CT-15 and the Sound-on-Sound C-15 share it. Where the standards set its shell, it is theirs: ECMA-34 dimensions it [A], Fig. 1 to 4: https://ecma-international.org/wp-content/uploads/ECMA-34_3rd_edition_september_1976.pdf, and IEC 94-7 again, read in its faithful Japanese copy [A], JIS C 5568:1997: https://kikakurui.com/c5/C5568-1997-01.html. Where they leave it free, the window and the screws' places are not the standard's but the Amsoft's, which the Sound-on-Sound's advert shows again within its ±1.5, and the pack is a C15's.
// 100.4 by 63.8, its four corners rounded 3; a body 8.7 thick, where ECMA-34 has 8.6; and the front region 12.1 thick, where ECMA-34 has 12, 68 across at the front edge, 15 deep and its sides turned in 12°. Its flanks fall to the body over about 1.2, read off ECMA-34's 30° flanks [E].
const WIDTH = 100.4,
  DEPTH = 63.8,
  CORNER_RADIUS = 3,
  BODY = 8.7,
  FRONT_REGION = { thickness: 12.1, width: 68, depth: 15, sides: 12, flankRun: 1.2 }

// The hubs' holes are 11.1 across and 42.5 apart, their middles 34.8 behind the front edge; the capstan holes 4.6 across, where ECMA-34 has 4.5, and 48 apart, 3.5 behind it; and the reference holes 4 by 3.6 and 28 apart, from 3.3 to 6.9 behind it [A], ECMA-34 and IEC 94-7, read from the reference plane 6.9 behind the front edge.
const HUB_HOLES = { diameter: 11.1, pitch: 42.5, fromFront: 34.8 },
  CAPSTAN_HOLES = { diameter: 4.6, pitch: 48, fromFront: 3.5 },
  REFERENCE_HOLES = { width: 4, pitch: 28, front: 3.3, back: 6.9 }

// The front edge is open where the deck's heads, capstan and pinch roller reach the tape: three openings 9.9 high, 16.7 to 29.95, 43.1 to 57.3 and 70.45 to 83.7 across, and two 6.4 high, 34.2 to 38.2 and 62.2 to 66.2 [A], IEC 94-7, ECMA-34 giving 9.8. The tape runs 4.9 to 5.2 in front of the reference plane, about 1.85 behind the front face [A], and is 3.81 wide [A], ECMA-34.
// Each end carries a rib 1 proud and 18 long, from 4.8 to 22.8 behind the front edge, its tip 3.2 wide [A], ECMA-34.
const FRONT_OPENINGS = [
    { left: 16.7, right: 29.95, height: 9.9 },
    { left: 34.2, right: 38.2, height: 6.4 },
    { left: 43.1, right: 57.3, height: 9.9 },
    { left: 62.2, right: 66.2, height: 6.4 },
    { left: 70.45, right: 83.7, height: 9.9 }
  ],
  TAPE = { width: 3.81, fromFront: 1.85 },
  END_RIB = { proud: 1, front: 4.8, back: 22.8, height: 3.2 }

// The window and the screws are read on a flatbed scan of an Amsoft C15 [C], rectified here to its outline, ±0.5 [E]: https://oldwiki.cpcwiki.eu/imgs/f/f1/Amsoft_C15.jpg. Each half of the shell is open for a window in a stadium 20.5 to 80.3 across by 27.9 to 41.7 back, where its label is cut away [E].
// Five silver screws hold side A, their heads 4.2 across: four at the corners, about 2.85 in from the ends and 3.8 from the front and back edges, and one at 50.2 across, 12.4 back [E].
const WINDOW = { left: 20.5, right: 80.3, front: 27.9, back: 41.7 },
  SCREWS = [
    [2.85, 3.8],
    [97.55, 3.8],
    [2.85, 60],
    [97.55, 60],
    [50.2, 12.4]
  ]

// The hubs are wound from 21.7 across, a ring with six teeth 1.5 wide inside it, at 60°, their tips 7.9 across, and a bore of 10.2 [A], ECMA-34's recommended winding diameter and IEC 94-7's teeth.
const HUB = { winding: 21.7, bore: 10.2, tips: 7.9, tooth: 1.5, teeth: 6 }

// The tape on a C15 runs 7½ minutes a side at 4.76 cm/s, 21.4 m [E]; at the 18 µm Philips gives the C60's tape [A], Table I, a full side wound on 21.7 stands 31.0 across [E]: https://www.musicaememoria.com/docs/PTechReview-31-1970-077.pdf. Each pack is drawn full, and the page draws it as far wound as the tape is.
const FULL_PACK = 31

// None of these is measured. The walls are taken 1.2 thick, the hubs 6.1 tall inside a hollow 6.3 deep that begins 8 behind the front edge, and the screws' heads sunk 0.3; the label's recess is taken 0.3 deep and the label 0.1 thick, as the disc's are. Behind the openings the front stands solid but for pockets 5 deep, where the tape crosses them.
const WALL = 1.2,
  HUB_HEIGHT = 6.1,
  SCREW = { diameter: 4.2, sunk: 0.3 },
  LABEL_RECESS_DEPTH = 0.3,
  LABEL_THICKNESS = 0.1,
  OPENING_DEPTH = 5,
  HOLLOW = { left: WALL, right: WIDTH - WALL, front: 8, back: DEPTH - WALL }

// How far the triangles may stray from a curved face, in millimetres, and turn from one another along it, in radians: a choice of how finely to draw, not a figure of the cassette.
const TESSELLATION = { tolerance: 0.1, angularTolerance: 0.5 }

// A cut runs this far past the faces it opens, so the kernel is never left two coplanar faces to join.
const OVERRUN = 1

// Where one part lies in another's opening, a hairline holds the two apart, so that no face of either stands in the plane of a face of the other.
const HAIRLINE = 0.1

// The page finds the label by this name, and lays on it the print of the same name.
const LABEL_PRINT = "label"

const MIDDLE = WIDTH / 2,
  HALF_BODY = BODY / 2,
  HALF_FRONT = FRONT_REGION.thickness / 2,
  RADIANS = Math.PI / 180,
  CENTRING = [-MIDDLE, -DEPTH / 2, 0],
  RECESS_FLOOR = HALF_BODY - LABEL_RECESS_DEPTH,
  HOLLOW_TOP = HALF_BODY - WALL

function hubPlaces() {
  return [MIDDLE - HUB_HOLES.pitch / 2, MIDDLE + HUB_HOLES.pitch / 2]
}

function roundedOutline() {
  return drawRectangle(WIDTH, DEPTH, CORNER_RADIUS).translate(MIDDLE, DEPTH / 2)
}

// The front region's raised face, and the larger outline its flanks would reach at a depth below it, so that a loft between the two stands its foot inside the body.
function frontRegionOutline(below) {
  const { width, depth, sides, flankRun } = FRONT_REGION,
    rise = HALF_FRONT - HALF_BODY,
    spread = (below / rise) * flankRun,
    narrowing = depth * Math.tan(sides * RADIANS),
    front = width / 2 + spread,
    back = width / 2 - narrowing + spread,
    rear = depth + spread

  return draw([MIDDLE - front, 0])
    .lineTo([MIDDLE + front, 0])
    .lineTo([MIDDLE + back, rear])
    .lineTo([MIDDLE - back, rear])
    .close()
}

function buildFrontRegion() {
  const rise = HALF_FRONT - HALF_BODY,
    foot = frontRegionOutline(rise + OVERRUN).sketchOnPlane("XY", HALF_BODY - OVERRUN),
    face = frontRegionOutline(0).sketchOnPlane("XY", HALF_FRONT),
    upper = foot.loftWith(face),
    lower = upper.clone().mirror("XY", [0, 0, 0])

  return upper.fuse(lower)
}

function buildEndRibs() {
  const { proud, front, back, height } = END_RIB,
    left = makeBox([-proud, front, -height / 2], [OVERRUN, back, height / 2]),
    right = makeBox([WIDTH - OVERRUN, front, -height / 2], [WIDTH + proud, back, height / 2])

  return left.fuse(right)
}

function throughHole(diameter, [x, y]) {
  return makeCylinder(diameter / 2, FRONT_REGION.thickness + 2 * OVERRUN, [
    x,
    y,
    -HALF_FRONT - OVERRUN
  ])
}

function buildHoles() {
  const hubs = hubPlaces().map(x => throughHole(HUB_HOLES.diameter, [x, HUB_HOLES.fromFront])),
    capstans = [-1, 1].map(function (side) {
      const x = MIDDLE + (side * CAPSTAN_HOLES.pitch) / 2

      return throughHole(CAPSTAN_HOLES.diameter, [x, CAPSTAN_HOLES.fromFront])
    }),
    references = [-1, 1].map(function (side) {
      const middle = MIDDLE + (side * REFERENCE_HOLES.pitch) / 2,
        half = REFERENCE_HOLES.width / 2

      return makeBox(
        [middle - half, REFERENCE_HOLES.front, -HALF_FRONT - OVERRUN],
        [middle + half, REFERENCE_HOLES.back, HALF_FRONT + OVERRUN]
      )
    })

  return [...hubs, ...capstans, ...references]
}

function buildFrontOpenings() {
  return FRONT_OPENINGS.map(function ({ left, right, height }) {
    return makeBox([left, -OVERRUN, -height / 2], [right, OPENING_DEPTH, height / 2])
  })
}

function stadium({ left, right, front, back }) {
  const radius = (back - front) / 2,
    middle = (front + back) / 2,
    straight = right - left - 2 * radius,
    body = drawRectangle(straight, 2 * radius).translate((left + right) / 2, middle),
    leftEnd = drawCircle(radius).translate(left + radius, middle),
    rightEnd = drawCircle(radius).translate(right - radius, middle)

  return body.fuse(leftEnd).fuse(rightEnd)
}

function windowOutline() {
  return stadium(WINDOW)
}

function windowOpening(atTop) {
  const sketch = windowOutline().sketchOnPlane("XY", -OVERRUN),
    tall = WALL + 2 * OVERRUN,
    opening = sketch.extrude(tall)

  return opening.translate([0, 0, atTop ? HOLLOW_TOP : -HALF_BODY])
}

function labelOutline({ left, right, front, back, cut }) {
  return draw([left, front])
    .lineTo([right, front])
    .lineTo([right, back - cut])
    .lineTo([right - cut, back])
    .lineTo([left + cut, back])
    .lineTo([left, back - cut])
    .close()
}

function buildLabelRecess(label) {
  const outline = labelOutline(label),
    grown = outline.offset(HAIRLINE),
    sketch = grown.sketchOnPlane("XY", RECESS_FLOOR)

  return sketch.extrude(LABEL_RECESS_DEPTH + OVERRUN)
}

// The middle screw stands on the front region's raised face, the others on the body's.
function faceUnder([x, y]) {
  const onFront = y < FRONT_REGION.depth && Math.abs(x - MIDDLE) < FRONT_REGION.width / 2

  return onFront ? HALF_FRONT : HALF_BODY
}

function buildScrewSeats() {
  return SCREWS.map(function (place) {
    const [x, y] = place,
      face = faceUnder(place)

    return makeCylinder(SCREW.diameter / 2 + HAIRLINE, SCREW.sunk + OVERRUN, [
      x,
      y,
      face - SCREW.sunk
    ])
  })
}

function buildShell(label, material) {
  const outline = roundedOutline().sketchOnPlane("XY", -HALF_BODY),
    body = outline.extrude(BODY),
    frontRegion = buildFrontRegion(),
    endRibs = buildEndRibs(),
    whole = body.fuse(frontRegion).fuse(endRibs),
    hollow = makeBox(
      [HOLLOW.left, HOLLOW.front, -HOLLOW_TOP],
      [HOLLOW.right, HOLLOW.back, HOLLOW_TOP]
    ),
    cuts = [
      hollow,
      ...buildHoles(),
      ...buildFrontOpenings(),
      windowOpening(true),
      windowOpening(false),
      buildLabelRecess(label),
      ...buildScrewSeats()
    ]

  let shell = whole

  for (const cut of cuts) {
    shell = shell.cut(cut)
  }

  return { name: "shell", shape: shell.translate(CENTRING), material }
}

// The window's plate fills its opening through the wall, a hairline short of the label's recess above it, and the hubs' holes run through it.
function windowPlate(outline, atTop) {
  const thick = WALL - LABEL_RECESS_DEPTH - HAIRLINE,
    sketch = outline.sketchOnPlane("XY", 0),
    plate = sketch.extrude(thick),
    bottom = atTop ? HOLLOW_TOP : -HOLLOW_TOP - thick,
    holes = hubPlaces().map(x => throughHole(HUB_HOLES.diameter, [x, HUB_HOLES.fromFront]))

  let pierced = plate.translate([0, 0, bottom])

  for (const hole of holes) {
    pierced = pierced.cut(hole)
  }

  return pierced
}

function rectangleOutline({ left, right, front, back }) {
  return drawRectangle(right - left, back - front).translate((left + right) / 2, (front + back) / 2)
}

function buildWindows(rectangle, rectangleName, plateMaterial, rectangleMaterial) {
  const outline = rectangleOutline(rectangle),
    dark = windowOutline().cut(outline),
    plates = [true, false].map(atTop => windowPlate(dark, atTop)),
    rectangles = [true, false].map(atTop => windowPlate(outline, atTop)),
    plate = makeCompound(plates),
    letIn = makeCompound(rectangles)

  return [
    { name: "window", shape: plate.translate(CENTRING), material: plateMaterial },
    { name: rectangleName, shape: letIn.translate(CENTRING), material: rectangleMaterial }
  ]
}

// The print covers the label's whole rectangle, and each area the hand writes in is a fraction of it.
function buildLabel(label, opening, material, writing) {
  const outline = labelOutline(label),
    sheet = outline.cut(opening).sketchOnPlane("XY", RECESS_FLOOR + HAIRLINE),
    paper = sheet.extrude(LABEL_THICKNESS)

  return {
    name: LABEL_PRINT,
    shape: paper.translate(CENTRING),
    material,
    face: {
      left: label.left + CENTRING[0],
      right: label.right + CENTRING[0],
      front: label.front + CENTRING[1],
      rear: label.back + CENTRING[1]
    },
    print: LABEL_PRINT,
    writing
  }
}

function buildScrews(material) {
  const heads = SCREWS.map(function (place) {
    const [x, y] = place,
      face = faceUnder(place)

    return makeCylinder(SCREW.diameter / 2, SCREW.sunk - HAIRLINE, [x, y, face - SCREW.sunk])
  })

  return { name: "screws", shape: makeCompound(heads).translate(CENTRING), material }
}

// Each hub and each pack is a part of its own, standing on its hole's middle, so that the page can turn it there.
function buildHub() {
  const winding = HUB.winding / 2,
    bore = HUB.bore / 2,
    hole = drawCircle(bore),
    ring = drawCircle(winding).cut(hole),
    body = ring.sketchOnPlane("XY", -HUB_HEIGHT / 2).extrude(HUB_HEIGHT),
    teeth = []

  for (let index = 0; index < HUB.teeth; index++) {
    const tooth = makeBox(
        [HUB.tips / 2, -HUB.tooth / 2, -HUB_HEIGHT / 2],
        [bore + HAIRLINE, HUB.tooth / 2, HUB_HEIGHT / 2]
      ),
      turned = tooth.rotate((index * 360) / HUB.teeth, [0, 0, 0], [0, 0, 1])

    teeth.push(turned)
  }

  let hub = body

  for (const tooth of teeth) {
    hub = hub.fuse(tooth)
  }

  return hub
}

// The pack is drawn full and the page shrinks it about its middle, so its hole is drawn as much larger than the hub's bore as the pack is larger than an empty hub, and stays inside the hub's ring however far the pack is wound.
function buildPack() {
  const outer = FULL_PACK / 2,
    hole = ((HUB.bore / 2) * outer) / (HUB.winding / 2),
    inner = drawCircle(hole),
    ring = drawCircle(outer).cut(inner)

  return ring.sketchOnPlane("XY", -TAPE.width / 2).extrude(TAPE.width)
}

function buildReels(hubMaterial, tapeMaterial) {
  const [left, right] = hubPlaces(),
    sides = [
      ["left", left],
      ["right", right]
    ]

  return sides.flatMap(function ([side, x]) {
    const place = [x + CENTRING[0], HUB_HOLES.fromFront + CENTRING[1], 0]

    return [
      { name: `${side}-hub`, shape: buildHub(), material: hubMaterial, place },
      { name: `${side}-pack`, shape: buildPack(), material: tapeMaterial, place }
    ]
  })
}

// The tape where the openings show it, crossing the front between its outer openings.
function buildFrontTape(material) {
  const [first] = FRONT_OPENINGS,
    [last] = FRONT_OPENINGS.slice(-1),
    tape = makeBox(
      [first.left, TAPE.fromFront, -TAPE.width / 2],
      [last.right, TAPE.fromFront + HAIRLINE, TAPE.width / 2]
    )

  return { name: "front-tape", shape: tape.translate(CENTRING), material }
}

export {
  LABEL_PRINT,
  TESSELLATION,
  buildFrontTape,
  buildLabel,
  buildReels,
  buildScrews,
  buildShell,
  buildWindows,
  windowOutline
}
