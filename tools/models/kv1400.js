import {
  FaceFinder,
  draw,
  drawRectangle,
  drawRoundedRectangle,
  loft,
  makeBox,
  makeCompound,
  makeCylinder
} from "replicad"

// x runs from the left side, y back from the face and z up from the desk, in millimetres.

// The set is Sony's KV-1400 in its white finish, sold in the UK as the KV-1400UB [C], https://www.service-data.com/section.php/16490/1/kv-1400ub — the set Sinclair stood behind the Spectrum on page 3 of its 1982 brochure [A], known there by its cabinet [E]: https://spectrumforeveryone.com/wp-content/uploads/2020/08/Spectrum-Brochure.pdf
// Sony makes its front mask, cabinet case, lid, carrying handle, volume knob and earphone jack in "gray" and in "white" [A], KV-1400E service manual p19: https://www.manualslib.com/manual/4267546/Sony-Trinitron-Kv-1400e.html?page=19
// No set was measured, and no view of its side or rear was found. Its face was read in proportion on Sony's own catalogue photograph, nearly square-on, at 1.1946 mm a pixel by Sony's width [E], https://www.radiomuseum.org/images/radio/sony_tokyo/kv_1400_e_388185.jpg, and on a level three-quarter view of a white UK set, the camera recovered from its face [E], http://www.gadgetmuseum.org.uk/userdata/PRODPIC-1646.jpg; the two agree within 1 to 3 up the face and 5 to 8 across it.
// A grey set seen close from above with its lid open shows what lies on the top [E]: https://www.radiomuseum.org/images/radio/sony_corporation/kv_1400_e_2590216.jpg

// "Approx. 353 (w) x 377 (h) x 385 (d) mm" [A], the same manual p2: https://www.manualslib.com/manual/4267546/Sony-Trinitron-Kv-1400e.html?page=2 — and "35,3 x 37,7 x 38,5" in Sony's 1979 catalogue [A]: https://www.radiomuseum.org/images/radio/sony_tokyo/kv_1400_e_1719734.jpg
// A collector's white sets measure "37 x 40 x 38 cm (LxHxD)" [D], perhaps over the handle or the antenna, and the disagreement stands: http://www.gadgetmuseum.org.uk/det/1646/Sony-KV-1400-14-Trinitron-TV-(White-Cream)/
const WIDTH = 353,
  HEIGHT = 377,
  DEPTH = 385

const RADIANS = Math.PI / 180

// The face is a flat mask standing 45 to 350 above the desk [E], 303.5 tall on the white set and 306.6 on Sony's photograph. Above it the top's front rises the rest of Sony's height.
const MASK_BOTTOM = 45,
  MASK_TOP = 350

// Seen level on the white set, that front rises 6.3 under the touch pads, 13.6 up the black legend strip and 7.1 above it [E]. Seen from above, the grey set lays the pads on a ledge about 60 deep and leans the strip back about 4 and the band above it 12 [E], rough: that view's tilt was read on the mask's top band, 20 tall.
const LEDGE = { rise: 6.3, run: 60 },
  STRIP = { rise: 13.6, run: 4 },
  UPPER_BAND = { rise: 7.1, run: 12 }

// The rest of the side comes from one model of the white set's camera [E], weak: the side panel's rear edge stands about 337 behind the face, 303 to 384 by what the model assumes; the side's top edge falls from the mask's top to about 335 there, and its lower edge rises to about 52. Traced along the silhouette, the top holds Sony's height to about 130 behind the face and falls from there to about 339 at the rear edge.
const SIDE_DEPTH = 337,
  SIDE_TOP_REAR = 335,
  UNDERSIDE_REAR = 52,
  TOP_FALL_START = 130,
  TOP_REAR = 339

// A bevel joins the top to each side, 55 across and 27 up at the front on the white set [E], 52 to 62; seen from above, Sony's photograph and the grey set make it 30 to 38. Its foot follows the side's top edge, so it narrows almost to nothing toward the rear as the top falls, as it does on the white set.
const BEVEL_ACROSS = 55

// The vertical corners read rounded over 15 to 25 on the white set [E], weak, and 20 is taken; the rear ones, which no view shows, are taken the same.
const CORNER_RADIUS = 20

// The front mask is a tray on the cabinet case, their seam running down each side about 64 behind the face on the white set [E], 59 to 71, and in Sinclair's photograph. They are drawn as one cabinet and the seam as a groove, whose width and depth no view shows: 0.8 and 0.5 are taken.
const SEAM = { behind: 64, width: 0.8, depth: 0.5 }

// In the mask a black frame stands 71 to 330 above the desk and about 318 across, centred, its corners rounded over 3 to 6, of which 4 is taken: 316 across on Sony's photograph and 321 on a grey set photographed close from above, in strong keystone [E]: https://www.radiomuseum.org/images/radio/sony_corporation/kv_1400_e_2590214.jpg
// Through it the glass shows 268 by 203 about a middle 202 above the desk and centred across, its corners rounded over about 10 [E]: Sony's photograph reads 272.2 by 203.7 and the grey set 264 across, and the mean is taken. That is 328 corner to corner, which agrees with Sony's "14" (33 cm Screen measured diagonally)" [A], the manual p2 above. Sony's catalogue gives "36-cm-Bildschirm-Diagonale" [A], above, the bulb's size; and the tube's code, 350, would make it 35 [E], as the KV-1340E's 330AB22 is sold as "33cm (measured diagonally)" [A]: https://archive.org/details/kv-1340e — the disagreement stands.
// The frame is a reveal falling from its outer edge in the mask to the glass [E], its lower slope plain on the white set and in Sinclair's photograph. It is lofted onto the glass's own edge, so it falls deepest at the opening's ends, where the curved glass lies farthest back.
const FRAME = { width: 318, bottom: 71, top: 330, radius: 4 },
  GLASS = { width: 268, height: 203, middle: 202, radius: 10 },
  GLASS_MIDDLE = [WIDTH / 2, GLASS.middle],
  GLASS_BOTTOM = GLASS.middle - GLASS.height / 2

