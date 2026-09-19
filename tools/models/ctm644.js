import {
  draw,
  drawRectangle,
  drawRoundedRectangle,
  makeBox,
  makeCylinder,
  makeSphere
} from "replicad"

// x runs from the left end, y back from the front face and z up from the desk, in millimetres.

// The monitor is two mouldings over a tube: front cabinet 170841, rear cabinet 170313, the handle 170312 pivoting on the front one, the brightness knob 170304 in the right side, the push button 170305 and the D.C. jack 170844 in the bottom strip, and the C.R.T. 170307 bolted by its four lugs into the front cabinet [A], CPC6128 Service Manual p26, CTM644 cabinet drawing and parts list: https://archive.org/details/Amstrad_CPC6128_Service_Manual_1985_Amstrad_Consumer_Electronics_a
// The amendment manual redraws the same two mouldings as 170841/A and 170313/A for the MkII [A], p28: https://retronik.silicium.org/DOCUMENTS/Info/Amstrad_CPC/Amstrad%20CPC464%206128%20GT65%20CTM644%20MP3%20CT1%20amendment%20service%20manual.pdf
// Neither drawing carries a dimension, so every figure below is Amstrad's overall size or read from photographs.

// "DIMENSIONS (mm): w h d — CTM644 : 375 340 365 / WEIGHTS (kg): … 10.6" [A], CPC6128 Service Manual p31, technical specification.
// radiomuseum.org's record gives 365 × 340 × 350 and 12 kg [C]; the disagreement stands until a real unit is measured.
const WIDTH = 375,
  HEIGHT = 340,
  DEPTH = 365

// Two near-square photographs of a 2020 unit, each rectified on the four outer edges of its front face and scaled by the official 375, agreeing on the face's height over width within 0.5% [E]: https://oldcrap.org
// The face stands 375 × 324, so its lower edge sits 16 above the desk.
const FACE_HEIGHT = 324,
  FACE_BOTTOM = HEIGHT - FACE_HEIGHT

// The face's own contour, traced on the rectified front view: the sides stand within 1.25 of straight, bowing that far outward at mid-height, and the corners are rounded over 6 to 8 at the top and 3 to 4 at the bottom [E]. The bow is left out and the corners fall out of the chamfer and the plinth below.
// The vertical front corners are rounded too, which no square-on view can measure. A three-quarter view reads them soft, but the face's own corners bound how soft, and 8 is taken [E]: https://www.amstrad.eu
const PLAN_RADIUS = 8

// The top front edge steps back about 3 and then chamfers at 45°, about 12 by 9, and the front cabinet is 148 deep, all from one side silhouette at 5.09 pixels to the millimetre [E]. A view standing 10.8° below the face hides that chamfer and shows only a rounding of about 4 along the top front edge, so its run and rise stand unconfirmed.
// Every moulded edge of the machine is softened, but the bezel's own edges read crisp against the light in every photograph; 2 is taken.
const CHAMFER_RUN = 12,
  CHAMFER_RISE = 9,
  FRONT_DEPTH = 148,
  EDGE_RADIUS = 2

// The lit glass reads x 42.2 to 331.2 and, from the face's top, 43.2 to 263.5 — 289.0 by 220.2 about a centre 186.7 across and 153.4 down [E]. Its edges bow outward 1.6 to 5.4, taken straight here.
// That rectangle is where the moulding crops the tube, so it is the opening: the panel is bored to it, and every millimetre of glass inside it is lit picture.
// Its corners read 26.5 to 27.4 on the rectified views [E]. A circle fitted to one close photograph of a running unit gives 45, but that photograph makes the lit area 306 by 216 where the rectified ones make it 289 by 220, so it is not trusted for the corner either.
const APERTURE = {
    left: 42.2,
    right: 331.2,
    bottom: FACE_BOTTOM + FACE_HEIGHT - 263.5,
    top: FACE_BOTTOM + FACE_HEIGHT - 43.2,
    radius: 27
  },
  APERTURE_WIDTH = APERTURE.right - APERTURE.left,
  APERTURE_HEIGHT = APERTURE.top - APERTURE.bottom,
  APERTURE_MIDDLE = [(APERTURE.left + APERTURE.right) / 2, (APERTURE.bottom + APERTURE.top) / 2]

// A cut runs this far past the faces it opens, so the kernel is never left two coplanar faces to join.
const OVERRUN = 1

// Where two surfaces would otherwise meet along a line, one stops this far short of the other.
const HAIRLINE = 0.1

