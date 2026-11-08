import { AMSOFT_INK, drawAmsoft } from "./amsoft.js"
import { draw, drawCircle, drawRectangle, makeBox, makeCompound, makeCylinder } from "replicad"

// x runs across side A from its left end, seen with the tape's openings toward the reader, y back from that front edge, and z up from the shell's middle plane, in millimetres.

// The Amsoft CT-15, the blank Amsoft sold for recording programs and data [A], "Amsoft offer premium priced ten-pack of C-15 cassettes for recording programs and data. Complete with index card inlay.": https://archive.org/details/Amsoft_Software_And_Peripherals_Catalogue_Winter_1984-85_1984_Amstrad_Consumer_Electronics
// Its shell is the compact cassette's, which ECMA-34 dimensions whole [A], Fig. 1 to 4: https://ecma-international.org/wp-content/uploads/ECMA-34_3rd_edition_september_1976.pdf, and IEC 94-7 again, read in its faithful Japanese copy [A], JIS C 5568:1997: https://kikakurui.com/c5/C5568-1997-01.html
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

// "The scan" is a flatbed scan of both faces of an Amsoft C15 [C], rectified here to its outline, ±0.5 [E]: https://oldwiki.cpcwiki.eu/imgs/f/f1/Amsoft_C15.jpg; a scan of another one agrees with it within that [E]: https://oldwiki.cpcwiki.eu/imgs/e/e3/C15_Tape.jpg
// The label lies 6.2 to 94.8 across and 17.4 to 57.1 back, its rear corners cut off at 45° 4 along each edge, and a stadium cut out of it 20.5 to 80.3 across by 27.9 to 41.7 back, where the shell's window shows. Each half of the shell has one. Its plate reads as dark as the shell, and nothing behind it shows through, but in a clear rectangle 39.3 to 61.3 across by 33.4 to 40.6 back, through which the side's first pack shows, and the hubs show through their own holes [E].
// Five silver screws hold side A, their heads 4.2 across: four at the corners, about 2.85 in from the ends and 3.8 from the front and back edges, and one at 50.2 across, 12.4 back [E]. Side B carries none.
const LABEL = { left: 6.2, right: 94.8, front: 17.4, back: 57.1, cut: 4 },
  WINDOW = { left: 20.5, right: 80.3, front: 27.9, back: 41.7 },
  CLEAR = { left: 39.3, right: 61.3, front: 33.4, back: 40.6 },
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

// None of these is measured. The walls are taken 1.2 thick, the hubs 6.1 tall inside a hollow 6.3 deep, and the screws' heads sunk 0.3; the label's recess is taken 0.3 deep and the label 0.1 thick, as the disc's are. Behind the openings the front stands solid but for pockets 5 deep, where the tape crosses them.
const WALL = 1.2,
  HUB_HEIGHT = 6.1,
  SCREW = { diameter: 4.2, sunk: 0.3 },
  LABEL_RECESS_DEPTH = 0.3,
  LABEL_THICKNESS = 0.1,
  OPENING_DEPTH = 5,
  HOLLOW = { left: WALL, right: WIDTH - WALL, front: 8, back: DEPTH - WALL }

// Colours, all [E]: no Amsoft C15 was measured under known light. The shell reads #16181a on two black shells photographed on near-neutral grounds, a Saisho C15 and an Ampex C12, where the scans of the Amsoft lift its black to #2a2c2e. The window's plate reads #25282a to #36383a on the scans. The label's white band reads #e9edf2 on the scan, its crimson #a32c40 and its black band #252527. The tape's edge reads about #353032 through a Saisho's window. The hubs read light through their holes on the scan and in Amstrad's own photograph of two C15s [A]: https://archive.org/details/Amsoft_Software_And_Peripherals_Catalogue_Winter_1984-85_1984_Amstrad_Consumer_Electronics
// The rest are guesses: whether the window's plate is smoked or backed, which is drawn as it reads, opaque; how much the clear rectangle lets through, and its faint grey; the hubs' shade of white; the screws' silver; and how smooth the plate, the clear plastic and the screws are.
const SHELL = { name: "shell", colour: "#16181a" },
  WINDOW_PLATE = { name: "window", colour: "#2e3032", roughness: 0.2 },
  CLEAR_PLASTIC = { name: "window-clear", colour: "#d8dadb", opacity: 0.15, roughness: 0.1 },
  PAPER = { name: "label", colour: "#e9edf2" },
  HUB_PLASTIC = { name: "hub", colour: "#d9d8d2" },
  TAPE_OXIDE = { name: "tape", colour: "#353032" },
  SCREW_METAL = { name: "screw", colour: "#b4b6b8", roughness: 0.3 }

