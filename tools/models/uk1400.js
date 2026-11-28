import { SINCLAIR_MARK, drawSinclairMark } from "./sinclair.js"
import { drawCircle, drawRoundedRectangle, makeBox, makeCylinder } from "replicad"

// x runs across from the left side, seen from above with the label end toward you, y back from the label end and z up from the desk, in millimetres.

// Sinclair's "ZX POWER SUPPLY", model UK 1400, which gave the 48K "9 volts DC at 1.4 A unregulated" [A], ZX Spectrum Introduction, ch. 1: https://worldofspectrum.org/ZXSpectrumIntroduction/chapter_one.html. It is a box on its mains lead, "The cord is still attached to the back of the power supply box" [B]: https://www.computerhistory.org/collections/catalog/102732864
// "overall (central box lying flat): 66 mm x 98 mm" [B], Science Museum Group 1985-195/2, read here as its plan: https://collection.sciencemuseumgroup.org.uk/objects/co62580/sinclair-zx-spectrum-microcomputer-1982-1985. Square from above it reads 1.456 times as long as wide [E], on the Bibliothèque nationale's unit, the Spectrum beside it reading its own 233 by 144 within 1%: https://commons.wikimedia.org/wiki/File:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Sinclair_-_ZX_Spectrum._Micro-ordinateur_Sinclair_ZX_Spectrum,_n%C2%B0_de_s%C3%A9rie_022-007502_-_btv1b55013033m_(03_of_43).jpg
// No record gives its height but the Computer History Museum's "3w x 3h x 6l (in)", whole inches that take in its leads' sleeves [B]. Two of the same studio's views, each through a camera solved from the Spectrum beside it, give 60 and 62, and part the base from the lid about 15 up, the base's walls leaning in about 3.5 toward the underside [E]: https://commons.wikimedia.org/wiki/File:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Sinclair_-_ZX_Spectrum._Micro-ordinateur_Sinclair_ZX_Spectrum,_n%C2%B0_de_s%C3%A9rie_022-007502_-_btv1b55013033m_(11_of_43).jpg and https://commons.wikimedia.org/wiki/File:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Sinclair_-_ZX_Spectrum._Micro-ordinateur_Sinclair_ZX_Spectrum,_n%C2%B0_de_s%C3%A9rie_022-007502_-_btv1b55013033m_(12_of_43).jpg. 61 is taken.
// Its edges and corners read rounded, by how much is not read, and four square rubber pads stand near the underside's corners [E]: https://retrorepairsandrefurbs.com/2023/01/31/sinclair-zx-spectrum-psu-repairs/. A rounding of 3, and pads 8 square, 6 in and 1 tall, are guesses.
const WIDTH = 66,
  LENGTH = 98,
  HEIGHT = 61,
  PARTING = 15,
  BASE_LEAN = 3.5,
  ROUNDING = 3,
  PAD = { side: 8, inset: 6, height: 1 }

// On the lid, read square from above on the Bibliothèque nationale's unit, a 220 V EURO 1400, and scaled to the lid's flat, where the UK units photographed carry the same layout [E]: the "sinclair" logotype moulded in relief, black on black, 54 across from 6.1, its feet 85.4 from the label end; "ZX POWER SUPPLY" in red capitals of a regular weight, 3.0 tall, from 6.4 and 37.8 across, on a baseline 77.2 from the label end; and a black label printed red from 7.6 to 36.5 across and 6.5 to 28.4 from the label end. The logotype is drawn as sinclair.js measures it, scaled to that width, where it reads 5.5 tall against the 7.1 its proportions give; the disagreement stands.
// A UK unit's label reads "IN: 240v AC ∿ 50Hz / OUT 9v DC ⎓ AT 1.4A / DISCONNECT FROM MAINS / WHEN NOT IN USE / FOR INDOOR USE ONLY □ / UK1400", the last line bold and larger [E]: https://i0.wp.com/popeymongames.co.uk/wp-content/uploads/2021/02/img_1692-1.jpg?ssl=1. That photograph is oblique and uncalibrated: each piece's span and baseline, and the capitals' heights, are read off it as fractions of the label's width and height, to about a twentieth, and the symbols Heros lacks are drawn, their strokes' width a guess.
const LOGOTYPE = { left: 6.1, width: 54, feet: 85.4 },
  MAKER_LINE = { word: "ZX POWER SUPPLY", left: 6.4, width: 37.8, baseline: 77.2, capHeight: 3 },
  LABEL = { left: 7.6, right: 36.5, front: 6.5, rear: 28.4 },
  LABEL_WORDS = [
    { text: "IN: 240v AC", from: 0.12, to: 0.44, baseline: 0.27 },
    { text: "50Hz", from: 0.62, to: 0.79, baseline: 0.27 },
    { text: "OUT 9v DC", from: 0.09, to: 0.42, baseline: 0.36 },
    { text: "AT 1.4A", from: 0.61, to: 0.79, baseline: 0.36 },
    { text: "DISCONNECT FROM MAINS", from: 0.09, to: 0.95, baseline: 0.49 },
    { text: "WHEN NOT IN USE", from: 0.09, to: 0.67, baseline: 0.59 },
    { text: "FOR INDOOR USE ONLY", from: 0.08, to: 0.85, baseline: 0.68 },
    { text: "UK1400", from: 0.25, to: 0.58, baseline: 0.83, bold: true }
  ],
  LABEL_SYMBOLS = {
    alternating: { from: 0.45, to: 0.61, baseline: 0.27 },
    direct: { from: 0.43, to: 0.6, baseline: 0.36 },
    insulated: { from: 0.86, to: 0.96, top: 0.56, bottom: 0.71 }
  },
  LABEL_CAP_HEIGHT = 0.058,
  LABEL_BOLD_CAP_HEIGHT = 0.082,
  LABEL_STROKE = 0.12