// How far the triangles may stray from a curved face, in millimetres, and turn from one another along it, in radians: a choice of how finely to draw, not a figure of the machine.
const TESSELLATION = { tolerance: 0.1, angularTolerance: 0.5 }

// No outline drawing exists for any of the Orion tubes Amstrad fitted. Philips' A34EAC00X of the same class, 34 cm and 90° with a slotted mask, draws its faceplate "AO R575 approx." [A]: 1986 data book T08, read here as the outer face radius.
// The real tube is wider than the hole it looks through — that class's greatest bulb is 317 by 248 [A], p34 — but only the opening is ever seen, so the glass is cut to the opening and a margin the bezel's lip covers, and it is cut 35 deep, which clears the 29.45 the faceplate falls to the opening's corners.
// How far the apex stands back is settled by parallax between two views whose poses are recovered, 1.46° and 2.82° off the axis: their apparent openings differ by 2.00 across, where a lip 15 deep predicts 2.10 and one 48 deep predicts 6.23 [E]. The lip is 15, bounded 5 to 25. A view along the face shows the glass does not stand proud of the face, which 15 satisfies [E].
// Three makers eleven years apart give that class a minimum useful screen of 280.8 by 210.6 [A]; cpcwiki calls the CTM644's visible screen 34 cm, which is 272 by 204 at four to three [C]. Both are smaller than the opening measured above, and the disagreement stands.
const FACE_RADIUS = 575,
  GLASS_LIP = 15,
  GLASS_MARGIN = 2,
  GLASS_THICKNESS = 35

// How far the faceplate falls from its apex to a point on the opening's edge: 10.64 at the middle of a short edge, 18.45 at a long one, 29.45 at a corner.
function sagitta(across) {
  return FACE_RADIUS - Math.sqrt(FACE_RADIUS ** 2 - across ** 2)
}

// Around the opening the face is a flat band and then a surround falling back to the glass. On the rectified front view the band reads 14.75 across at the left, 13.25 at the right, 16 at the top and 8.5 at the bottom, and behind it three surfaces in the same order on all four sides: an outer one 9 to 12 across, an inner one 8 to 12.75, and a groove 3 to 5 [E].
// None of the three is a wall: a wall 48 deep would show only 1.2 across in a view standing 1.46° off the axis, where 10.5 is measured [E]. How far each falls is not measured, so they share the fall in the proportions their shading implies — the outer one takes most of it, which is why it reads #1b1f22 against the face's #4e5357 in the same photograph while the inner one reads between the two.
// The fall itself is the tube's: the surround lands on the glass at the middle of a short edge of the opening, a hair in front of it. At the long edges and the corners the glass has dropped further, so a straight bore stands open behind the surround — 7.8 at a long edge, 18.8 at a corner. That is the dark line drawn round the picture in every photograph, thickening into the corners.
const SURROUND = [
  { across: 10.5, share: 20 },
  { across: 12.75, share: 6 },
  { across: 3.25, share: 3.5 }
]

const FUNNEL_REACH = SURROUND.reduce((across, surface) => across + surface.across, 0),
  FUNNEL_SHARES = SURROUND.reduce((shares, surface) => shares + surface.share, 0),
  FUNNEL_DEPTH = GLASS_LIP + sagitta(APERTURE_HEIGHT / 2) - HAIRLINE

// The picture is the whole beam path the machine draws: 1024 samples by 312 lines [A], CPC_FRAMEBUFFER_WIDTH and CPC_FRAMEBUFFER_HEIGHT in the emulator's src/cpc.h. The figures below stand in a raster of twice those lines, where a sample is square, because that is the raster they were measured on — a `--full-raster` capture, which draws each line twice "so the image stands at the proportions a screen had" [A], its own docs/command-line.en.md.
// Of that doubled raster the beam sweeps columns 192 to 991 and rows 48 to 619, which is rows 24 to 309.5 of the machine's own 312; everything outside is sync and blanking, which no phosphor sees [E], measured on the capture itself. The emulator's own smaller crop, "the window a monitor shows", is not that sweep: a real tube paints wider and taller, and shows more border than the crop holds.
// A real unit shows no dark margin — the border reaches the bezel's opening on all four sides [M] — so the sweep is laid centred on the opening and covering its height exactly, its width overrunning at 308.0 against 289.0 and clipped as an overscanning tube's is. The blanking falls outside the opening and is never seen, and so does the glass the bezel hides.
// The service manual sets the raster by the paper instead, "Adjust VR406 to obtain paper edge to be 145mm" [A], the 200 lines of a text page. Covering the opening makes that page 154.0, and the disagreement stands until a real unit is measured.
const RASTER = { columns: 1024, rows: 624 },
  SWEPT = { left: 192, columns: 800, top: 48, rows: 572 },
  PIXEL = APERTURE_HEIGHT / SWEPT.rows,
  SWEPT_MIDDLE = [SWEPT.left + SWEPT.columns / 2, SWEPT.top + SWEPT.rows / 2]