// The tube is a 350LB22 [A], the manual p19 above, with "90° deflection" [A], p2 above, run at "21kV at zero beam current" [A]: https://www.manualslib.com/manual/3463898/Sony-Trinitron-Kv-1400e.html?page=2 — and a Trinitron's grille stands on a frame "completely flat in the vertical direction and curved in the horizontal direction" [A], Sony's CTV-25R1 training manual p11: https://www.manualslib.com/manual/1173519/Sony-Ctv-25r1.html?page=11 — so the glass is a section of an upright cylinder.
// No document gives the 350LB22's radius. On the white set the glass's lower edge falls away from the frame toward its ends by what a radius of 250 to 500 would give [E], a reading too weak to stand on; 500, the flattest it allows, is taken, and it is a guess.
// The same view puts the glass about 20 behind the face at the frame's sides [E], 10 to 25, so its apex stands 1.7 behind. Behind the reveal the opening runs on as a bore 30 back from the face, past the glass at its ends; the glass is cut to the opening and a margin the reveal and the bore hide, and 25 thick, which clears the 18.9 its face falls to the margin.
const FACE_RADIUS = 500,
  GLASS_SIDE_SETBACK = 20,
  BORE_DEPTH = 30,
  GLASS_MARGIN = 2,
  GLASS_THICKNESS = 25

// How far the face falls behind its apex at a distance across from its middle.
function sagitta(across) {
  return FACE_RADIUS - Math.sqrt(FACE_RADIUS ** 2 - across ** 2)
}

const GLASS_APEX = GLASS_SIDE_SETBACK - sagitta(GLASS.width / 2)

// The picture is the whole beam path the 48K draws, 448 samples by 312 lines, its paper at samples 144 to 399 and lines 56 to 247 [A], the emulator's cli/main.c: https://github.com/tulinmola/colophon-emulator/blob/0acb962/cli/main.c — a sample is one of the Spectrum's pixels.
// How much of it a television of the day showed was never measured on one. PAL's active line lasts 52 µs [C], https://en.wikipedia.org/wiki/Overscan, and the 48K's pixels come at 7 MHz [D], https://web.archive.org/web/2023id_/http://www.zxdesign.info/vidparam.shtml, so 364 of them fill it. Read off photographs of Spectrums on sets, 320 across is "on edge or even too much", and an owner remembers a border "about 5 characters wide", about 336 across [D]: https://spectrumcomputing.co.uk/forums/viewtopic.php?p=127121 — and a review gives Sony's KV-1430 a "Resolution 320 x 250" without saying how [B]: https://archive.org/download/Personal-Computer-News/PersonalComputerNews090-08Dec1984.pdf
// The glass is taken to show 320 by 256 centred on the paper, which draws the pixels within 1% of the shape a PAL screen gives them [E]. It is a guess.
const RASTER = { columns: 448, rows: 312 },
  SHOWN = { left: 112, columns: 320, top: 24, rows: 256 },
  SHOWN_MIDDLE = [SHOWN.left + SHOWN.columns / 2, SHOWN.top + SHOWN.rows / 2],
  SAMPLE = GLASS.width / SHOWN.columns,
  LINE = GLASS.height / SHOWN.rows

// The black legend strip runs 39.8 to 313.3 across its foot and 44.4 to 308.6 across its head, read on the white set through a perspective fitted to the legends standing over the pads [E], within 3; Sony's photograph makes it 41 to 318.
const STRIP_FOOT = { left: 39.8, right: 313.3 },
  STRIP_HEAD = { left: 44.4, right: 308.6 }

// Eight touch pads 16.45 apart, the first centred 143.6 from the left [E], Sony's photograph. The grey set seen from above shows each a dark frame about 7.5 across round two contacts, about 18 long and centred about 32 up the ledge [E], rough, and the white set puts them about 30 before the legends, which agrees. The frame's rounding and the contacts' size are taken.
const PADS = {
  first: 143.6,
  pitch: 16.45,
  count: 8,
  width: 7.5,
  length: 18,
  along: 32,
  radius: 1.5,
  contact: { width: 1.2, length: 14, apart: 3.2 }
}

// The white set's strip reads VOLUME, then over the pads BBC-1 BBC-2 ITV-1 ITV-2 ✱ ✱ ✱ VTR, then POWER beside its button [E], on one line whose middle stands 0.45 down the strip, about 2.2 tall. Through the same fit each word reads about 1 wider than its ink for the photograph's blur, which is taken off: VOLUME 12 about 56 across, the channel names 7.8, the marks 3.5, VTR 4.5, and POWER 9.8 about 275.5 [E].
// The volume scale's ticks hang 0.31 down the strip from its head, two at 69.7 and 76.2 and six from 90.7 at 4.05 pitch [E]; their width, 0.6, is taken, as is the marks' stroke.
const LEGEND_LINE = 0.45,
  LEGEND_HEIGHT = 2.2,
  CHANNELS = [
    { word: "BBC-1", width: 7.8 },
    { word: "BBC-2", width: 7.8 },
    { word: "ITV-1", width: 7.8 },
    { word: "ITV-2", width: 7.8 },
    { word: "✱", width: 3.5 },
    { word: "✱", width: 3.5 },
    { word: "✱", width: 3.5 },
    { word: "VTR", width: 4.5 }
  ],
  MARK = { word: "✱", stroke: 0.6 },
  END_WORDS = [
    { word: "VOLUME", middle: 56, width: 12 },
    { word: "POWER", middle: 275.5, width: 9.8 }
  ],
  TICKS = { places: [69.7, 76.2], first: 90.7, pitch: 4.05, count: 6, drop: 0.31, width: 0.6 }