// The DC lead leaves the right side about 15 from the label end, ±4, at the parting line, through a ribbed black sleeve, a flat twin black cable with a red tracer [E], on the studio's views above. Its plug is a coaxial one, 5.5 across with a 2.1 bore [C], https://retrorepairsandrefurbs.com/2023/01/31/sinclair-zx-spectrum-psu-repairs/, against "PWR 2.1 mm co-axial socket" [A], the 48K's service manual, https://spectrumcomputing.co.uk/pub/sinclair/technical-docs/ZXSpectrum48K_ServiceManual.pdf, where World of Spectrum gives the bore as 2.5 [C], https://worldofspectrum.org/faq/reference/hardware.htm; the disagreement stands. Its body reads black, about 8.3 across, and stands about 35 out of the computer's rear [E].
// The sleeve's size, the cable's, the barrel's length, how the body parts from its relief, and how the lead lies are not read: a sleeve 7 across and 10 long, a round cable 3.5 across for the flat twin, a barrel 9.5 long, a body 26 long and a relief 15 tapering from 6 to the cable, and a lead lying loose, are guesses. The lead's length is not found. The mains lead, which runs off the desk, is not drawn.
const DC_EXIT = { fromLabelEnd: 15, height: PARTING },
  SLEEVE = { diameter: 7, length: 10 },
  DC_PLUG = { barrel: 5.5, barrelLength: 9.5, body: 8.3, length: 26, reliefStart: 6, relief: 15 },
  DC_LEAD = { cable: 3.5, coil: 3.5, turns: 0 },
  CORD = "dc-lead"

// The case and the leads read black, the case at 0.83 to 0.87 of the Spectrum's top's light beside it on the photograph from above [E], and taken at #2b2c2d. The logotype's relief is drawn in the Spectrum's own relief's inks, the label's black darker than the case, the red the Spectrum's template's, the pads and the leads darker than the case, and the barrel nickel: guesses.
const CASE = { name: "case", colour: "#2b2c2d" },
  PAD_RUBBER = { name: "pad", colour: "#202021" },
  LEAD_BLACK = { name: "lead", colour: "#1c1c1d" },
  NICKEL = { name: "nickel", colour: "#a3a199" },
  LID_PLATE = { name: "lid", colour: CASE.colour },
  RELIEF_FACE = "#252526",
  RELIEF_GAP = "#171617",
  LABEL_BLACK = "#131314",
  RED_INK = "#d65653"

// A printed part carries a material of its own, because the page inks its print over the material it finds.
const LID_PRINT = "lid"

// The lid's print lies on a plate as thin as can carry it, printed at twenty pixels to the millimetre so that the label's small capitals come out clean: choices of drawing.
const HEROS = "TeX Gyre Heros",
  HEROS_CAP_HEIGHT = 0.729,
  PRINT_PIXELS = 20,
  PLATE_THICKNESS = 0.2

// How far the triangles may stray from a curved face, in millimetres, and turn from one another along it, in radians: a choice of how finely to draw, not a figure of the machine.
const TESSELLATION = { tolerance: 0.1, angularTolerance: 0.5 }

// A cut runs this far past the faces it opens, so the kernel is never left two coplanar faces to join.
const OVERRUN = 1