const LABEL_WHITE = PAPER.colour,
  LABEL_BLACK = "#252527",
  LABEL_CRIMSON = "#a32c40",
  LABEL_INK = "#151515"

// The label measured on the scan, x across from its left edge and y down from its rear edge, ±0.5 [E]: a white band to 14.45, black to 30.4 and crimson to its front edge. On the white, "TITLE NAME" over a box 14.6 to 60.0 by 4.4 to 13.3, ruled at 8.65, where the title is written, and "COUNTER" over a box running on to 85.2 with two rows of four dots, a dash and four dots, each set over a line; the side's letter in a squared stencil 2.6 to 10.9 by 3.1 to 13.3. On the crimson, "C15" in the same stencil, "LOW NOISE" between two rules, "PERSONAL COMPUTER CASSETTE TAPE" under them, and Amsoft's logotype, fitted to the box it fills, with ™ beside it.
// TeX Gyre Heros's bold stands in for the label's grotesque, each word fitted to the width measured for it: https://www.gust.org.pl/projects/e-foundry/tex-gyre/heros. The stencils are drawn by eye.
const LABEL_BANDS = { white: [0, 14.45], black: [14.45, 30.4], crimson: [30.4, 39.7] },
  LABEL_ART = {
    line: 0.25,
    titleWord: { word: "TITLE NAME", left: 15.2, width: 16.4, baseline: 3.7, capHeight: 2.1 },
    counterWord: { word: "COUNTER", left: 60.7, width: 13, baseline: 3.7, capHeight: 2.1 },
    titleBox: { left: 14.6, top: 4.4, right: 60, bottom: 13.3, rule: 8.65 },
    counterBox: { right: 85.2, top: 4.55 },
    counterRows: [
      { dots: 8, line: 9 },
      { dots: 12.3, line: 13.3 }
    ],
    counterDots: [61, 64, 67, 70.1, 75, 78, 81.1, 84.3],
    counterDash: { left: 71.2, right: 73.9, above: 1.4 },
    counterLines: [
      [60.2, 70.1],
      [75.1, 84.3]
    ],
    dot: 0.35,
    side: { left: 2.6, top: 3.1, right: 10.9, bottom: 13.3, stroke: 1.5 },
    code: { left: 2.4, top: 32.2, right: 10.9, bottom: 35.4, stroke: 0.75 },
    lowNoise: { word: "LOW NOISE", left: 34.5, width: 21.3, top: 31.9, bottom: 35.4, rule: 0.35 },
    tapeWords: {
      word: "PERSONAL COMPUTER CASSETTE TAPE",
      left: 2.4,
      width: 53.2,
      baseline: 37.9,
      capHeight: 1.8
    },
    logotype: { left: 57.4, top: 32.6, right: 83.7, bottom: 38.4 },
    trademark: { left: 84.8, baseline: 33.8, capHeight: 1.2 }
  }

// Where a hand writes the name: on the title box's first line, 0.4 clear of its rules and 1 in from its ends, which are guesses.
const WRITING_CLEARANCE = 0.4,
  WRITING_INSET = 1

const HEROS = "TeX Gyre Heros",
  HEROS_CAP_HEIGHT = 0.729

// How finely the label is rendered, as the disc's.
const LABEL_PIXELS = 12

// How far the triangles may stray from a curved face, in millimetres, and turn from one another along it, in radians: a choice of how finely to draw, not a figure of the cassette.
const TESSELLATION = { tolerance: 0.1, angularTolerance: 0.5 }

// A cut runs this far past the faces it opens, so the kernel is never left two coplanar faces to join.
const OVERRUN = 1

