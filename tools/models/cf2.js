import { draw, makeBox, makeCompound, makeCylinder } from "replicad"

// x runs across face A from its left long edge, y back from the label end toward the head end, which enters the drive first, and z up from face B, in millimetres. Face A is the face whose moulded arrow reads A. Face B is face A turned half round the disc's long middle line, so each face's left is its own, seen from its own side.
// A figure that belongs to one face — its cutout, its pocket, its recess — is given from that face's own left edge, and face B's openings are face A's turned over. A figure that runs through the disc, or lies on it whichever way up it is read, is given from face A's left edge.

// The Amsoft CF2, the "3 inch compact floppy disc" of the CPC 6128's user instructions [A], ch. 1: https://archive.org/details/amstrad-cpc-6128-user-manual
// 80 × 100 × 5 [A], Hitachi HFD305SX instruction manual, Fig. 4 "Recording Media": https://archive.org/details/hitachi-compact-floppy-disk-drive-model-hfd-305-sx
const WIDTH = 80,
  LENGTH = 100,
  THICKNESS = 5

// "The scan" below is a flatbed scan of face B of an Amsoft blank with a ruler in the same scan, 11.757 pixels to the millimetre: https://www.fileformat.info/media/compact-floppy/index.htm
// The corners round over 3.1 at the label end and 2.75 at the head end, ±0.2, on the scan [E].
const LABEL_END_RADIUS = 3.1,
  HEAD_END_RADIUS = 2.75

// The head window is a stadium 11.1 across and 22.8 long, 4.8 short of the head end, ±0.2, on the scan [E]; the metal shutter behind it closes it whenever the disc is out of a drive [A], the user instructions' glossary.
// The centre window is 18.3 across, ±0.3, its middle 43.0 from the head end, ±0.5, and the ivory hub in it about 17.8, on the scan [E]; the hub's centre hole is 4.7 across on Hitachi's drawing, scaled [E].
// The index window is 3.8 across, ±0.2, its middle 57.2 from the head end, ±0.4, on the scan [E].
const HEAD_WINDOW = { across: 11.1, along: 22.8, fromHeadEnd: 4.8 },
  CENTRE_WINDOW = { diameter: 18.3, fromHeadEnd: 43 },
  HUB = { diameter: 17.8, hole: 4.7 },
  INDEX_WINDOW = { diameter: 3.8, fromHeadEnd: 57.2 }

// Two locating holes take the drive's pins, and the scan's white shows through both: one round, 4.15 across, its middle 15.0 from face A's left edge and 7.9 from the head end, and one oblong, 5.1 across by 4.1, its middle 14.85 from face A's right edge and 7.85 from the head end, ±0.1, on the scan [E]. A scan sees each hole's narrowest section, so each is drawn at that section straight through; a photograph of face A reads both at about 4.0 by 3.3, which is the light through a hole seen at an angle rather than either aperture.
const ROUND_LOCATING_HOLE = { diameter: 4.15, fromLeft: 15, fromHeadEnd: 7.9 },
  OBLONG_LOCATING_HOLE = { across: 5.1, along: 4.1, fromRight: 14.85, fromHeadEnd: 7.85 }

// The side-A/B detection notch in the head end runs 16.45 to 19.55 from face A's left edge, where the scan reads it 60.45 to 63.55 from face B's, and 2.95 deep, ±0.1, through the whole thickness [E].
const NOTCH = { left: 16.45, right: 19.55, depth: 2.95 }

// "To open the Write Protect hole, slide the small shutter located at the left hand corner of the disc" [A], the user instructions, ch. 1 p. 12. On each face that shutter runs in a cutout from 4.8 to 8.95 from the face's own left edge and 6.35 in from the head end, open to it, over a hole 3.0 across, its middle 6.95 from that edge and 2.85 from the head end, which runs on through the disc, so that the other face shows the closed shutter white through it, ±0.1, on the scan [E]. A blank disc leaves its shutters closed, and so writable.
const WRITE_PROTECT_CUTOUT = { left: 4.8, right: 8.95, fromHeadEnd: 6.35 },
  WRITE_PROTECT_HOLE = { diameter: 3, fromLeft: 6.95, fromHeadEnd: 2.85 }