// The same side silhouette, behind the face and below the top: a shoulder from 148 to 185 and 34 down, the top sloping 19° to 274 and 65 down, an upper rear face about 290, the neck box from 288 and 108 down to 327 and 118 down, its end about 365 and 209 down, a lower rear face about 311 to 309 down, then a bevel to an underside 331 to 336 down [E].
// Across, the rear face reads about 315 and the neck box about 138, both ±10% [E]. The rear cabinet is taken to run straight from the front cabinet's full width to that rear face, which is the taper the three-quarter view shows; its corners are rounded as the front's are.
// No view measures how the silhouette's own corners are softened: 20 is taken at the two shoulders and 10 where the top meets the rear face, which is as much as the 16 between them allows.
const REAR_WIDTH = 315,
  NECK_WIDTH = 138,
  NECK_RADIUS = 25,
  SHOULDER = [185, HEIGHT - 34],
  SLOPE_END = [274, HEIGHT - 65],
  UPPER_REAR = 290,
  NECK_TOP = HEIGHT - 118,
  NECK_BOTTOM = HEIGHT - 209,
  LOWER_REAR = 311,
  LOWER_REAR_BOTTOM = HEIGHT - 309,
  REAR_BEVEL = 12,
  SHOULDER_RADIUS = 20,
  REAR_TOP_RADIUS = 10

// The plinth under the face runs x 21 to 354 and stands 11 to 19 tall, and the front feet are about 19 across with their centres 47 and 326 from the left end, 6 to 7 below it [E]. Amstrad's 340 overall, less the face's 324, leaves 16 for both, so the feet are taken at 6.5 and the plinth at the rest.
// How far the plinth stands back is not measured and 10 is taken. The rear view shows a foot near each rear corner, and they are taken at the front pair's spacing, 60 forward of the lower rear face [E].
const PLINTH = { left: 21, right: 354 },
  PLINTH_SET_BACK = 10,
  UNDERSIDE = 6.5,
  FOOT_DIAMETER = 19,
  FOOT_PLACES = [47, 326],
  FOOT_ROWS = [40, LOWER_REAR - 60]

// Below the face's groove at 299.5 the bottom strip carries, left to right, the AMSTRAD panel, the model plate, the 12V DC jack, a seam at 203.5, a plain panel, and the power legend over its square button [E].
// The strip stands back behind the bezel's plane, by how much no view measures; 5 is taken. The jack's hole reads about 8 across about a centre 155.5 along and 28 up, the button 7 by 7.5 with its lower edge 22 up [E]. How deep the hole goes, how far the button stands proud and the recess it stands in are not measured either: 6, 1.5 and 1.5 are taken.
const STRIP_TOP = FACE_BOTTOM + FACE_HEIGHT - 299.5,
  STRIP_SET_BACK = 5,
  STRIP_SEAM = { middle: 203.5, width: 0.8, depth: 1 },
  JACK = { middle: 155.5, height: 28, diameter: 8, depth: 6, pin: 2 },
  POWER_BUTTON = { left: 358, right: 365, bottom: 22, top: 29.5, standing: 1.5, recess: 1.5 }