// The volume knob slides along the strip; on the white set and in Sinclair's photograph it stands past the second tick, 7.1 across about 82.2 [E], and Sony makes it white for the white set [A], p19 above. It covers the strip's height on the white set and is drawn its whole height; how far it stands proud is not seen, and 5 is taken.
// The POWER button is a pale bar 13.6 across about 288.5 [E], Sony's photograph reading 13 about 291, 4 to 6 tall with its middle 0.43 down the strip [E]; 5 is taken, and it stands 1.5 proud, which is taken.
const KNOB = { middle: 82.2, width: 7.1, standing: 5 },
  POWER_BUTTON = { middle: 288.5, width: 13.6, height: 5, drop: 0.43, standing: 1.5 }

// The TRINITRON badge, on the mask below the frame: three ovals, red, green and blue, about 9.5 by 4 at 12 pitch, then the word in capitals about 4 tall, all on a line about 60 above the desk [E]. Through the white set's camera the ovals run 36.4 to 71.3 and the word 74.8 to 107.6 [E]; Sony's photograph reads the whole badge 32.9 to 116.5.
const BADGE = {
  ovals: [41.5, 53.5, 65.5],
  oval: { across: 9.5, height: 4 },
  word: "TRINITRON",
  left: 74.8,
  width: 32.8,
  capHeight: 4,
  line: 60
}

// Sinclair's photograph shows no plate under the glass, which may have been retouched away with the picture stripped onto it. Sony's parts list has an "Emblem, SONY" for both finishes [A], p19 above, and Sony's photograph and the white set both carry it: a black plate about 41 by 9 centred under the glass, its middle 89 above the desk, its letters about 36 across and 0.6 of its height [E]. Sony's photograph reads the letters 158 to 194 and the white set the plate 151 to 192.
// It sits on the reveal's lower slope and stands 1 proud of it, which is taken; it runs a little into the reveal, whose slope twists under its ends.
const EMBLEM = {
  width: 41,
  height: 9,
  middle: 89,
  word: "SONY",
  letters: 36,
  capHeight: 5.5,
  standing: 1,
  sunk: 0.5
}

// The cabinet stands on a plinth 30 tall whose front and ends lean in toward the desk [E]. Sony's photograph has it 300 across 6 below the mask, and on the white set its ribs fall back about 19 over 24 of its height [E]: its ends are taken 24 in from the sides under the mask and 30 at its foot, its front 10 behind the face there and 34 at its foot. The white set shows its corners cut in plan, by about 30, and no view reaches its rear, which is taken as its front.
// Its loft runs on into the cabinet, past the underside at the rear.
// The feet are blocks 15 tall under its corners [E], the white set, about 34 across [E], rough; Sinclair's photograph and the white set each show one near a rear corner.
const PLINTH = { top: { side: 24, end: 10 }, foot: { side: 30, end: 34 }, corner: 30, buried: 56 },
  FOOT = { height: 15, across: 34 }

// The speaker, "12 x 8cm" [A], p2 above, sounds through vertical ribs across the plinth's front from about 80 to 230 [E], the white set, about 5.8 apart there [E]. How wide and deep the grooves between them run is not seen: 2.5 and 1.5 are taken, and they stop 1.5 short of the mask.
const GRILLE = { left: 80, right: 230, pitch: 5.8, groove: 2.5, depth: 1.5, margin: 1.5 }

// Sony's catalogue gives the set a "versenkbarer Tragegriff", a carrying handle that sinks into the top [A], above. Sinclair's photograph and the grey set from above show its well about 190 across and 24 from front to back, about 190 behind the face [E], rough. How deep the well runs and how the handle lies in it are not seen: 12, and a bar 8 tall on its floor and 2 clear of its walls, are taken.
// In front of it a lid over the presets lies flush in the top and is not drawn, nor is the telescopic antenna, which no view shows folded.
const HANDLE_WELL = { across: 190, depth: 24, behind: 190, sunk: 12 },
  HANDLE = { clearance: 2, thickness: 8 }

// Sinclair's photograph shows two slots low in the left side, about 13 behind the seam, 3 across and 10 tall, their middles 84 and 106 above the desk [E], rough: the earphone jack, which Sony makes in the cabinet's colour [A], p19 above. They are taken 5 deep.
const EARPHONE = { behind: SEAM.behind + 13, across: 3, height: 10, middles: [84, 106], depth: 5 }

// No view shows the rear. Sony's 385 reaches 48 past the side panel [E], and what fills it is drawn as a rear cover over the tube's neck, centred on the glass, 240 by 220 where it leaves the cabinet and 200 by 180 at its end, its corners rounded over 25: all taken.
// Sony names a 75 Ω aerial socket [A], https://www.manualslib.com/manual/3463898/Sony-Trinitron-Kv-1400e.html?page=2, a cord anchor, and a rear cover held by "all the screws around it" [A]: https://www.manualslib.com/manual/4267546/Sony-Trinitron-Kv-1400e.html?page=6 — none is drawn.
const REAR_COVER = {
  start: { width: 240, height: 220 },
  end: { width: 200, height: 180 },
  radius: 25
}

// Sinclair's photograph is a halftone print; balanced to its own paper, its white reads #d3ccca [E], and surviving sets have yellowed to #f8ecda and #ead0b2. The strip, the frame and the emblem read black, #272a28 on the white set, and its POWER button #bdbeb6 [E]. No frame holds a card: each is good for the hue and no more, and a guess. The jack's slots are taken as dark as the other sets' insides, and the glass as dark as their tubes'.
const CABINET = { name: "cabinet", colour: "#d3ccca" },
  BEZEL = { name: "bezel", colour: "#272a28" },
  BUTTON = { name: "power-button", colour: "#bdbeb6" },
  INSIDE = { name: "inside", colour: "#141414" },
  PHOSPHOR = { name: "phosphor", colour: "#0b0c0d" }