// The label's recess runs from 4.1 to 76.0 from its own face's left edge and 34.35 in from the label end, ±0.3, open at that end, on the scan [E].
// One label wraps round the label end, so the same strip stands on both faces: 4.87 to 75.04 from face B's left edge and 33.05 in, ±0.1, on the scan, which is 4.96 to 75.13 across face A [E]. Its two corners away from the label end round over 1.6, ±0.3, on the scan and the photograph of side 1 below [E].
const LABEL_RECESS = { left: 4.1, right: 76, fromLabelEnd: 34.35 },
  LABEL = { left: 4.96, right: 75.13, fromLabelEnd: 33.05, cornerRadius: 1.6 }

// No photograph shows how deep the windows, pockets and recesses go, nor how thick the label is. These are taken: the shutter and the hub stand back 0.8 and 0.5 from each face, the index window is a pocket 1.2 deep, the write-protect cutout 1.2, with its shutter 0.2 short of the face, the label recess 0.3, and the label 0.1.
const SHUTTER_SET_BACK = 0.8,
  HUB_SET_BACK = 0.5,
  INDEX_POCKET_DEPTH = 1.2,
  WRITE_PROTECT_DEPTH = 1.2,
  WRITE_PROTECT_SET_BACK = 0.2,
  LABEL_RECESS_DEPTH = 0.3,
  LABEL_THICKNESS = 0.1

// Sampled on a museum's studio photograph under diffuse light, #131313 to #181819, taken here at the middle of that range [E]: https://commons.wikimedia.org/wiki/File:79_DISQUETES.jpg. The scan reads it at about 3 % of white; a satin near-black, good for the hue and no more.
const CASE = { name: "case", colour: "#161617" }

// The scan reads the shutter's brushed metal #706d65; studio light turns it white, so it is drawn matte at the scan's reading [E].
const SHUTTER = { name: "shutter", colour: "#706d65" }

// The hub reads #dad2ba lit in the museum's photograph and the write-protect shutters white, #eef0ef, on the scan [E].
const HUB_PLASTIC = { name: "hub", colour: "#dad2ba" },
  WRITE_PROTECT = { name: "write-protect", colour: "#eef0ef" }

// A printed part carries a material of its own, because the page inks its print over the material it finds.
const LABEL_PRINT = "label",
  PAPER = { name: "label", colour: "#d6d2cb" }

// How far the triangles may stray from a curved face, in millimetres, and turn from one another along it, in radians: a choice of how finely to draw, not a figure of the machine.
const TESSELLATION = { tolerance: 0.1, angularTolerance: 0.5 }

// A cut runs this far past the faces it opens, so the kernel is never left two coplanar faces to join.
const OVERRUN = 1

// Where one part lies in another's recess or opening, a hairline holds the two apart, so that no face of either stands in the plane of a face of the other.
const HAIRLINE = 0.1

// Each face of the label lies this far below its face of the case, and the paper runs on a hairline past the label end, where it turns down the end and back along the other face; unfolded, the three make one sheet.
const LABEL_WIDTH = LABEL.right - LABEL.left,
  PAPER_SUNK = LABEL_RECESS_DEPTH - HAIRLINE - LABEL_THICKNESS,
  PAPER_DEPTH = LABEL.fromLabelEnd + HAIRLINE,
  STRIP_HEIGHT = THICKNESS - 2 * PAPER_SUNK,
  SHEET_DEPTH = 2 * PAPER_DEPTH + STRIP_HEIGHT

// The Amsoft blank's label, x across from its left edge and y down from its top edge, measured on the scan of side 2, ±0.1, and on a photograph of side 1, ±0.2, both rectified at 20 pixels to the millimetre [E]: https://commons.wikimedia.org/wiki/File:AMSoft_Compact_Floppy_Disc_20071208.jpg
// The two are different discs carrying different prints of one label. Where they differ the scan's figure is taken, and only the red band's arrangement follows each side's own.
// A red band to 10.95, a black rule to 11.55, white paper ruled 0.2 thick at 15.11 and 19.14, a black band from 23.11 to 26.24 and a silver one from there to the label end, every one running off both edges.
const LABEL_BANDS = {
    red: [0, 10.95],
    rule: [10.95, 11.55],
    black: [23.11, 26.24],
    silver: [26.24, PAPER_DEPTH]
  },
  LABEL_RULES = { at: [15.11, 19.14], thickness: 0.2 }