const CENTRING = [-WIDTH / 2, -LENGTH / 2, 0],
  ENGLISH = "en"

// The lid's flat, inside its rounded edges, which the printed plate covers.
const FLAT = { left: ROUNDING, right: WIDTH - ROUNDING, front: ROUNDING, rear: LENGTH - ROUNDING }

function centred(place) {
  return place.map((value, axis) => value + CENTRING[axis])
}

function centredFace({ left, right, front, rear }) {
  return {
    left: left + CENTRING[0],
    right: right + CENTRING[0],
    front: front + CENTRING[1],
    rear: rear + CENTRING[1]
  }
}

function outlineAt(inset, z) {
  return drawRoundedRectangle(WIDTH - 2 * inset, LENGTH - 2 * inset, ROUNDING)
    .translate(WIDTH / 2, LENGTH / 2)
    .sketchOnPlane("XY", z)
}

// The base leans in toward the underside; the lid stands upright, its top's edges rounded.
function buildCase() {
  const footing = outlineAt(BASE_LEAN, PAD.height),
    parting = outlineAt(0, PARTING),
    base = footing.loftWith(parting, { ruled: true }),
    top = HEIGHT - PLATE_THICKNESS,
    upright = outlineAt(0, PARTING).extrude(top - PARTING),
    lid = upright.fillet(ROUNDING, edge => edge.inPlane("XY", top)),
    whole = base.fuse(lid)

  return { name: "case", shape: whole.translate(CENTRING), material: CASE }
}

function buildPads() {
  const low = BASE_LEAN + PAD.inset,
    across = [low, WIDTH - low - PAD.side],
    along = [low, LENGTH - low - PAD.side],
    pads = across.flatMap(x =>
      along.map(y => makeBox([x, y, 0], [x + PAD.side, y + PAD.side, PAD.height + OVERRUN]))
    ),
    all = pads.reduce((whole, pad) => whole.fuse(pad))

  return { name: "pads", shape: all.translate(CENTRING), material: PAD_RUBBER }
}

function buildLidPlate() {
  const { left, right, front, rear } = FLAT,
    plate = makeBox([left, front, HEIGHT - PLATE_THICKNESS], [right, rear, HEIGHT])

  return {
    name: LID_PRINT,
    shape: plate.translate(CENTRING),
    material: LID_PLATE,
    face: centredFace(FLAT),
    print: LID_PRINT
  }
}

function buildSleeve() {
  const sleeve = makeCylinder(
    SLEEVE.diameter / 2,
    SLEEVE.length + OVERRUN,
    [WIDTH - OVERRUN, DC_EXIT.fromLabelEnd, DC_EXIT.height],
    [1, 0, 0]
  )

  return { name: `${CORD}-sleeve`, shape: sleeve.translate(CENTRING), material: LEAD_BLACK }
}

function plugSection(diameter, y) {
  return drawCircle(diameter / 2).sketchOnPlane("XZ", -y)
}

// The lead runs on from the sleeve's tip. The plug is drawn about its shoulder, its barrel ahead along y and its tail behind, where the lead leaves it, and stowed inside the case, where it adds nothing to the supply's bounds: the desk lays it in the computer's socket.
function buildDcLead() {
  const { barrel, barrelLength, body, length, reliefStart, relief } = DC_PLUG,
    tail = -(length + relief),
    barrelShape = makeCylinder(barrel / 2, barrelLength, [0, 0, 0], [0, 1, 0]),
    moulding = makeCylinder(body / 2, length, [0, -length, 0], [0, 1, 0]),
    reliefFront = plugSection(reliefStart, -length),
    reliefEnd = plugSection(DC_LEAD.cable, tail),
    strainRelief = reliefFront.loftWith(reliefEnd, { ruled: true }),
    plug = moulding.fuse(strainRelief),
    tip = centred([WIDTH + SLEEVE.length, DC_EXIT.fromLabelEnd, DC_EXIT.height]),
    stowed = centred([WIDTH / 2, LENGTH / 2, HEIGHT / 2])

  return [
    { name: `${CORD}-tip`, place: tip, turn: -90, parts: [] },
    {
      name: CORD,
      place: stowed,
      lead: {
        ...DC_LEAD,
        tip: `${CORD}-tip`,
        tail: `${CORD}-plug-tail`,
        sheath: `${CORD}-sleeve`,
        socket: "9v-dc-mouth"
      },
      parts: [
        { name: `${CORD}-plug`, shape: plug, material: LEAD_BLACK },
        { name: `${CORD}-barrel`, shape: barrelShape, material: NICKEL },
        { name: `${CORD}-plug-tail`, place: [0, tail, 0], parts: [] }
      ]
    }
  ]
}