// The emblem's letters read no lighter than #b0a69d on the white set; the strip's lettering is too fine there to sample and is taken the same. The badge's ovals read #be301a, #3f6b05 and #134c5f, and its word black [E]. These are guesses as the colours above are.
// A printed part carries a material of its own because the page inks a print over the material it finds, and a material shared with the shell would carry the print onto the shell.
const LEGEND_INK = "#b0a69d",
  OVAL_INKS = ["#be301a", "#3f6b05", "#134c5f"],
  WORD_INK = BEZEL.colour,
  CONTROL_FACE = { name: "control-panel", colour: BEZEL.colour },
  SENSOR_FACE = { name: "sensor-pads", colour: CABINET.colour },
  BADGE_FACE = { name: "badge", colour: CABINET.colour },
  EMBLEM_FACE = { name: "sony-emblem", colour: BEZEL.colour }

// Sony's lettering, its TRINITRON word mark and its slab-serif SONY are its own; TeX Gyre Heros stands in, its capitals 0.729 of its size, and every word is fitted to the width measured for it: https://www.gust.org.pl/projects/e-foundry/tex-gyre/heros
const HEROS = "TeX Gyre Heros",
  HEROS_CAP_HEIGHT = 0.729

const LANGUAGE = "en",
  CONTROL_PRINT = "control-panel",
  SENSOR_PRINT = "sensor-pads",
  BADGE_PRINT = "badge",
  EMBLEM_PRINT = "sony-emblem"

// A printed part is the thinnest plate that can carry a print, sunk flush into the moulding, its rectangle grown by 1 so that no stroke falls on an edge; the strip's lettering wants its strokes clean at twelve pixels to the millimetre, as the other sets' do.
const PLATE_THICKNESS = 0.3,
  PLATE_MARGIN = 1,
  PLATE_PIXELS = 12

// A cut runs this far past the faces it opens, so the kernel is never left two coplanar faces to join.
const OVERRUN = 1

// How far the triangles may stray from a curved face, in millimetres, and turn from one another along it, in radians: a choice of how finely to draw, not a figure of the machine.
const TESSELLATION = { tolerance: 0.1, angularTolerance: 0.5 }

const LEDGE_END = [LEDGE.run, MASK_TOP + LEDGE.rise],
  STRIP_HEAD_EDGE = [LEDGE_END[0] + STRIP.run, LEDGE_END[1] + STRIP.rise],
  TOP_FRONT = [STRIP_HEAD_EDGE[0] + UPPER_BAND.run, STRIP_HEAD_EDGE[1] + UPPER_BAND.rise],
  STRIP_LENGTH = Math.hypot(STRIP.rise, STRIP.run),
  TOP_FALL = (HEIGHT - TOP_REAR) / (SIDE_DEPTH - TOP_FALL_START)

// The reveal's lower slope at the middle of the opening, where the emblem stands, and how far up that slope the emblem's middle lies.
const FLOOR = { rise: GLASS_BOTTOM - FRAME.bottom, run: GLASS_APEX },
  EMBLEM_ALONG = ((EMBLEM.middle - FRAME.bottom) * Math.hypot(FLOOR.rise, FLOOR.run)) / FLOOR.rise

// Each printed part's rectangle on its face, across it and up it.
const STRIP_PANEL = {
    left: STRIP_FOOT.left,
    right: STRIP_FOOT.right,
    bottom: 0,
    top: STRIP_LENGTH
  },
  SENSOR_PANEL = {
    left: PADS.first - PADS.width / 2 - PLATE_MARGIN,
    right: PADS.first + (PADS.count - 1) * PADS.pitch + PADS.width / 2 + PLATE_MARGIN,
    bottom: PADS.along - PADS.length / 2 - PLATE_MARGIN,
    top: PADS.along + PADS.length / 2 + PLATE_MARGIN
  },
  BADGE_PANEL = {
    left: BADGE.ovals[0] - BADGE.oval.across / 2 - PLATE_MARGIN,
    right: BADGE.left + BADGE.width + PLATE_MARGIN,
    bottom: BADGE.line - BADGE.capHeight / 2 - PLATE_MARGIN,
    top: BADGE.line + BADGE.capHeight / 2 + PLATE_MARGIN
  },
  EMBLEM_PANEL = {
    left: (WIDTH - EMBLEM.width) / 2,
    right: (WIDTH + EMBLEM.width) / 2,
    bottom: EMBLEM_ALONG - EMBLEM.height / 2,
    top: EMBLEM_ALONG + EMBLEM.height / 2
  }

const CENTRING = [-WIDTH / 2, -DEPTH / 2, 0]

// The faces parts stand on, each turned about x by its tilt from lying flat and lifted to its foot. Drawn on one, x runs across, y up the face from its foot and z out of it.
const MASK = { tilt: 90, foot: [0, 0, 0] },
  LEDGE_FACE = { tilt: Math.atan2(LEDGE.rise, LEDGE.run) / RADIANS, foot: [0, 0, MASK_TOP] },
  STRIP_FACE = {
    tilt: Math.atan2(STRIP.rise, STRIP.run) / RADIANS,
    foot: [0, ...LEDGE_END]
  },
  REVEAL_FLOOR = {
    tilt: Math.atan2(FLOOR.rise, FLOOR.run) / RADIANS,
    foot: [0, 0, FRAME.bottom]
  },
  PLINTH_FRONT = {
    tilt: Math.atan2(MASK_BOTTOM - FOOT.height, PLINTH.top.end - PLINTH.foot.end) / RADIANS,
    foot: [0, PLINTH.foot.end, FOOT.height]
  }