// "Amsoft" is lettering, not type: strokes of the bare paper 0.34 thick across and 0.44 on the slant, sheared 30°, each edged in black that is the stroke grown 0.28 and shifted 0.06 right and 0.09 down. It is drawn here from its strokes' centrelines as measured on side 1, at one width of 0.4 [E].
// The ® beside it is a black ring 1.6 across and 0.08 thick round a regular R 0.85 tall.
const LOGOTYPE = {
    strokes: [
      [
        [2.02, 8.88],
        [4.97, 8.88],
        [7.89, 3.72],
        [10.59, 3.71],
        [7.68, 8.89],
        [9.09, 8.88],
        [10.81, 5.86],
        [10.63, 8.86],
        [14.13, 5.59],
        [12.26, 8.88],
        [15.3, 8.88],
        [16.22, 7.32],
        [14.42, 7.32],
        [15.14, 6.05],
        [17.16, 6.05]
      ],
      [
        [6.55, 6.06],
        [9.29, 6.05]
      ],
      [
        [18.22, 6.05],
        [25.45, 6.04]
      ],
      [
        [19.95, 8.91],
        [22.88, 3.74],
        [24.37, 3.75]
      ],
      [
        [25.47, 3.56],
        [25.35, 3.76],
        [22.47, 8.92],
        [27.15, 8.92]
      ]
    ],
    ring: [
      [16.68, 8.9],
      [18.55, 8.91],
      [20.18, 6.05],
      [18.22, 6.05]
    ],
    stroke: 0.4,
    edge: 0.28,
    shadow: [0.06, 0.09]
  },
  REGISTERED = { diameter: 1.6, ring: 0.08, capHeight: 0.85 }

// Each side's red band as printed on its own disc: the lettering's place against side 1's, the ®'s middle, the side's number, and a black box on the bare paper round a black arrow pointing to the head end.
// Heros's regular 1 and 2 are 1.04 and 2.06 wide where side 1's photograph has 1.04 and the scan 2.16, so each number is set at Heros's own width, from the pen that centres its ink on theirs [E].
// Each side's number stands again on the strip round the label end, at that side's left as its face reads it, from the pen that centres it on the museum's photograph below [E].
const LABEL_SIDE_1_ART = {
    lettering: [0, 0],
    registered: [30.08, 8.7],
    number: { word: "1", pen: 60.11, baseline: 9.15, capHeight: 3.1 },
    box: { left: 62.67, top: 2.11, right: 68.73, bottom: 9.19, line: 0.59 },
    arrow: { axis: 65.71, tip: 3.01, headBase: 5.7, headWidth: 2.9, shaft: 0.57, end: 8.17 },
    endPen: 5.02
  },
  LABEL_SIDE_2_ART = {
    lettering: [37.54, -0.42],
    registered: [67.61, 8.15],
    number: { word: "2", pen: 8.8, baseline: 9.12, capHeight: 3.15 },
    box: { left: 1.57, top: 2.06, right: 7.65, bottom: 9.15, line: 0.53 },
    arrow: { axis: 4.62, tip: 2.94, headBase: 5.65, headWidth: 3, shaft: 0.42, end: 8.14 },
    endPen: 4.84
  }

// The strip round the label end is bare paper, read on the museum's photograph, ±0.5 [E]. At each side's left, as that side's face reads it, a black triangle 2.6 wide points to that face, its middle 3.1 in from the end, and the side's number follows, its middle 5.85 in, 0.93 and 1.8 wide.
// The photograph sees the strip too nearly edge-on for any height, and a ±0.5 on those widths is a millimetre and a half on a height taken from them. These are taken: each triangle as tall as it is wide, each number 2.7 tall, which is about what its width gives in Heros's proportions, and both marks on the strip's middle.
const END_MARKS = { triangle: { middle: 3.1, width: 2.6 }, capHeight: 2.7 }