// The strip's four graphics, measured on the same rectified front view, their heights given from the face's top as the opening's are [E].
// The AMSTRAD wordmark is outlined capitals — a white outline with the moulding's own colour inside — 12.5 tall on a baseline at 318.0, 47.0 across from 31.75, its stroke 0.7 by the rows the outline covers. It stands in a panel recessed into the strip, x 12.4 to 98.4 and 302.8 to 320.6, whose floor reads as the cabinet's own plastic.
// The model plate is darker than the cabinet, x 108.3 to 142.8 and 306.5 to 317.0, its top edge the softest of these readings. On it "CTM 644" stands 3.25 tall on a baseline at 312.0, 27.0 across from 112.0, and "Colour Monitor" 2.25 tall on a baseline at 315.25, 24.0 across from 113.5.
// "12V DC" stands under the jack, 3.0 tall on a baseline at 322.0, 11.5 across from 150.75, and "power" over the button, its lower case 3.5 tall on a baseline at 306.75, 16.25 across from 353.5. Both are printed on the moulding itself, so each is given the thinnest panel that can carry a print, its ink's rectangle grown by 1 so that no stroke falls on an edge.
// Neither recess's depth is measured, and both are taken at the plate's own thickness.
const PLATE_THICKNESS = 0.3,
  LEGEND_MARGIN = 1,
  AMSTRAD_PANEL = { left: 12.4, right: 98.4, top: 302.8, bottom: 320.6 },
  MODEL_PLATE = { left: 108.3, right: 142.8, top: 306.5, bottom: 317 },
  AMSTRAD_WORD = {
    word: "AMSTRAD",
    left: 31.75,
    width: 47,
    capHeight: 12.5,
    baseline: 318,
    stroke: 0.7
  },
  MODEL_WORDS = [
    { word: "CTM 644", left: 112, width: 27, capHeight: 3.25, baseline: 312, weight: 700 },
    {
      word: "Colour Monitor",
      left: 113.5,
      width: 24,
      capHeight: 2.25,
      baseline: 315.25,
      weight: 400
    }
  ],
  DC_WORD = { word: "12V DC", left: 150.75, width: 11.5, capHeight: 3, baseline: 322 },
  POWER_WORD = { word: "power", left: 353.5, width: 16.25, xHeight: 3.5, baseline: 306.75 }

// The brightness control 170304 is a knurled knob low in the right side of the front cabinet, under an embossed legend: a ring about 15 to 18 across, its centre about 20 to 35 above the cabinet's lower edge and 80 to 110 behind the face, all ±30% [E], read on a three-quarter photograph scaled by the 19 foot and against the CPC664 manual's drawing of the same part.
// The recess it turns in, and how far it stands proud, are not measured; 24 across by 3 deep and 2 proud are taken.
const KNOB = {
  fromFace: 95,
  height: UNDERSIDE + 27,
  diameter: 16,
  standing: 2,
  recess: { diameter: 24, depth: 3 }
}

// The handle 170312 pivots on the front cabinet — its two retainers 170314 stand either side of a notch cut in that moulding's top — and folds back flat across the rear cabinet's slope. The rear view gives its bar 172 across; the notch reads about 165 with a floor 18 to 22 down [E].
// It is a U, two arms and a grip, as the exploded view draws it [A], amendment manual p28. Every other figure — how deep the well runs, where along the depth it sits, the bar's own thickness and the width of its arms — is taken.
const HANDLE = {
  width: 172,
  depth: 45,
  thickness: 8,
  arm: 22,
  radius: 8,
  fromFace: 108,
  sunk: 20
}

// Sampled on the front view above, whose backdrop reads neutral, so the readings stand as measured; uncalibrated, good for the hue and no more [E].
const CABINET = { name: "cabinet", colour: "#4e5357" },
  FITTING = { name: "fitting", colour: "#2c2c2f" },
  FOOT = { name: "foot", colour: "#252424" },
  PHOSPHOR = { name: "phosphor", colour: "#0b0c0d" }

// Sampled on the same view, which reads the strip #292f32 where the face reads #4e5357, and corrected by that difference [E]: every legend's ink then passes white, so white is what it is taken for, and the model plate stands a little darker than the cabinet at #464a50.
// A printed part carries a material of its own because the page inks a print over the material it finds, and a material shared with the shell would carry the print onto the shell.
const LEGEND_INK = "#f2f4f4",
  AMSTRAD_FACE = { name: "amstrad-panel", colour: CABINET.colour },
  MODEL_FACE = { name: "model-plate", colour: "#464a50" },
  DC_FACE = { name: "dc-legend", colour: CABINET.colour },
  POWER_FACE = { name: "power-legend", colour: CABINET.colour }

// TeX Gyre Heros stands in for the faces Amstrad printed, as it does on the 6128's plates, its capitals 0.729 of its size, its condensed cut's 0.718 and its lower case 0.523 — Helvetica's x-height, which the family follows: https://www.gust.org.pl/projects/e-foundry/tex-gyre/heros
// Every word is fitted to the width measured for it, so the stand-in's own widths never decide anything.
const HEROS = "TeX Gyre Heros",
  HEROS_CONDENSED = "TeX Gyre Heros Cn",
  HEROS_CAP_HEIGHT = 0.729,
  HEROS_CONDENSED_CAP_HEIGHT = 0.718,
  HEROS_X_HEIGHT = 0.523