function fontSize(capHeight) {
  return capHeight / HEROS_CAP_HEIGHT
}

// The label's words and symbols, its spans given as fractions of it.
function drawLabel({ x, y, width, height }) {
  const along = fraction => x + fraction * width,
    down = fraction => y + fraction * height,
    stroke = `stroke="${RED_INK}" stroke-width="${LABEL_STROKE}" fill="none"`,
    words = LABEL_WORDS.map(function ({ text, from, to, baseline, bold = false }) {
      const capHeight = (bold ? LABEL_BOLD_CAP_HEIGHT : LABEL_CAP_HEIGHT) * height,
        weight = bold ? ' font-weight="700"' : ""

      return `<text x="${along(from)}" y="${down(baseline)}" font-family="${HEROS}"${weight} font-size="${fontSize(capHeight)}" textLength="${(to - from) * width}" lengthAdjust="spacingAndGlyphs" fill="${RED_INK}">${text}</text>`
    }),
    capHeight = LABEL_CAP_HEIGHT * height,
    { alternating, direct, insulated } = LABEL_SYMBOLS,
    wave = { left: along(alternating.from), right: along(alternating.to) },
    waveMiddle = down(alternating.baseline) - capHeight / 2,
    waveQuarter = (wave.right - wave.left) / 4,
    current = { left: along(direct.from), right: along(direct.to) },
    currentTop = down(direct.baseline) - capHeight * 0.75,
    currentDashes = down(direct.baseline) - capHeight * 0.25,
    dash = (current.right - current.left) / 5,
    square = {
      left: along(insulated.from),
      right: along(insulated.to),
      top: down(insulated.top),
      bottom: down(insulated.bottom)
    },
    inset = (square.right - square.left) / 4

  return [
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${LABEL_BLACK}"/>`,
    ...words,
    `<path d="M ${wave.left} ${waveMiddle} q ${waveQuarter} ${-capHeight / 2} ${2 * waveQuarter} 0 t ${2 * waveQuarter} 0" ${stroke}/>`,
    `<path d="M ${current.left} ${currentTop} H ${current.right} M ${current.left} ${currentDashes} h ${dash} m ${dash} 0 h ${dash} m ${dash} 0 h ${dash}" ${stroke}/>`,
    `<rect x="${square.left}" y="${square.top}" width="${square.right - square.left}" height="${square.bottom - square.top}" ${stroke}/>`,
    `<rect x="${square.left + inset}" y="${square.top + inset}" width="${square.right - square.left - 2 * inset}" height="${square.bottom - square.top - 2 * inset}" ${stroke}/>`
  ]
}

// The lid's print, its top the logotype's end: across from the flat's left edge and down from its rear.
function drawLid() {
  const width = FLAT.right - FLAT.left,
    depth = FLAT.rear - FLAT.front,
    across = value => value - FLAT.left,
    down = value => FLAT.rear - value,
    scale = LOGOTYPE.width / SINCLAIR_MARK.width,
    blocksTop = LOGOTYPE.feet + SINCLAIR_MARK.height * scale,
    placing = { x: across(LOGOTYPE.left), y: down(blocksTop), scale, below: 0 },
    inks = { face: RELIEF_FACE, gap: RELIEF_GAP, ground: CASE.colour },
    mark = drawSinclairMark(placing, inks),
    labelArea = {
      x: across(LABEL.left),
      y: down(LABEL.rear),
      width: LABEL.right - LABEL.left,
      height: LABEL.rear - LABEL.front
    },
    label = drawLabel(labelArea)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${depth}" viewBox="0 0 ${width} ${depth}">`,
    `<rect width="${width}" height="${depth}" fill="${CASE.colour}"/>`,
    ...mark,
    `<text x="${across(MAKER_LINE.left)}" y="${down(MAKER_LINE.baseline)}" font-family="${HEROS}" font-size="${fontSize(MAKER_LINE.capHeight)}" textLength="${MAKER_LINE.width}" lengthAdjust="spacingAndGlyphs" fill="${RED_INK}">${MAKER_LINE.word}</text>`,
    ...label,
    "</svg>"
  ].join("\n")
}

export function buildUk1400() {
  return {
    tessellation: TESSELLATION,
    parts: [buildCase(), buildPads(), buildLidPlate(), buildSleeve(), ...buildDcLead()],
    prints: [{ name: LID_PRINT, language: ENGLISH, svg: drawLid(), pixels: PRINT_PIXELS }]
  }
}