// TeX Gyre Heros stands in for the label's grotesque, its capitals 0.729 of its size: https://www.gust.org.pl/projects/e-foundry/tex-gyre/heros. Its bold draws "For Single Head Drive", white out of the black band, glyph for glyph, which the label sets 4 % tighter than Heros. "Compact Floppy Disc" is a medium weight between Heros's regular and bold, and bold is taken. "CF2" is regular, its C and F narrower than Heros's. Each word is fitted to the width measured for it [E].
const LABEL_WORDS = {
    drive: {
      word: "For Single Head Drive",
      left: 1.93,
      width: 31.04,
      baseline: 25.7,
      capHeight: 2.3,
      weight: 700
    },
    format: {
      word: "Compact Floppy Disc",
      left: 13.73,
      width: 31.03,
      baseline: 31.78,
      capHeight: 2.3,
      weight: 700
    },
    code: { word: "CF2", left: 60.89, width: 7.06, baseline: 31.67, capHeight: 3.07, weight: 400 }
  },
  HEROS = "TeX Gyre Heros",
  HEROS_CAP_HEIGHT = 0.729

// The CF mark, black on the silver, measured on the scan [E]: a box lined 0.17; inside it one stroke 0.9 thick runs from the C's top arm round its curve, 1.62 about its middle, along its bottom arm and up a 60° diagonal into the F's top bar; the F's middle is a bar 1.16 thick, rounded at its left end.
const CF_MARK = {
  box: { left: 2.06, top: 27.09, right: 12.04, bottom: 32.21, line: 0.17 },
  stroke: 0.9,
  armEnd: 6.39,
  top: 28.02,
  curve: { x: 4.9, radius: 1.62 },
  foot: 6.84,
  head: [8.7, 28.08],
  topBarEnd: 11.34,
  bar: { left: 9.06, right: 11.36, middle: 30.68, thickness: 1.16 }
}

// The median of each band on the museum's photograph: the red #c92d22, the paper #d6d2cb, the black #1e1d19 and the silver #a0a0a0, the last a metallic print whose sheen no reading holds [E]. The scan reads the same red #e02831 under its own lamp.
const LABEL_RED = "#c92d22",
  LABEL_PAPER = PAPER.colour,
  LABEL_BLACK = "#1e1d19",
  LABEL_SILVER = "#a0a0a0"

// The label is rendered at twelve pixels to the millimetre, as the 6128's plates are, which lays its 0.2 rules over more than two pixels.
const LABEL_PIXELS = 12

const CENTRING = [-WIDTH / 2, -LENGTH / 2, 0],
  MIDDLE = WIDTH / 2,
  LANGUAGE = "es"

function fromHeadEnd(distance) {
  return LENGTH - distance
}

function mirrored(x) {
  return WIDTH - x
}

function turnOver(shape) {
  return shape.rotate(180, [MIDDLE, 0, THICKNESS / 2], [0, 1, 0])
}

function buildStadium({ middle: [x, y], across, along, bottom, height }) {
  const radius = Math.min(across, along) / 2,
    lying = across > along,
    reach = (Math.max(across, along) - 2 * radius) / 2,
    [first, second] = lying
      ? [
          [x - reach, y],
          [x + reach, y]
        ]
      : [
          [x, y - reach],
          [x, y + reach]
        ],
    body = lying
      ? makeBox([x - reach, y - radius, bottom], [x + reach, y + radius, bottom + height])
      : makeBox([x - radius, y - reach, bottom], [x + radius, y + reach, bottom + height]),
    firstEnd = makeCylinder(radius, height, [...first, bottom]),
    secondEnd = makeCylinder(radius, height, [...second, bottom])

  return body.fuse(firstEnd).fuse(secondEnd)
}

function headWindowMiddle() {
  return [MIDDLE, fromHeadEnd(HEAD_WINDOW.fromHeadEnd + HEAD_WINDOW.along / 2)]
}