// A plate's outlined capitals stand 12.5 tall and want their stroke clean, so the prints are rendered at twelve pixels to the millimetre, as the 6128's plates are.
const PLATE_PIXELS = 12

// Amstrad's own plates carry this English lettering in every market; a Schneider unit is relabelled "Colour Monitor »CTM644«" and is a monitor of its own.
const LANGUAGE = "es",
  AMSTRAD_PRINT = "amstrad-panel",
  MODEL_PRINT = "model-plate",
  DC_PRINT = "dc-legend",
  POWER_PRINT = "power-legend"

const CENTRING = [-WIDTH / 2, -DEPTH / 2, 0]

function apertureOutline(step, depth) {
  return drawRoundedRectangle(
    APERTURE_WIDTH + 2 * step,
    APERTURE_HEIGHT + 2 * step,
    APERTURE.radius + step
  )
    .translate(APERTURE_MIDDLE[0], APERTURE_MIDDLE[1])
    .sketchOnPlane("XZ", -depth)
}

// A sketch is destroyed by the loft it feeds, so each rim is drawn again to open the surface after it.
function buildSurround() {
  const surfaces = []

  let across = FUNNEL_REACH,
    fall = 0,
    rim = apertureOutline(across, fall)

  for (const surface of SURROUND) {
    across -= surface.across
    fall += (surface.share / FUNNEL_SHARES) * FUNNEL_DEPTH

    const inner = apertureOutline(across, fall),
      lofted = rim.loftWith(inner)

    surfaces.push(lofted)
    rim = apertureOutline(across, fall)
  }

  return surfaces.reduce((funnel, surface) => funnel.fuse(surface))
}

function buildBore() {
  const opening = apertureOutline(0, FUNNEL_DEPTH)

  return opening.extrude(-(FRONT_DEPTH - FUNNEL_DEPTH + OVERRUN))
}

function buildFrontShell() {
  const plan = drawRoundedRectangle(WIDTH, 2 * FRONT_DEPTH, PLAN_RADIUS)
      .translate(WIDTH / 2, FRONT_DEPTH)
      .sketchOnPlane("XY")
      .extrude(HEIGHT),
    end = draw([0, FACE_BOTTOM])
      .lineTo([0, HEIGHT - CHAMFER_RISE])
      .customCorner(EDGE_RADIUS)
      .lineTo([CHAMFER_RUN, HEIGHT])
      .customCorner(EDGE_RADIUS)
      .lineTo([FRONT_DEPTH, HEIGHT])
      .lineTo([FRONT_DEPTH, UNDERSIDE])
      .lineTo([PLINTH_SET_BACK, UNDERSIDE])
      .lineTo([PLINTH_SET_BACK, FACE_BOTTOM])
      .close(),
    body = end.sketchOnPlane("YZ").extrude(WIDTH)

  return body.intersect(plan)
}

function buildStripRecess() {
  return makeBox(
    [-OVERRUN, -OVERRUN, FACE_BOTTOM - OVERRUN],
    [WIDTH + OVERRUN, STRIP_SET_BACK, STRIP_TOP]
  )
}

function buildStripSeam() {
  return makeBox(
    [STRIP_SEAM.middle - STRIP_SEAM.width / 2, -OVERRUN, FACE_BOTTOM],
    [STRIP_SEAM.middle + STRIP_SEAM.width / 2, STRIP_SET_BACK + STRIP_SEAM.depth, STRIP_TOP]
  )
}

function buildJackHole() {
  return makeCylinder(
    JACK.diameter / 2,
    JACK.depth + OVERRUN,
    [JACK.middle, -OVERRUN, JACK.height],
    [0, 1, 0]
  )
}

function buildButtonRecess() {
  return makeBox(
    [POWER_BUTTON.left - POWER_BUTTON.recess, -OVERRUN, POWER_BUTTON.bottom - POWER_BUTTON.recess],
    [
      POWER_BUTTON.right + POWER_BUTTON.recess,
      STRIP_SET_BACK + POWER_BUTTON.recess,
      POWER_BUTTON.top + POWER_BUTTON.recess
    ]
  )
}

function heightOf(fromFaceTop) {
  return FACE_BOTTOM + FACE_HEIGHT - fromFaceTop
}

function legendPanel(word, height) {
  return {
    left: word.left - LEGEND_MARGIN,
    right: word.left + word.width + LEGEND_MARGIN,
    top: word.baseline - height - LEGEND_MARGIN,
    bottom: word.baseline + LEGEND_MARGIN
  }
}