function onFace(face, shape) {
  return shape.rotate(face.tilt, [0, 0, 0], [1, 0, 0]).translate(face.foot)
}

function fromFace(face, [across, along, out]) {
  const tilt = face.tilt * RADIANS,
    [, footBehind, footHeight] = face.foot

  return [
    across,
    footBehind + along * Math.cos(tilt) - out * Math.sin(tilt),
    footHeight + along * Math.sin(tilt) + out * Math.cos(tilt)
  ]
}

function placed(point) {
  return point.map((coordinate, axis) => coordinate + CENTRING[axis])
}

// Where the side's lower and top edges stand at a depth behind the face.
function sideAt(behind) {
  const share = behind / SIDE_DEPTH

  return {
    underside: MASK_BOTTOM + share * (UNDERSIDE_REAR - MASK_BOTTOM),
    sideTop: MASK_TOP + share * (SIDE_TOP_REAR - MASK_TOP)
  }
}

function topAt(behind) {
  return HEIGHT - TOP_FALL * (behind - TOP_FALL_START)
}

function section(behind) {
  const { underside, sideTop } = sideAt(behind)

  return draw([0, underside])
    .lineTo([WIDTH, underside])
    .lineTo([WIDTH, sideTop])
    .lineTo([WIDTH - BEVEL_ACROSS, HEIGHT])
    .lineTo([BEVEL_ACROSS, HEIGHT])
    .lineTo([0, sideTop])
    .close()
    .sketchOnPlane("XZ", -behind)
}

// The cross-section changes from front to rear, so the shell is lofted between the two; each section stands an overrun outside the faces the plan gives it.
function buildShell() {
  const front = section(-OVERRUN),
    rear = section(SIDE_DEPTH + OVERRUN)

  return front.loftWith(rear, { ruled: true })
}

// The side's outline, run past the shell wherever it does not cut it: the top's front, and its fall to the rear.
function buildSideProfile() {
  const reach = 2 * OVERRUN,
    above = HEIGHT + OVERRUN,
    ledgeSlope = LEDGE.rise / LEDGE.run,
    bandSlope = UPPER_BAND.rise / UPPER_BAND.run,
    outline = draw([-reach, -reach])
      .lineTo([-reach, MASK_TOP - reach * ledgeSlope])
      .lineTo(LEDGE_END)
      .lineTo(STRIP_HEAD_EDGE)
      .lineTo(TOP_FRONT)
      .lineTo([TOP_FRONT[0] + OVERRUN / bandSlope, above])
      .lineTo([TOP_FALL_START - OVERRUN / TOP_FALL, above])
      .lineTo([SIDE_DEPTH + reach, TOP_REAR - reach * TOP_FALL])
      .lineTo([SIDE_DEPTH + reach, -reach])
      .close()

  return outline.sketchOnPlane("YZ", -OVERRUN).extrude(WIDTH + 2 * OVERRUN)
}

function buildPlan() {
  return drawRoundedRectangle(WIDTH, SIDE_DEPTH, CORNER_RADIUS)
    .translate(WIDTH / 2, SIDE_DEPTH / 2)
    .sketchOnPlane("XY", -OVERRUN)
    .extrude(HEIGHT + 2 * OVERRUN)
}

function plinthOutline(height) {
  const share = (MASK_BOTTOM - height) / (MASK_BOTTOM - FOOT.height),
    side = PLINTH.top.side + share * (PLINTH.foot.side - PLINTH.top.side),
    end = PLINTH.top.end + share * (PLINTH.foot.end - PLINTH.top.end),
    cut = PLINTH.corner,
    [left, right, near, far] = [side, WIDTH - side, end, SIDE_DEPTH - end]

  return draw([left + cut, near])
    .lineTo([right - cut, near])
    .lineTo([right, near + cut])
    .lineTo([right, far - cut])
    .lineTo([right - cut, far])
    .lineTo([left + cut, far])
    .lineTo([left, far - cut])
    .lineTo([left, near + cut])
    .close()
}

function buildPlinth() {
  const foot = plinthOutline(FOOT.height).sketchOnPlane("XY", FOOT.height),
    buried = plinthOutline(PLINTH.buried).sketchOnPlane("XY", PLINTH.buried)

  return foot.loftWith(buried, { ruled: true })
}

function frameOutline() {
  return drawRoundedRectangle(FRAME.width, FRAME.top - FRAME.bottom, FRAME.radius).translate(
    WIDTH / 2,
    (FRAME.bottom + FRAME.top) / 2
  )
}

function glassOutline(step) {
  return drawRoundedRectangle(GLASS.width + 2 * step, GLASS.height + 2 * step, GLASS.radius + step)
}

function buildFrameHole() {
  return frameOutline()
    .sketchOnPlane("XZ", OVERRUN)
    .extrude(-(BORE_DEPTH + OVERRUN))
}

function panelMiddle(panel) {
  return [(panel.left + panel.right) / 2, (panel.bottom + panel.top) / 2]
}

function panelOutline(panel) {
  return drawRectangle(panel.right - panel.left, panel.top - panel.bottom)
}

// The strip narrows from its foot to its head, drawn about the middle of the rectangle round it.
function stripOutline(panel) {
  const [middle] = panelMiddle(panel),
    half = (panel.top - panel.bottom) / 2

  return draw([panel.left - middle, -half])
    .lineTo([panel.right - middle, -half])
    .lineTo([STRIP_HEAD.right - middle, half])
    .lineTo([STRIP_HEAD.left - middle, half])
    .close()
}