// Face A's own openings, face B's being these turned over. The write-protect hole stands under that face's cutout and runs on through the disc, so the two are cut as one solid: a compound whose solids meet is no tool for the kernel.
function buildFaceCuts() {
  const faceTop = THICKNESS + OVERRUN,
    index = [MIDDLE, fromHeadEnd(INDEX_WINDOW.fromHeadEnd), THICKNESS - INDEX_POCKET_DEPTH],
    hole = [WRITE_PROTECT_HOLE.fromLeft, fromHeadEnd(WRITE_PROTECT_HOLE.fromHeadEnd), -OVERRUN],
    cutoutNear = fromHeadEnd(WRITE_PROTECT_CUTOUT.fromHeadEnd),
    indexPocket = makeCylinder(INDEX_WINDOW.diameter / 2, faceTop - index[2], index),
    cutout = makeBox(
      [WRITE_PROTECT_CUTOUT.left, cutoutNear, THICKNESS - WRITE_PROTECT_DEPTH],
      [WRITE_PROTECT_CUTOUT.right, LENGTH + OVERRUN, faceTop]
    ),
    writeProtectHole = makeCylinder(WRITE_PROTECT_HOLE.diameter / 2, faceTop + OVERRUN, hole),
    writeProtect = cutout.fuse(writeProtectHole),
    labelRecess = makeBox(
      [LABEL_RECESS.left, -OVERRUN, THICKNESS - LABEL_RECESS_DEPTH],
      [LABEL_RECESS.right, LABEL_RECESS.fromLabelEnd, faceTop]
    )

  return makeCompound([indexPocket, writeProtect, labelRecess])
}

function buildCase() {
  const outline = draw([0, 0])
      .hLine(WIDTH)
      .customCorner(LABEL_END_RADIUS)
      .vLine(LENGTH)
      .customCorner(HEAD_END_RADIUS)
      .hLine(-WIDTH)
      .customCorner(HEAD_END_RADIUS)
      .closeWithCustomCorner(LABEL_END_RADIUS),
    slab = outline.sketchOnPlane("XY").extrude(THICKNESS),
    through = { bottom: -OVERRUN, height: THICKNESS + 2 * OVERRUN },
    centre = [MIDDLE, fromHeadEnd(CENTRE_WINDOW.fromHeadEnd), through.bottom],
    headMiddle = headWindowMiddle(),
    headWindow = buildStadium({
      middle: headMiddle,
      across: HEAD_WINDOW.across,
      along: HEAD_WINDOW.along,
      ...through
    }),
    centreWindow = makeCylinder(CENTRE_WINDOW.diameter / 2, through.height, centre),
    notch = makeBox(
      [NOTCH.left, fromHeadEnd(NOTCH.depth), through.bottom],
      [NOTCH.right, LENGTH + OVERRUN, THICKNESS + OVERRUN]
    ),
    round = [
      ROUND_LOCATING_HOLE.fromLeft,
      fromHeadEnd(ROUND_LOCATING_HOLE.fromHeadEnd),
      through.bottom
    ],
    oblongMiddle = [
      mirrored(OBLONG_LOCATING_HOLE.fromRight),
      fromHeadEnd(OBLONG_LOCATING_HOLE.fromHeadEnd)
    ],
    roundHole = makeCylinder(ROUND_LOCATING_HOLE.diameter / 2, through.height, round),
    oblongHole = buildStadium({
      middle: oblongMiddle,
      across: OBLONG_LOCATING_HOLE.across,
      along: OBLONG_LOCATING_HOLE.along,
      ...through
    }),
    faceA = buildFaceCuts(),
    faceBCopy = buildFaceCuts(),
    faceB = turnOver(faceBCopy),
    everyCut = makeCompound([headWindow, centreWindow, notch, roundHole, oblongHole, faceA, faceB]),
    cut = slab.cut(everyCut)

  return { name: "case", shape: cut.translate(CENTRING), material: CASE }
}