function buildPanelRecess(outline) {
  return makeBox(
    [outline.left - HAIRLINE, STRIP_SET_BACK, heightOf(outline.bottom) - HAIRLINE],
    [outline.right + HAIRLINE, STRIP_SET_BACK + PLATE_THICKNESS, heightOf(outline.top) + HAIRLINE]
  )
}

// A printed panel stands on the strip as the tube's face stands in the opening: drawn flat, turned upright, and placed at the depth its own face keeps.
function buildPrintedPanel(print, outline, material, standing) {
  const width = outline.right - outline.left,
    height = outline.bottom - outline.top,
    panel = drawRectangle(width, height).sketchOnPlane("XY").extrude(-PLATE_THICKNESS),
    face = { left: -width / 2, right: width / 2, front: -height / 2, rear: height / 2 },
    place = [
      (outline.left + outline.right) / 2 + CENTRING[0],
      CENTRING[1] + STRIP_SET_BACK - standing,
      heightOf((outline.top + outline.bottom) / 2)
    ]

  return { name: print, shape: panel, material, face, tilt: 90, place, print }
}

// Under the face the plinth stands back from both ends, so the shell is cut away outside it.
function buildPlinthEnds() {
  const left = makeBox(
      [-OVERRUN, PLINTH_SET_BACK, UNDERSIDE],
      [PLINTH.left, FRONT_DEPTH, FACE_BOTTOM]
    ),
    right = makeBox(
      [PLINTH.right, PLINTH_SET_BACK, UNDERSIDE],
      [WIDTH + OVERRUN, FRONT_DEPTH, FACE_BOTTOM]
    )

  return left.fuse(right)
}

function buildKnobRecess() {
  return makeCylinder(
    KNOB.recess.diameter / 2,
    KNOB.recess.depth + OVERRUN,
    [WIDTH - KNOB.recess.depth, KNOB.fromFace, KNOB.height],
    [1, 0, 0]
  )
}

function buildHandleWell() {
  const left = (WIDTH - HANDLE.width) / 2

  return makeBox(
    [left, HANDLE.fromFace, HEIGHT - HANDLE.sunk],
    [left + HANDLE.width, HANDLE.fromFace + HANDLE.depth, HEIGHT + OVERRUN]
  )
}

function buildFrontCabinet() {
  const shell = buildFrontShell(),
    surround = buildSurround(),
    bore = buildBore(),
    cavity = surround.fuse(bore),
    stripRecess = buildStripRecess(),
    stripSeam = buildStripSeam(),
    jackHole = buildJackHole(),
    buttonRecess = buildButtonRecess(),
    amstradRecess = buildPanelRecess(AMSTRAD_PANEL),
    modelRecess = buildPanelRecess(MODEL_PLATE),
    knobRecess = buildKnobRecess(),
    handleWell = buildHandleWell(),
    plinthEnds = buildPlinthEnds(),
    cut = shell
      .cut(cavity)
      .cut(stripRecess)
      .cut(stripSeam)
      .cut(jackHole)
      .cut(buttonRecess)
      .cut(amstradRecess)
      .cut(modelRecess)
      .cut(knobRecess)
      .cut(handleWell)
      .cut(plinthEnds)

  return { name: "front-cabinet", shape: cut.translate(CENTRING), material: CABINET }
}

function buildRearShell() {
  const inset = (WIDTH - REAR_WIDTH) / 2,
    plan = draw([0, FRONT_DEPTH - OVERRUN])
      .lineTo([inset, DEPTH])
      .customCorner(PLAN_RADIUS)
      .lineTo([WIDTH - inset, DEPTH])
      .customCorner(PLAN_RADIUS)
      .lineTo([WIDTH, FRONT_DEPTH - OVERRUN])
      .close()
      .sketchOnPlane("XY")
      .extrude(HEIGHT),
    end = draw([FRONT_DEPTH - OVERRUN, HEIGHT])
      .lineTo(SHOULDER)
      .customCorner(SHOULDER_RADIUS)
      .lineTo(SLOPE_END)
      .customCorner(SHOULDER_RADIUS)
      .lineTo([UPPER_REAR, SLOPE_END[1]])
      .customCorner(REAR_TOP_RADIUS)
      .lineTo([UPPER_REAR, NECK_TOP])
      .lineTo([LOWER_REAR, NECK_BOTTOM])
      .lineTo([LOWER_REAR, LOWER_REAR_BOTTOM])
      .customCorner(EDGE_RADIUS)
      .lineTo([LOWER_REAR - REAR_BEVEL, UNDERSIDE])
      .lineTo([FRONT_DEPTH - OVERRUN, UNDERSIDE])
      .close(),
    body = end.sketchOnPlane("YZ").extrude(WIDTH)

  return body.intersect(plan)
}