// Where one part lies in another's opening, a hairline holds the two apart, so that no face of either stands in the plane of a face of the other.
const HAIRLINE = 0.1

const LANGUAGE = "es",
  LABEL_PRINT = "label"

const MIDDLE = WIDTH / 2,
  HALF_BODY = BODY / 2,
  HALF_FRONT = FRONT_REGION.thickness / 2,
  RADIANS = Math.PI / 180,
  CENTRING = [-MIDDLE, -DEPTH / 2, 0],
  LABEL_WIDTH = LABEL.right - LABEL.left,
  LABEL_DEPTH = LABEL.back - LABEL.front,
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

function windowOpening(atTop) {
  const sketch = stadium(WINDOW).sketchOnPlane("XY", -OVERRUN),
    tall = WALL + 2 * OVERRUN,
    opening = sketch.extrude(tall)

  return opening.translate([0, 0, atTop ? HOLLOW_TOP : -HALF_BODY])
}

function labelOutline() {
  const { left, right, front, back, cut } = LABEL

  return draw([left, front])
    .lineTo([right, front])
    .lineTo([right, back - cut])
    .lineTo([right - cut, back])
    .lineTo([left + cut, back])
    .lineTo([left, back - cut])
    .close()
}

function buildLabelRecess() {
  const grown = labelOutline().offset(HAIRLINE),
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

function buildShell() {
  const outline = roundedOutline().sketchOnPlane("XY", -HALF_BODY),
    body = outline.extrude(BODY),
    whole = body.fuse(buildFrontRegion()).fuse(buildEndRibs()),
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
      buildLabelRecess(),
      ...buildScrewSeats()
    ]

  let shell = whole

  for (const cut of cuts) {
    shell = shell.cut(cut)
  }

  return { name: "shell", shape: shell.translate(CENTRING), material: SHELL }
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

function clearOutline() {
  const { left, right, front, back } = CLEAR

  return drawRectangle(right - left, back - front).translate((left + right) / 2, (front + back) / 2)
}

function buildWindows() {
  const dark = stadium(WINDOW).cut(clearOutline()),
    plates = [true, false].map(atTop => windowPlate(dark, atTop)),
    clear = [true, false].map(atTop => windowPlate(clearOutline(), atTop)),
    plate = makeCompound(plates),
    glass = makeCompound(clear)

  return [
    { name: "window", shape: plate.translate(CENTRING), material: WINDOW_PLATE },
    { name: "window-clear", shape: glass.translate(CENTRING), material: CLEAR_PLASTIC }
  ]
}

// The title box's first line, as a fraction of the label.
function writingArea() {
  const { titleBox, line } = LABEL_ART,
    left = titleBox.left + line / 2 + WRITING_INSET,
    top = titleBox.top + line / 2 + WRITING_CLEARANCE,
    width = titleBox.right - titleBox.left - line - 2 * WRITING_INSET,
    height = titleBox.rule - titleBox.top - line - 2 * WRITING_CLEARANCE

  return {
    left: left / LABEL_WIDTH,
    top: top / LABEL_DEPTH,
    width: width / LABEL_WIDTH,
    height: height / LABEL_DEPTH
  }
}

function buildLabel() {
  const sketch = labelOutline()
      .cut(stadium(WINDOW))
      .sketchOnPlane("XY", RECESS_FLOOR + HAIRLINE),
    paper = sketch.extrude(LABEL_THICKNESS)

  return {
    name: LABEL_PRINT,
    shape: paper.translate(CENTRING),
    material: PAPER,
    face: {
      left: LABEL.left + CENTRING[0],
      right: LABEL.right + CENTRING[0],
      front: LABEL.front + CENTRING[1],
      rear: LABEL.back + CENTRING[1]
    },
    print: LABEL_PRINT,
    writing: [writingArea()]
  }
}

function buildScrews() {
  const heads = SCREWS.map(function (place) {
    const [x, y] = place,
      face = faceUnder(place)

    return makeCylinder(SCREW.diameter / 2, SCREW.sunk - HAIRLINE, [x, y, face - SCREW.sunk])
  })

  return { name: "screws", shape: makeCompound(heads).translate(CENTRING), material: SCREW_METAL }
}

// Each hub and each pack is a part of its own, standing on its hole's middle, so that the page can turn it there.
function buildHub() {
  const winding = HUB.winding / 2,
    bore = HUB.bore / 2,
    ring = drawCircle(winding).cut(drawCircle(bore)),
    body = ring.sketchOnPlane("XY", -HUB_HEIGHT / 2).extrude(HUB_HEIGHT),
    teeth = []

  for (let index = 0; index < HUB.teeth; index++) {
    const tooth = makeBox(
      [HUB.tips / 2, -HUB.tooth / 2, -HUB_HEIGHT / 2],
      [bore + HAIRLINE, HUB.tooth / 2, HUB_HEIGHT / 2]
    )

    teeth.push(tooth.rotate((index * 360) / HUB.teeth, [0, 0, 0], [0, 0, 1]))
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
    ring = drawCircle(outer).cut(drawCircle(hole))

  return ring.sketchOnPlane("XY", -TAPE.width / 2).extrude(TAPE.width)
}

function buildReels() {
  const [left, right] = hubPlaces(),
    sides = [
      ["left", left],
      ["right", right]
    ]

  return sides.flatMap(function ([side, x]) {
    const place = [x + CENTRING[0], HUB_HOLES.fromFront + CENTRING[1], 0]

    return [
      { name: `${side}-hub`, shape: buildHub(), material: HUB_PLASTIC, place },
      { name: `${side}-pack`, shape: buildPack(), material: TAPE_OXIDE, place }
    ]
  })
}

// The tape where the openings show it, crossing the front between its outer openings.
function buildFrontTape() {
  const [first] = FRONT_OPENINGS,
    [last] = FRONT_OPENINGS.slice(-1),
    tape = makeBox(
      [first.left, TAPE.fromFront, -TAPE.width / 2],
      [last.right, TAPE.fromFront + HAIRLINE, TAPE.width / 2]
    )

  return { name: "front-tape", shape: tape.translate(CENTRING), material: TAPE_OXIDE }
}

function svgOpen(width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
}

function drawBand([top, bottom], colour) {
  return `<rect x="0" y="${top}" width="${LABEL_WIDTH}" height="${bottom - top}" fill="${colour}"/>`
}

function drawWord({ word, left, width, baseline, capHeight }) {
  const size = capHeight / HEROS_CAP_HEIGHT

  return `<text x="${left}" y="${baseline}" font-family="${HEROS}" font-size="${size}" font-weight="700" fill="${LABEL_INK}" textLength="${width}" lengthAdjust="spacingAndGlyphs">${word}</text>`
}

function drawLine([fromX, fromY], [toX, toY], thickness) {
  return `<line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="${LABEL_INK}" stroke-width="${thickness}"/>`
}

function drawStroke(points, thickness) {
  const listed = points.map(([x, y]) => `${x},${y}`).join(" ")

  return `<polyline points="${listed}" fill="none" stroke="${LABEL_INK}" stroke-width="${thickness}" stroke-linejoin="round"/>`
}

// The side's letter, a squared A: two legs and a top, and a bar across.
function drawSideLetter() {
  const { left, top, right, bottom, stroke } = LABEL_ART.side,
    inner = stroke / 2,
    legLeft = left + inner,
    legRight = right - inner,
    head = top + inner,
    bar = (top + bottom) / 2

  return [
    drawStroke(
      [
        [legLeft, bottom],
        [legLeft, head],
        [legRight, head],
        [legRight, bottom]
      ],
      stroke
    ),
    drawLine([legLeft, bar], [legRight, bar], stroke)
  ].join("\n")
}

// "C15" in the same squared hand.
function drawCode() {
  const { left, top, right, bottom, stroke } = LABEL_ART.code,
    inner = stroke / 2,
    each = (right - left) / 3,
    upper = top + inner,
    lower = bottom - inner,
    middle = (top + bottom) / 2,
    five = left + 2 * each

  return [
    drawStroke(
      [
        [left + each - inner, upper],
        [left + inner, upper],
        [left + inner, lower],
        [left + each - inner, lower]
      ],
      stroke
    ),
    drawLine([left + 1.5 * each, top], [left + 1.5 * each, bottom], stroke),
    drawStroke(
      [
        [five + each - inner, upper],
        [five + inner, upper],
        [five + inner, middle],
        [five + each - inner, middle],
        [five + each - inner, lower],
        [five + inner, lower]
      ],
      stroke
    )
  ].join("\n")
}

function drawTitleBox() {
  const { titleBox, counterBox, line } = LABEL_ART,
    { left, top, right, bottom, rule } = titleBox

  return [
    `<rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" fill="none" stroke="${LABEL_INK}" stroke-width="${line}"/>`,
    drawLine([left, rule], [right, rule], line),
    drawLine([right, 0], [right, top], line),
    drawLine([right, counterBox.top], [counterBox.right, counterBox.top], line),
    drawLine([counterBox.right, counterBox.top], [counterBox.right, bottom], line)
  ].join("\n")
}

function drawCounterRows() {
  const { counterRows, counterDots, counterDash, counterLines, dot, line } = LABEL_ART,
    drawn = []

  for (const row of counterRows) {
    for (const x of counterDots) {
      drawn.push(`<circle cx="${x}" cy="${row.dots}" r="${dot}" fill="${LABEL_INK}"/>`)
    }

    const dashAt = row.dots - counterDash.above

    drawn.push(drawLine([counterDash.left, dashAt], [counterDash.right, dashAt], line))

    for (const [from, to] of counterLines) {
      drawn.push(drawLine([from, row.line], [to, row.line], line))
    }
  }

  return drawn.join("\n")
}

function drawLowNoise() {
  const { word, left, width, top, bottom, rule } = LABEL_ART.lowNoise,
    capHeight = bottom - top - 4 * rule,
    upper = top + rule / 2,
    lower = bottom - rule / 2

  return [
    drawLine([left, upper], [left + width, upper], rule),
    drawLine([left, lower], [left + width, lower], rule),
    drawWord({ word, left, width, baseline: bottom - 2 * rule, capHeight })
  ].join("\n")
}

function drawLogotype() {
  const { logotype, trademark } = LABEL_ART,
    across = (logotype.right - logotype.left) / (AMSOFT_INK.right - AMSOFT_INK.left),
    down = (logotype.bottom - logotype.top) / (AMSOFT_INK.bottom - AMSOFT_INK.top),
    fitted = `translate(${logotype.left} ${logotype.top}) scale(${across} ${down}) translate(${-AMSOFT_INK.left} ${-AMSOFT_INK.top})`,
    lettering = drawAmsoft([0, 0], { ink: LABEL_INK, paper: LABEL_CRIMSON }),
    size = trademark.capHeight / HEROS_CAP_HEIGHT

  return [
    `<g transform="${fitted}">${lettering}</g>`,
    `<text x="${trademark.left}" y="${trademark.baseline}" font-family="${HEROS}" font-size="${size}" font-weight="700" fill="${LABEL_INK}">™</text>`
  ].join("\n")
}

function drawLabel() {
  return [
    svgOpen(LABEL_WIDTH, LABEL_DEPTH),
    drawBand(LABEL_BANDS.white, LABEL_WHITE),
    drawBand(LABEL_BANDS.black, LABEL_BLACK),
    drawBand(LABEL_BANDS.crimson, LABEL_CRIMSON),
    drawSideLetter(),
    drawWord(LABEL_ART.titleWord),
    drawWord(LABEL_ART.counterWord),
    drawTitleBox(),
    drawCounterRows(),
    drawCode(),
    drawLowNoise(),
    drawWord(LABEL_ART.tapeWords),
    drawLogotype(),
    "</svg>"
  ].join("\n")
}

export function buildCt15() {
  return {
    tessellation: TESSELLATION,
    parts: [
      buildShell(),
      ...buildWindows(),
      buildLabel(),
      buildScrews(),
      ...buildReels(),
      buildFrontTape()
    ],
    prints: [{ name: LABEL_PRINT, language: LANGUAGE, svg: drawLabel(), pixels: LABEL_PIXELS }]
  }
}