function buildShutter() {
  const middle = headWindowMiddle(),
    plate = buildStadium({
      middle,
      across: HEAD_WINDOW.across - 2 * HAIRLINE,
      along: HEAD_WINDOW.along - 2 * HAIRLINE,
      bottom: SHUTTER_SET_BACK,
      height: THICKNESS - 2 * SHUTTER_SET_BACK
    })

  return { name: "shutter", shape: plate.translate(CENTRING), material: SHUTTER }
}

function buildHub() {
  const middle = [MIDDLE, fromHeadEnd(CENTRE_WINDOW.fromHeadEnd)],
    height = THICKNESS - 2 * HUB_SET_BACK,
    disc = makeCylinder(HUB.diameter / 2, height, [...middle, HUB_SET_BACK]),
    hole = makeCylinder(HUB.hole / 2, THICKNESS + 2 * OVERRUN, [...middle, -OVERRUN]),
    bored = disc.cut(hole)

  return { name: "hub", shape: bored.translate(CENTRING), material: HUB_PLASTIC }
}

// Face A's shutter; face B's is this turned over.
function buildWriteProtectShutter() {
  const near = fromHeadEnd(WRITE_PROTECT_CUTOUT.fromHeadEnd)

  return makeBox(
    [
      WRITE_PROTECT_CUTOUT.left + HAIRLINE,
      near + HAIRLINE,
      THICKNESS - WRITE_PROTECT_DEPTH + HAIRLINE
    ],
    [WRITE_PROTECT_CUTOUT.right - HAIRLINE, LENGTH - HAIRLINE, THICKNESS - WRITE_PROTECT_SET_BACK]
  )
}

function buildWriteProtectShutters() {
  const faceA = buildWriteProtectShutter(),
    faceBShutter = buildWriteProtectShutter(),
    faceB = turnOver(faceBShutter),
    both = makeCompound([faceA, faceB])

  return {
    name: "write-protect-shutters",
    shape: both.translate(CENTRING),
    material: WRITE_PROTECT
  }
}

function buildPaper(floor) {
  const outline = draw([LABEL.left, -HAIRLINE])
    .hLine(LABEL_WIDTH)
    .vLine(PAPER_DEPTH)
    .customCorner(LABEL.cornerRadius)
    .hLine(-LABEL_WIDTH)
    .customCorner(LABEL.cornerRadius)
    .close()

  return outline.sketchOnPlane("XY", floor).extrude(LABEL_THICKNESS)
}

function buildStrip() {
  return makeBox(
    [LABEL.left, -HAIRLINE - LABEL_THICKNESS, PAPER_SUNK],
    [LABEL.right, -HAIRLINE, THICKNESS - PAPER_SUNK]
  )
}

// Where a place on the label stands on the sheet it was printed on: down side 1 to the fold, across the strip from face A to face B, and back along side 2 to its far edge. The three meet exactly at the folds, and the folds run along x, so a place keeps its place across the sheet. A vertex arrives where the part stands, and is read back into the disc's own terms first.
function unfolded([placedX, placedY, placedZ]) {
  const x = placedX - CENTRING[0],
    y = placedY - CENTRING[1],
    z = placedZ - CENTRING[2],
    across = (x - LABEL.left) / LABEL_WIDTH,
    onStrip = y <= -HAIRLINE,
    onSideOne = z > THICKNESS / 2

  if (onStrip) {
    const fallen = THICKNESS - PAPER_SUNK - z

    return [across, (PAPER_DEPTH + fallen) / SHEET_DEPTH]
  }

  if (onSideOne) {
    return [across, (LABEL.fromLabelEnd - y) / SHEET_DEPTH]
  }

  return [across, (PAPER_DEPTH + STRIP_HEIGHT + HAIRLINE + y) / SHEET_DEPTH]
}

function buildLabel() {
  const sideOne = buildPaper(THICKNESS - PAPER_SUNK - LABEL_THICKNESS),
    sideTwo = buildPaper(PAPER_SUNK),
    strip = buildStrip(),
    sheet = makeCompound([sideOne, sideTwo, strip])

  return {
    name: LABEL_PRINT,
    shape: sheet.translate(CENTRING),
    material: PAPER,
    mapping: unfolded,
    print: LABEL_PRINT
  }
}