// The neck box carries the tube's neck and its socket out past the rear face.
function buildNeckBox() {
  const outline = drawRoundedRectangle(NECK_WIDTH, NECK_TOP - NECK_BOTTOM, NECK_RADIUS)
    .translate(WIDTH / 2, (NECK_BOTTOM + NECK_TOP) / 2)
    .sketchOnPlane("XZ", -DEPTH)

  return outline.extrude(DEPTH - UPPER_REAR + OVERRUN)
}

function buildRearCabinet() {
  const shell = buildRearShell(),
    neck = buildNeckBox(),
    handleWell = buildHandleWell(),
    whole = shell.fuse(neck).cut(handleWell)

  return { name: "rear-cabinet", shape: whole.translate(CENTRING), material: CABINET }
}

function buildHandle() {
  const outer = drawRoundedRectangle(HANDLE.width, HANDLE.depth, HANDLE.radius),
    inner = drawRoundedRectangle(
      HANDLE.width - 2 * HANDLE.arm,
      HANDLE.depth,
      HANDLE.radius
    ).translate(0, HANDLE.arm),
    bar = outer
      .cut(inner)
      .translate(WIDTH / 2, HANDLE.fromFace + HANDLE.depth / 2)
      .sketchOnPlane("XY", HEIGHT - HANDLE.sunk)
      .extrude(HANDLE.thickness)

  return { name: "handle", shape: bar.translate(CENTRING), material: CABINET }
}

function buildPowerButton() {
  const button = makeBox(
    [POWER_BUTTON.left, STRIP_SET_BACK - POWER_BUTTON.standing, POWER_BUTTON.bottom],
    [POWER_BUTTON.right, STRIP_SET_BACK + POWER_BUTTON.recess, POWER_BUTTON.top]
  )

  return { name: "power-button", shape: button.translate(CENTRING), material: FITTING }
}

function buildKnob() {
  const knob = makeCylinder(
    KNOB.diameter / 2,
    KNOB.recess.depth + KNOB.standing,
    [WIDTH - KNOB.recess.depth, KNOB.fromFace, KNOB.height],
    [1, 0, 0]
  )

  return { name: "brightness-knob", shape: knob.translate(CENTRING), material: FITTING }
}

function buildJack() {
  const barrel = makeCylinder(
      JACK.diameter / 2,
      JACK.depth,
      [JACK.middle, STRIP_SET_BACK, JACK.height],
      [0, 1, 0]
    ),
    pin = makeCylinder(
      JACK.pin / 2,
      JACK.depth,
      [JACK.middle, STRIP_SET_BACK, JACK.height],
      [0, 1, 0]
    ),
    socket = barrel.cut(pin)

  return { name: "jack", shape: socket.translate(CENTRING), material: FITTING }
}

// The kernel meshes a sphere on its own poles, so a pole left at the apex rings the middle of the picture with slivers and spends five thousand triangles on one pane. Turned a quarter aside it is the same solid, meshed as a grid.
function buildScreen() {
  const outline = drawRoundedRectangle(
      APERTURE_WIDTH + 2 * GLASS_MARGIN,
      APERTURE_HEIGHT + 2 * GLASS_MARGIN,
      APERTURE.radius + GLASS_MARGIN
    )
      .sketchOnPlane("XY")
      .extrude(-GLASS_THICKNESS),
    turned = makeSphere(FACE_RADIUS).rotate(90, [0, 0, 0], [1, 0, 0]),
    ball = turned.translate([0, 0, -FACE_RADIUS]),
    cap = ball.intersect(outline),
    face = {
      left: -SWEPT_MIDDLE[0] * PIXEL,
      right: (RASTER.columns - SWEPT_MIDDLE[0]) * PIXEL,
      front: (SWEPT_MIDDLE[1] - RASTER.rows) * PIXEL,
      rear: SWEPT_MIDDLE[1] * PIXEL
    },
    place = [APERTURE_MIDDLE[0] + CENTRING[0], CENTRING[1], APERTURE_MIDDLE[1]]

  return { name: "screen", shape: cap, material: PHOSPHOR, face, tilt: 90, place, screen: true }
}