function buildRecess(face, panel, outline) {
  const [across, along] = panelMiddle(panel),
    drawing = outline(panel),
    recess = drawing
      .translate(across, along)
      .sketchOnPlane("XY", -PLATE_THICKNESS)
      .extrude(PLATE_THICKNESS + OVERRUN)

  return onFace(face, recess)
}

function buildSeamGrooves() {
  const { underside, sideTop } = sideAt(SEAM.behind),
    near = SEAM.behind - SEAM.width / 2,
    far = SEAM.behind + SEAM.width / 2,
    left = makeBox([-OVERRUN, near, underside - OVERRUN], [SEAM.depth, far, sideTop]),
    right = makeBox(
      [WIDTH - SEAM.depth, near, underside - OVERRUN],
      [WIDTH + OVERRUN, far, sideTop]
    )

  return makeCompound([left, right])
}

function earphoneSlot(middle) {
  return makeBox(
    [-OVERRUN, EARPHONE.behind - EARPHONE.across / 2, middle - EARPHONE.height / 2],
    [EARPHONE.depth, EARPHONE.behind + EARPHONE.across / 2, middle + EARPHONE.height / 2]
  )
}

function buildEarphoneSlots() {
  const slots = EARPHONE.middles.map(earphoneSlot)

  return makeCompound(slots)
}

function wellBounds() {
  const left = (WIDTH - HANDLE_WELL.across) / 2,
    near = HANDLE_WELL.behind - HANDLE_WELL.depth / 2,
    floor = topAt(HANDLE_WELL.behind) - HANDLE_WELL.sunk

  return { left, right: left + HANDLE_WELL.across, near, far: near + HANDLE_WELL.depth, floor }
}

function buildHandleWell() {
  const well = wellBounds()

  return makeBox([well.left, well.near, well.floor], [well.right, well.far, HEIGHT + OVERRUN])
}

function buildGrilleGrooves() {
  const count = Math.floor((GRILLE.right - GRILLE.left) / GRILLE.pitch) + 1,
    first = (GRILLE.left + GRILLE.right - (count - 1) * GRILLE.pitch) / 2,
    reach = Math.hypot(MASK_BOTTOM - FOOT.height, PLINTH.foot.end - PLINTH.top.end) - GRILLE.margin,
    grooves = []

  for (let index = 0; index < count; index++) {
    const middle = first + index * GRILLE.pitch,
      groove = makeBox(
        [middle - GRILLE.groove / 2, -OVERRUN, -GRILLE.depth],
        [middle + GRILLE.groove / 2, reach, OVERRUN]
      )

    grooves.push(groove)
  }

  const flat = makeCompound(grooves)

  return onFace(PLINTH_FRONT, flat)
}

function buildCabinet() {
  const shell = buildShell(),
    profile = buildSideProfile(),
    plan = buildPlan(),
    plinth = buildPlinth(),
    body = shell.intersect(profile).intersect(plan).fuse(plinth),
    frameHole = buildFrameHole(),
    badgeRecess = buildRecess(MASK, BADGE_PANEL, panelOutline),
    sensorRecess = buildRecess(LEDGE_FACE, SENSOR_PANEL, panelOutline),
    stripRecess = buildRecess(STRIP_FACE, STRIP_PANEL, stripOutline),
    seams = buildSeamGrooves(),
    earphoneSlots = buildEarphoneSlots(),
    handleWell = buildHandleWell(),
    grille = buildGrilleGrooves(),
    cut = body
      .cut(frameHole)
      .cut(badgeRecess)
      .cut(sensorRecess)
      .cut(stripRecess)
      .cut(seams)
      .cut(earphoneSlots)
      .cut(handleWell)
      .cut(grille)

  return { name: "cabinet", shape: cut.translate(CENTRING), material: CABINET }
}

function glassOpening() {
  return glassOutline(0)
    .translate(...GLASS_MIDDLE)
    .sketchOnPlane("XZ", OVERRUN)
    .extrude(-(BORE_DEPTH + 2 * OVERRUN))
}

// The glass's own face where the set stands it, the cylinder cut to the opening.
function glassFace() {
  const span = GLASS.height + 2 * OVERRUN,
    axis = [WIDTH / 2, GLASS_APEX + FACE_RADIUS, GLASS_BOTTOM - OVERRUN],
    cylinder = makeCylinder(FACE_RADIUS, span, axis, [0, 0, 1]),
    opening = glassOpening(),
    glass = cylinder.intersect(opening),
    apex = [WIDTH / 2, GLASS_APEX, GLASS.middle]

  return new FaceFinder()
    .ofSurfaceType("CYLINDRE")
    .containsPoint(apex)
    .find(glass, { unique: true })
}

// The reveal is ruled from the frame's outline in the face to the glass's own edge, and the bore carries the opening on behind the glass.
function buildBezel() {
  const frame = frameOutline().sketchOnPlane("XZ").extrude(-BORE_DEPTH),
    rim = frameOutline().sketchOnPlane("XZ").wire,
    glass = glassFace(),
    edge = glass.outerWire(),
    reveal = loft([rim, edge], { ruled: true }),
    bore = glassOpening(),
    bezel = frame.cut(reveal).cut(bore)

  return { name: "bezel", shape: bezel.translate(CENTRING), material: BEZEL }
}