function drawRectangle({ left, top, right, bottom }, colour) {
  return `<rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" fill="${colour}"/>`
}

function drawBand([top, bottom], colour, width) {
  return drawRectangle({ left: 0, top, right: width, bottom }, colour)
}

function drawLinedBox({ left, top, right, bottom, line }, fill) {
  const inset = line / 2

  return `<rect x="${left + inset}" y="${top + inset}" width="${right - left - line}" height="${bottom - top - line}" fill="${fill}" stroke="${LABEL_BLACK}" stroke-width="${line}"/>`
}

function listPoints(points) {
  const pairs = points.map(([x, y]) => `${x},${y}`)

  return pairs.join(" ")
}

function drawWord({ word, left, width, baseline, capHeight, weight }, ink) {
  const size = capHeight / HEROS_CAP_HEIGHT

  return `<text x="${left}" y="${baseline}" font-family="${HEROS}" font-size="${size}" font-weight="${weight}" fill="${ink}" textLength="${width}" lengthAdjust="spacingAndGlyphs">${word}</text>`
}

function drawNumber({ word, pen, baseline, capHeight }) {
  const size = capHeight / HEROS_CAP_HEIGHT

  return `<text x="${pen}" y="${baseline}" font-family="${HEROS}" font-size="${size}" fill="${LABEL_BLACK}">${word}</text>`
}

function drawLettering([across, down]) {
  const [shadowAcross, shadowDown] = LOGOTYPE.shadow,
    edged = LOGOTYPE.stroke + 2 * LOGOTYPE.edge,
    lines = LOGOTYPE.strokes.map(points => `<polyline points="${listPoints(points)}"/>`),
    ring = `<polygon points="${listPoints(LOGOTYPE.ring)}"/>`,
    strokes = [...lines, ring].join("")

  return [
    `<g transform="translate(${across + shadowAcross} ${down + shadowDown})" fill="none" stroke="${LABEL_BLACK}" stroke-width="${edged}" stroke-linejoin="bevel">${strokes}</g>`,
    `<g transform="translate(${across} ${down})" fill="none" stroke="${LABEL_PAPER}" stroke-width="${LOGOTYPE.stroke}" stroke-linejoin="bevel">${strokes}</g>`
  ].join("\n")
}

function drawRegistered([x, y]) {
  const radius = (REGISTERED.diameter - REGISTERED.ring) / 2,
    size = REGISTERED.capHeight / HEROS_CAP_HEIGHT,
    baseline = y + REGISTERED.capHeight / 2

  return [
    `<circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="${LABEL_BLACK}" stroke-width="${REGISTERED.ring}"/>`,
    `<text x="${x}" y="${baseline}" font-family="${HEROS}" font-size="${size}" text-anchor="middle" fill="${LABEL_BLACK}">R</text>`
  ].join("\n")
}

function drawBoxedArrow({ box, arrow }) {
  const { axis, tip, headBase, headWidth, shaft, end } = arrow,
    corners = [
      [axis, tip],
      [axis + headWidth / 2, headBase],
      [axis + shaft / 2, headBase],
      [axis + shaft / 2, end],
      [axis - shaft / 2, end],
      [axis - shaft / 2, headBase],
      [axis - headWidth / 2, headBase]
    ]

  return [
    drawLinedBox(box, LABEL_PAPER),
    `<polygon points="${listPoints(corners)}" fill="${LABEL_BLACK}"/>`
  ].join("\n")
}