function buildFeet() {
  const feet = []

  for (const row of FOOT_ROWS) {
    for (const place of FOOT_PLACES) {
      const foot = makeCylinder(FOOT_DIAMETER / 2, UNDERSIDE, [place, row, 0], [0, 0, 1])

      feet.push(foot)
    }
  }

  return feet.reduce((standing, foot) => standing.fuse(foot))
}

function fontSize(height, heightPerEm) {
  return height / heightPerEm
}

function drawFittedWord(fitted, height, family, heightPerEm, weight) {
  const size = fontSize(height, heightPerEm)

  return `<text x="${fitted.left}" y="${fitted.baseline}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${LEGEND_INK}" textLength="${fitted.width}" lengthAdjust="spacingAndGlyphs">${fitted.word}</text>`
}

function drawOutlinedWord(fitted) {
  const size = fontSize(fitted.capHeight, HEROS_CONDENSED_CAP_HEIGHT)

  return `<text x="${fitted.left}" y="${fitted.baseline}" font-family="${HEROS_CONDENSED}" font-size="${size}" font-weight="700" fill="none" stroke="${LEGEND_INK}" stroke-width="${fitted.stroke}" textLength="${fitted.width}" lengthAdjust="spacingAndGlyphs">${fitted.word}</text>`
}

// Each print is drawn in the strip's own measurements and shifted into its panel's frame, so that every figure above reads as it was measured.
function drawPanel(outline, backing, drawn) {
  const width = outline.right - outline.left,
    height = outline.bottom - outline.top

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="${backing}"/>`,
    `<g transform="translate(${-outline.left} ${-outline.top})">`,
    drawn,
    "</g>",
    "</svg>"
  ].join("\n")
}

function drawAmstradPanel() {
  const word = drawOutlinedWord(AMSTRAD_WORD)

  return drawPanel(AMSTRAD_PANEL, AMSTRAD_FACE.colour, word)
}

function drawModelPlate() {
  const words = MODEL_WORDS.map(fitted =>
    drawFittedWord(fitted, fitted.capHeight, HEROS, HEROS_CAP_HEIGHT, fitted.weight)
  )

  return drawPanel(MODEL_PLATE, MODEL_FACE.colour, words.join("\n"))
}

function drawDcLegend() {
  const word = drawFittedWord(DC_WORD, DC_WORD.capHeight, HEROS, HEROS_CAP_HEIGHT, 700)

  return drawPanel(legendPanel(DC_WORD, DC_WORD.capHeight), DC_FACE.colour, word)
}

function drawPowerLegend() {
  const word = drawFittedWord(POWER_WORD, POWER_WORD.xHeight, HEROS, HEROS_X_HEIGHT, 700)

  return drawPanel(legendPanel(POWER_WORD, POWER_WORD.xHeight), POWER_FACE.colour, word)
}

export function buildCtm644() {
  const feet = buildFeet(),
    amstradPanel = buildPrintedPanel(AMSTRAD_PRINT, AMSTRAD_PANEL, AMSTRAD_FACE, 0),
    modelPlate = buildPrintedPanel(MODEL_PRINT, MODEL_PLATE, MODEL_FACE, 0),
    dcLegend = buildPrintedPanel(
      DC_PRINT,
      legendPanel(DC_WORD, DC_WORD.capHeight),
      DC_FACE,
      HAIRLINE
    ),
    powerLegend = buildPrintedPanel(
      POWER_PRINT,
      legendPanel(POWER_WORD, POWER_WORD.xHeight),
      POWER_FACE,
      HAIRLINE
    )

  return {
    tessellation: TESSELLATION,
    parts: [
      buildFrontCabinet(),
      buildRearCabinet(),
      buildHandle(),
      buildPowerButton(),
      buildKnob(),
      buildJack(),
      buildScreen(),
      amstradPanel,
      modelPlate,
      dcLegend,
      powerLegend,
      { name: "feet", shape: feet.translate(CENTRING), material: FOOT }
    ],
    prints: [
      { name: AMSTRAD_PRINT, language: LANGUAGE, svg: drawAmstradPanel(), pixels: PLATE_PIXELS },
      { name: MODEL_PRINT, language: LANGUAGE, svg: drawModelPlate(), pixels: PLATE_PIXELS },
      { name: DC_PRINT, language: LANGUAGE, svg: drawDcLegend(), pixels: PLATE_PIXELS },
      { name: POWER_PRINT, language: LANGUAGE, svg: drawPowerLegend(), pixels: PLATE_PIXELS }
    ]
  }
}