// The kernel seams a cylinder along its x direction, which for an upright axis it lays toward the viewer, down the middle of the picture. Turned a half round it is the same solid, its seam behind.
function buildScreen() {
  const outline = glassOutline(GLASS_MARGIN)
      .sketchOnPlane("XY", OVERRUN)
      .extrude(-(GLASS_THICKNESS + OVERRUN)),
    span = GLASS.height + 2 * (GLASS_MARGIN + OVERRUN),
    upright = makeCylinder(FACE_RADIUS, span, [0, -span / 2, 0], [0, 1, 0]),
    turned = upright.rotate(180, [0, 0, 0], [0, 1, 0]),
    cylinder = turned.translate([0, 0, -FACE_RADIUS]),
    cap = cylinder.intersect(outline),
    face = {
      left: -SHOWN_MIDDLE[0] * SAMPLE,
      right: (RASTER.columns - SHOWN_MIDDLE[0]) * SAMPLE,
      front: (SHOWN_MIDDLE[1] - RASTER.rows) * LINE,
      rear: SHOWN_MIDDLE[1] * LINE
    },
    apex = fromFace(MASK, [...GLASS_MIDDLE, -GLASS_APEX])

  return {
    name: "screen",
    shape: cap,
    material: PHOSPHOR,
    face,
    tilt: MASK.tilt,
    place: placed(apex),
    screen: "RF"
  }
}

// A printed part stands on its face as the glass does on the mask: drawn about its middle, turned up and placed, its print laid over the rectangle round it.
function printedPart(print, shape, panel, face, material) {
  const width = panel.right - panel.left,
    height = panel.top - panel.bottom,
    mapping = { left: -width / 2, right: width / 2, front: -height / 2, rear: height / 2 },
    middle = panelMiddle(panel),
    standing = fromFace(face, [...middle, 0])

  return {
    name: print,
    shape,
    material,
    face: mapping,
    tilt: face.tilt,
    place: placed(standing),
    print
  }
}

function buildPlate(print, panel, face, material, outline) {
  const drawing = outline(panel),
    plate = drawing.sketchOnPlane("XY").extrude(-PLATE_THICKNESS)

  return printedPart(print, plate, panel, face, material)
}

function buildEmblem() {
  const drawing = panelOutline(EMBLEM_PANEL),
    plate = drawing.sketchOnPlane("XY", EMBLEM.standing).extrude(-(EMBLEM.standing + EMBLEM.sunk))

  return printedPart(EMBLEM_PRINT, plate, EMBLEM_PANEL, REVEAL_FLOOR, EMBLEM_FACE)
}

function buildVolumeKnob() {
  const half = KNOB.width / 2,
    knob = makeBox(
      [KNOB.middle - half, 0, -OVERRUN],
      [KNOB.middle + half, STRIP_LENGTH, KNOB.standing]
    ),
    standing = onFace(STRIP_FACE, knob)

  return { name: "volume-knob", shape: standing.translate(CENTRING), material: CABINET }
}

function buildPowerButton() {
  const half = POWER_BUTTON.width / 2,
    along = STRIP_LENGTH * (1 - POWER_BUTTON.drop),
    button = makeBox(
      [POWER_BUTTON.middle - half, along - POWER_BUTTON.height / 2, -OVERRUN],
      [POWER_BUTTON.middle + half, along + POWER_BUTTON.height / 2, POWER_BUTTON.standing]
    ),
    standing = onFace(STRIP_FACE, button)

  return { name: "power-button", shape: standing.translate(CENTRING), material: BUTTON }
}

function buildHandle() {
  const well = wellBounds(),
    bar = makeBox(
      [well.left + HANDLE.clearance, well.near + HANDLE.clearance, well.floor],
      [well.right - HANDLE.clearance, well.far - HANDLE.clearance, well.floor + HANDLE.thickness]
    )

  return { name: "handle", shape: bar.translate(CENTRING), material: CABINET }
}

function buildEarphoneJack() {
  const lowest = Math.min(...EARPHONE.middles),
    highest = Math.max(...EARPHONE.middles),
    floor = makeBox(
      [
        EARPHONE.depth - OVERRUN,
        EARPHONE.behind - EARPHONE.across / 2,
        lowest - EARPHONE.height / 2
      ],
      [EARPHONE.depth, EARPHONE.behind + EARPHONE.across / 2, highest + EARPHONE.height / 2]
    )

  return { name: "earphone-jack", shape: floor.translate(CENTRING), material: INSIDE }
}

function buildFoot(left, near) {
  const sole = plinthOutline(FOOT.height).sketchOnPlane("XY").extrude(FOOT.height),
    corner = makeBox(
      [left, near, -OVERRUN],
      [left + FOOT.across, near + FOOT.across, FOOT.height + OVERRUN]
    )

  return sole.intersect(corner)
}

function buildFeet() {
  const { side, end } = PLINTH.foot,
    across = [side, WIDTH - side - FOOT.across],
    behind = [end, SIDE_DEPTH - end - FOOT.across],
    feet = []

  for (const near of behind) {
    for (const left of across) {
      const foot = buildFoot(left, near)

      feet.push(foot)
    }
  }

  const compound = makeCompound(feet)

  return { name: "feet", shape: compound.translate(CENTRING), material: CABINET }
}

function rearCoverOutline(size, behind) {
  return drawRoundedRectangle(size.width, size.height, REAR_COVER.radius)
    .translate(...GLASS_MIDDLE)
    .sketchOnPlane("XZ", -behind)
}

function buildRearCover() {
  const start = rearCoverOutline(REAR_COVER.start, SIDE_DEPTH - OVERRUN),
    end = rearCoverOutline(REAR_COVER.end, DEPTH),
    cover = start.loftWith(end, { ruled: true })

  return { name: "rear-cover", shape: cover.translate(CENTRING), material: CABINET }
}

function fontSize(height) {
  return height / HEROS_CAP_HEIGHT
}

function drawFittedWord({ word, left, width, baseline, capHeight, weight, ink }) {
  const size = fontSize(capHeight)

  return `<text x="${left}" y="${baseline}" font-family="${HEROS}" font-size="${size}" font-weight="${weight}" fill="${ink}" textLength="${width}" lengthAdjust="spacingAndGlyphs">${word}</text>`
}