function drawCfMark() {
  const { box, curve, bar } = CF_MARK,
    [headAcross, headDown] = CF_MARK.head,
    bottomArm = CF_MARK.top + 2 * curve.radius,
    stroke = `M ${CF_MARK.armEnd} ${CF_MARK.top} H ${curve.x} A ${curve.radius} ${curve.radius} 0 0 0 ${curve.x} ${bottomArm} H ${CF_MARK.foot} L ${headAcross} ${headDown} H ${CF_MARK.topBarEnd}`,
    barRadius = bar.thickness / 2,
    barBody = {
      left: bar.left + barRadius,
      top: bar.middle - barRadius,
      right: bar.right,
      bottom: bar.middle + barRadius
    }

  return [
    drawLinedBox(box, "none"),
    `<path d="${stroke}" fill="none" stroke="${LABEL_BLACK}" stroke-width="${CF_MARK.stroke}" stroke-linejoin="round"/>`,
    drawRectangle(barBody, LABEL_BLACK),
    `<circle cx="${barBody.left}" cy="${bar.middle}" r="${barRadius}" fill="${LABEL_BLACK}"/>`
  ].join("\n")
}

function drawSide(side) {
  const rules = LABEL_RULES.at.map(function (at) {
    return drawBand(
      [at - LABEL_RULES.thickness / 2, at + LABEL_RULES.thickness / 2],
      LABEL_BLACK,
      LABEL_WIDTH
    )
  })

  return [
    drawBand(LABEL_BANDS.red, LABEL_RED, LABEL_WIDTH),
    drawBand(LABEL_BANDS.rule, LABEL_BLACK, LABEL_WIDTH),
    ...rules,
    drawBand(LABEL_BANDS.black, LABEL_BLACK, LABEL_WIDTH),
    drawBand(LABEL_BANDS.silver, LABEL_SILVER, LABEL_WIDTH),
    drawLettering(side.lettering),
    drawRegistered(side.registered),
    drawNumber(side.number),
    drawBoxedArrow(side),
    drawWord(LABEL_WORDS.drive, LABEL_PAPER),
    drawCfMark(),
    drawWord(LABEL_WORDS.format, LABEL_BLACK),
    drawWord(LABEL_WORDS.code, LABEL_BLACK)
  ].join("\n")
}

function drawEndMarks(side) {
  const { middle, width } = END_MARKS.triangle,
    half = width / 2,
    halfway = STRIP_HEIGHT / 2,
    corners = [
      [middle, halfway - half],
      [middle + half, halfway + half],
      [middle - half, halfway + half]
    ],
    number = {
      word: side.number.word,
      pen: side.endPen,
      baseline: halfway + END_MARKS.capHeight / 2,
      capHeight: END_MARKS.capHeight
    }

  return [
    `<polygon points="${listPoints(corners)}" fill="${LABEL_BLACK}"/>`,
    drawNumber(number)
  ].join("\n")
}

function drawStrip() {
  const sideOne = drawEndMarks(LABEL_SIDE_1_ART),
    sideTwo = drawEndMarks(LABEL_SIDE_2_ART),
    turned = `rotate(180 ${LABEL_WIDTH / 2} ${STRIP_HEIGHT / 2})`

  return [sideOne, `<g transform="${turned}">${sideTwo}</g>`].join("\n")
}

// The label as it was printed and before it was folded: side 1, the strip that turns round the label end, and side 2, which stands on the sheet turned about, as it does on the disc.
function drawSheet() {
  const sideTwoPlace = `translate(0 ${PAPER_DEPTH + STRIP_HEIGHT}) rotate(180 ${LABEL_WIDTH / 2} ${PAPER_DEPTH / 2})`

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${LABEL_WIDTH}" height="${SHEET_DEPTH}" viewBox="0 0 ${LABEL_WIDTH} ${SHEET_DEPTH}">`,
    `<rect width="${LABEL_WIDTH}" height="${SHEET_DEPTH}" fill="${LABEL_PAPER}"/>`,
    drawSide(LABEL_SIDE_1_ART),
    `<g transform="translate(0 ${PAPER_DEPTH})">${drawStrip()}</g>`,
    `<g transform="${sideTwoPlace}">${drawSide(LABEL_SIDE_2_ART)}</g>`,
    "</svg>"
  ].join("\n")
}

export function buildCf2() {
  return {
    tessellation: TESSELLATION,
    parts: [buildCase(), buildShutter(), buildHub(), buildWriteProtectShutters(), buildLabel()],
    prints: [{ name: LABEL_PRINT, language: LANGUAGE, svg: drawSheet(), pixels: LABEL_PIXELS }]
  }
}