// Each print is drawn in its face's own measurements, x across and y down the face, and shifted into its panel's frame, so that every figure above reads as it was measured.
function drawPanel(panel, backing, drawn) {
  const width = panel.right - panel.left,
    height = panel.top - panel.bottom

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="${backing}"/>`,
    `<g transform="translate(${-panel.left} ${panel.top})">`,
    drawn,
    "</g>",
    "</svg>"
  ].join("\n")
}

function drawTick(across) {
  const length = STRIP_LENGTH * TICKS.drop

  return `<rect x="${across - TICKS.width / 2}" y="${-STRIP_LENGTH}" width="${TICKS.width}" height="${length}" fill="${LEGEND_INK}"/>`
}

// A mark is three strokes crossing, one upright.
function drawMark(middle, along, across) {
  const strokes = [0, 60, 120].map(function (turn) {
    return `<rect x="${middle - MARK.stroke / 2}" y="${-along - across / 2}" width="${MARK.stroke}" height="${across}" fill="${LEGEND_INK}" transform="rotate(${turn} ${middle} ${-along})"/>`
  })

  return strokes.join("\n")
}

function drawLegend(word, middle, width) {
  const along = STRIP_LENGTH * (1 - LEGEND_LINE),
    marked = word == MARK.word

  if (marked) {
    return drawMark(middle, along, width)
  }

  return drawFittedWord({
    word,
    left: middle - width / 2,
    width,
    baseline: -(along - LEGEND_HEIGHT / 2),
    capHeight: LEGEND_HEIGHT,
    weight: 700,
    ink: LEGEND_INK
  })
}

function drawControlPanel() {
  const scale = Array.from(
      { length: TICKS.count },
      (_, index) => TICKS.first + index * TICKS.pitch
    ),
    places = [...TICKS.places, ...scale],
    ticks = places.map(drawTick),
    words = END_WORDS.map(fitted => drawLegend(fitted.word, fitted.middle, fitted.width)),
    channels = CHANNELS.map(function (channel, index) {
      const middle = PADS.first + index * PADS.pitch

      return drawLegend(channel.word, middle, channel.width)
    }),
    drawn = [...ticks, ...words, ...channels].join("\n")

  return drawPanel(STRIP_PANEL, CONTROL_FACE.colour, drawn)
}

// A pad is a dark frame round two contacts running up the ledge.
function drawPad(middle) {
  const { contact } = PADS,
    top = -(PADS.along + contact.length / 2),
    frame = `<rect x="${middle - PADS.width / 2}" y="${-(PADS.along + PADS.length / 2)}" width="${PADS.width}" height="${PADS.length}" rx="${PADS.radius}" fill="${BEZEL.colour}"/>`,
    contacts = [-1, 1].map(function (side) {
      const left = middle + (side * contact.apart) / 2 - contact.width / 2

      return `<rect x="${left}" y="${top}" width="${contact.width}" height="${contact.length}" fill="${LEGEND_INK}"/>`
    })

  return [frame, ...contacts].join("\n")
}

function drawSensorPads() {
  const middles = Array.from({ length: PADS.count }, (_, index) => PADS.first + index * PADS.pitch),
    pads = middles.map(drawPad)

  return drawPanel(SENSOR_PANEL, SENSOR_FACE.colour, pads.join("\n"))
}

function drawOval(middle, index) {
  const { oval } = BADGE

  return `<ellipse cx="${middle}" cy="${-BADGE.line}" rx="${oval.across / 2}" ry="${oval.height / 2}" fill="${OVAL_INKS[index]}"/>`
}

function drawBadge() {
  const ovals = BADGE.ovals.map(drawOval),
    word = drawFittedWord({
      word: BADGE.word,
      left: BADGE.left,
      width: BADGE.width,
      baseline: -(BADGE.line - BADGE.capHeight / 2),
      capHeight: BADGE.capHeight,
      weight: 400,
      ink: WORD_INK
    })

  return drawPanel(BADGE_PANEL, BADGE_FACE.colour, [...ovals, word].join("\n"))
}

function drawEmblem() {
  const word = drawFittedWord({
    word: EMBLEM.word,
    left: (WIDTH - EMBLEM.letters) / 2,
    width: EMBLEM.letters,
    baseline: -(EMBLEM_ALONG - EMBLEM.capHeight / 2),
    capHeight: EMBLEM.capHeight,
    weight: 700,
    ink: LEGEND_INK
  })

  return drawPanel(EMBLEM_PANEL, EMBLEM_FACE.colour, word)
}

export function buildKv1400() {
  return {
    tessellation: TESSELLATION,
    parts: [
      buildCabinet(),
      buildBezel(),
      buildScreen(),
      buildRearCover(),
      buildFeet(),
      buildHandle(),
      buildVolumeKnob(),
      buildPowerButton(),
      buildEarphoneJack(),
      buildPlate(CONTROL_PRINT, STRIP_PANEL, STRIP_FACE, CONTROL_FACE, stripOutline),
      buildPlate(SENSOR_PRINT, SENSOR_PANEL, LEDGE_FACE, SENSOR_FACE, panelOutline),
      buildPlate(BADGE_PRINT, BADGE_PANEL, MASK, BADGE_FACE, panelOutline),
      buildEmblem()
    ],
    prints: [
      { name: CONTROL_PRINT, language: LANGUAGE, svg: drawControlPanel(), pixels: PLATE_PIXELS },
      { name: SENSOR_PRINT, language: LANGUAGE, svg: drawSensorPads(), pixels: PLATE_PIXELS },
      { name: BADGE_PRINT, language: LANGUAGE, svg: drawBadge(), pixels: PLATE_PIXELS },
      { name: EMBLEM_PRINT, language: LANGUAGE, svg: drawEmblem(), pixels: PLATE_PIXELS }
    ]
  }
}
