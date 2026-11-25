import {
  LABEL_PRINT,
  TESSELLATION,
  buildFrontTape,
  buildLabel,
  buildReels,
  buildScrews,
  buildShell,
  buildWindows,
  windowOutline
} from "./compact_cassette.js"
import { drawRectangle } from "replicad"

// x runs across side A from its left end, seen with the tape's openings toward the reader, and y back from that front edge, in millimetres.

// The Sound-on-Sound "Personal Computer" C-15, the blank Iberofón made in Coslada, Madrid, and advertised to Spain's Spectrum owners [A], its maker's advert in MicroHobby 11, January 1985, "La cinta virgen para Personal Computer C-10 y C-15.", with an "Ordenador Spectrum 48 K." among its prizes: https://archive.org/download/microhobby-magazine-011.pdf/page/n34_w1600.jpg
// "The advert" here is its photograph of the C-10, rectified to the shell's outline and to the blue seen through the hubs' bores, ±1.5 [E]. The camera looks down from the front, so the blue begins at the holes' front edges on the face, which read at 30.9 where the standard puts them at 29.25 [A]: on the hubs' line the frame reads the face 1.65 too far back [E]. How that changes away from the line is not measured, and every reading here is taken back by a guess at it. Behind the line it falls evenly to none at the rear edge, where the frame's rear corners are anchored. In front of it, it stays 1.65; the frame's front-left corner was anchored at the front edge, which may be the foot of the front wall the camera sees, and the front region's own front edge reads at 5.2, so the error there may be larger. So taken, the label's white strip ends at the window's foot.
// The shell is the compact cassette's, black and glossy. Its five silver screws read at (2.6, 59.9), (96.1, 60.5), (2.6, 5.8), (96.8, 6.0) and (49.8, 13.5) in the frame and, taken back, stand where the Amsoft's do within the advert's ±1.5 [E]. The advert shows no side B, which is drawn without screws, as the Amsoft's is; that is a guess.
// The C-15 the advert shows only in its case, whose inlay reads "Sound-on-Sound SUPERFERRO Cassette C-15 PERSONAL COMPUTER" [A]; its face is drawn as the C-10's, with 15 for 10.
// The label lies 4.9 to 95.3 across and 18.45 to 59.1 back, its rear corners cut off at 45° 3 along each edge, as read on the left [E]. Its rear edge reads 60.0 there, past the 24.3 behind the hubs' line that ECMA-34 allows a label by less than the advert's error, and is taken at that limit, 59.1 [A]: https://ecma-international.org/wp-content/uploads/ECMA-34_3rd_edition_september_1976.pdf
// It is black, with a white strip along its front edge back to 27.95 [E]. Whether the black and its print are a label or printed on the shell is not settled: it is drawn as one black label carrying the strip, the window cut out of it above the strip.
// The window's plate reads darker than the shell, but for a light bar 39.3 to 60.2 across by 33.25 to 34.85 back, between the hubs [E]. Whether the bar is clear plastic over a light liner or a light inset is not settled, and it is drawn as it reads, opaque.
const LABEL = { left: 4.9, right: 95.3, front: 18.45, back: 59.1, cut: 3 },
  STRIP_BACK = 27.95,
  BAR = { left: 39.3, right: 60.2, front: 33.25, back: 34.85 }

// Colours, all [E] and low: the advert is a 1985 magazine's halftone. The strip reads #e9e4e1. Read at the brighter third of their pixels, where a thin stroke keeps its own ink, the monogram reads #c5a25e; "Sound" #ab926e, "on" #b24f36 and the hyphens #ceb8ad; "PERSONAL COMPUTER" #8f7262, where the case prints the same words red over a green shadow; the minutes #92857c; and the window's bar #695f5e. The tape is ferric, as its case says, SUPERFERRO [A], and reads #5d3e28 across the front's middle opening.
// The rest are guesses. The halftone warms the shell's black to #1b1309; the shell and the label's black are drawn in the #16181a two other black shells read on near-neutral grounds, a Saisho C15 and an Ampex C12. The shell is drawn glossy, as it shines in the advert, and the label matte, as paper; the window's plate darker than the shell, as it reads; the strip's lettering and rules, too thin for the halftone to keep their black, in the label's black; the diamond's outline in the hyphens' pale; and the hubs' white, which shows at the holes' edges, and the screws' silver, as the Amsoft's are drawn.
const SHELL = { name: "shell", colour: "#16181a", roughness: 0.3 },
  WINDOW_PLATE = { name: "window", colour: "#0e0f10", roughness: 0.2 },
  WINDOW_BAR = { name: "window-bar", colour: "#695f5e", roughness: 0.2 },
  PAPER = { name: "label", colour: "#16181a" },
  HUB_PLASTIC = { name: "hub", colour: "#d9d8d2" },
  TAPE_OXIDE = { name: "tape", colour: "#5d3e28" },
  SCREW_METAL = { name: "screw", colour: "#b4b6b8", roughness: 0.3 }

const LABEL_BLACK = PAPER.colour,
  INKS = {
    strip: "#e9e4e1",
    monogram: "#c5a25e",
    name: "#ab926e",
    on: "#b24f36",
    hyphens: "#ceb8ad",
    personalComputer: "#8f7262",
    minutes: "#92857c"
  }

// The label measured on the advert, x across from its left edge and y down from its rear edge, ±1.5 [E]. On the strip, "Cara A" over the first of two rules, where the title is written, and "Made in Spain" under the second. Above it the "SS" monogram, its two serifed S's crossed by a diamond outlined pale, with a red "ON" in it; "Sound-on-Sound", its "on" bold, over "PERSONAL COMPUTER" in segmented capitals leaning 11°, the slant at which their columns stand sharpest; and the minutes in a thin line, 10' on the C-10. The C-15's 5 is drawn in the hand and proportions of the 15 on its case; that it stands where the C-10's 0 does, with the mark after it, is a guess.
// TeX Gyre Heros stands in for the lettering, each word fitted to the width measured for it: https://www.gust.org.pl/projects/e-foundry/tex-gyre/heros. The S's, the segmented capitals and the minutes are drawn by eye.
const STRIP_TOP = LABEL.back - STRIP_BACK,
  LABEL_ART = {
    line: 0.3,
    side: { word: "Cara A", left: 3.8, width: 9.3, baseline: 34.15, capHeight: 2.1 },
    titleRule: { from: 13.9, to: 89.1, at: 33.95 },
    lowerRule: { from: 3.8, to: 89.3, at: 37.95 },
    madeIn: { word: "Made in Spain", left: 72.9, width: 16.3, baseline: 39.75, capHeight: 1.6 },
    monogram: { lefts: [11.2, 18.8], top: 1.87, stroke: 1.9 },
    diamond: { middle: [18.4, 7.9], across: 5, outline: 0.25 },
    on: { word: "ON", left: 16.8, width: 3, baseline: 8.45, capHeight: 1.3 },
    name: {
      baseline: 6.45,
      capHeight: 4.7,
      words: [
        { word: "Sound", left: 28.7, width: 17.5, ink: INKS.name, weight: 400 },
        { word: "-", left: 46.7, width: 1.5, ink: INKS.hyphens, weight: 400 },
        { word: "on", left: 48.6, width: 6.3, ink: INKS.on, weight: 700 },
        { word: "-", left: 55.4, width: 1.5, ink: INKS.hyphens, weight: 400 },
        { word: "Sound", left: 57.4, width: 17.8, ink: INKS.name, weight: 400 }
      ]
    },
    segmented: {
      words: [
        { word: "PERSONAL", left: 28.6, right: 49.5 },
        { word: "COMPUTER", left: 52.6, right: 74.6 }
      ],
      baseline: 12.05,
      capHeight: 4,
      letter: 2.2,
      stroke: 0.55,
      slant: 11
    },
    minutes: {
      top: 19.7,
      bottom: 27.45,
      stroke: 0.35,
      one: { flag: 75, stem: 77.1 },
      five: { left: 78.8, right: 84.85, bowl: 0.72 },
      mark: { at: 85.45, top: 19.25, bottom: 20.3 }
    }
  }

// One S of the monogram, 6.9 by 13.05 from its top left: its stroke's middle from the top right round to the foot on the left, and the beaks at either end.
const S_SPINE =
    "M 5.4 1.45 C 4.8 1 4.1 0.95 3.4 0.95 C 1.9 0.95 0.95 2.1 0.95 3.7 C 0.95 5.4 2.3 5.95 3.45 6.5 C 4.7 7.1 5.95 7.75 5.95 9.6 C 5.95 11.1 4.9 12.1 3.4 12.1 C 2.5 12.1 1.8 11.85 1.4 11.4",
  S_BEAKS = [
    { left: 5.5, top: 0.35, right: 6.9, bottom: 4.15 },
    { left: 0, top: 8.95, right: 1.4, bottom: 12.7 }
  ]

// The strokes the segmented capitals are drawn from, in a box of unit width and height, y down.
const SEGMENTS = {
    top: [
      [0, 0],
      [1, 0]
    ],
    upperLeft: [
      [0, 0],
      [0, 0.5]
    ],
    upperRight: [
      [1, 0],
      [1, 0.5]
    ],
    middle: [
      [0, 0.5],
      [1, 0.5]
    ],
    lowerLeft: [
      [0, 0.5],
      [0, 1]
    ],
    lowerRight: [
      [1, 0.5],
      [1, 1]
    ],
    bottom: [
      [0, 1],
      [1, 1]
    ],
    upperStem: [
      [0.5, 0],
      [0.5, 0.5]
    ],
    stem: [
      [0.5, 0],
      [0.5, 1]
    ],
    leg: [
      [0.5, 0.5],
      [1, 1]
    ]
  },
  CAPITALS = {
    A: ["top", "upperLeft", "upperRight", "middle", "lowerLeft", "lowerRight"],
    C: ["top", "upperLeft", "lowerLeft", "bottom"],
    E: ["top", "upperLeft", "middle", "lowerLeft", "bottom"],
    L: ["upperLeft", "lowerLeft", "bottom"],
    M: ["top", "upperLeft", "upperRight", "upperStem", "lowerLeft", "lowerRight"],
    N: ["top", "upperLeft", "upperRight", "lowerLeft", "lowerRight"],
    O: ["top", "upperLeft", "upperRight", "lowerLeft", "lowerRight", "bottom"],
    P: ["top", "upperLeft", "upperRight", "middle", "lowerLeft"],
    R: ["top", "upperLeft", "upperRight", "middle", "lowerLeft", "leg"],
    S: ["top", "upperLeft", "middle", "lowerRight", "bottom"],
    T: ["top", "stem"],
    U: ["upperLeft", "upperRight", "lowerLeft", "lowerRight", "bottom"]
  }

// Where a hand writes the name: on the first rule, 0.4 clear of it and of the strip's top and 1 in from its ends, which are guesses.
const WRITING_CLEARANCE = 0.4,
  WRITING_INSET = 1

const HEROS = "TeX Gyre Heros",
  HEROS_CAP_HEIGHT = 0.729

// How finely the label is rendered, as the disc's.
const LABEL_PIXELS = 12

const LANGUAGE = "es"

const LABEL_WIDTH = LABEL.right - LABEL.left,
  LABEL_DEPTH = LABEL.back - LABEL.front,
  RADIANS = Math.PI / 180

// The window as the label leaves it open: above the strip.
function labelOpening() {
  const deep = STRIP_BACK - LABEL.front,
    strip = drawRectangle(LABEL_WIDTH, deep).translate(
      (LABEL.left + LABEL.right) / 2,
      (LABEL.front + STRIP_BACK) / 2
    )

  return windowOutline().cut(strip)
}

// The first rule's line, as a fraction of the label.
function writingArea() {
  const { titleRule, line } = LABEL_ART,
    left = titleRule.from + WRITING_INSET,
    top = STRIP_TOP + WRITING_CLEARANCE,
    width = titleRule.to - titleRule.from - 2 * WRITING_INSET,
    height = titleRule.at - line / 2 - WRITING_CLEARANCE - top

  return {
    left: left / LABEL_WIDTH,
    top: top / LABEL_DEPTH,
    width: width / LABEL_WIDTH,
    height: height / LABEL_DEPTH
  }
}

function svgOpen(width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
}

function drawWord({ word, left, width, baseline, capHeight }, ink, weight) {
  const size = capHeight / HEROS_CAP_HEIGHT

  return `<text x="${left}" y="${baseline}" font-family="${HEROS}" font-size="${size}" font-weight="${weight}" fill="${ink}" textLength="${width}" lengthAdjust="spacingAndGlyphs">${word}</text>`
}

function drawRule({ from, to, at }) {
  return `<line x1="${from}" y1="${at}" x2="${to}" y2="${at}" stroke="${LABEL_BLACK}" stroke-width="${LABEL_ART.line}"/>`
}

function drawStrip() {
  const { side, titleRule, lowerRule, madeIn } = LABEL_ART

  return [
    `<rect x="0" y="${STRIP_TOP}" width="${LABEL_WIDTH}" height="${LABEL_DEPTH - STRIP_TOP}" fill="${INKS.strip}"/>`,
    drawWord(side, LABEL_BLACK, 400),
    drawRule(titleRule),
    drawRule(lowerRule),
    drawWord(madeIn, LABEL_BLACK, 400)
  ].join("\n")
}

function drawS(left, top) {
  const { stroke } = LABEL_ART.monogram,
    beaks = S_BEAKS.map(function (beak) {
      return `<rect x="${beak.left}" y="${beak.top}" width="${beak.right - beak.left}" height="${beak.bottom - beak.top}"/>`
    })

  return `<g transform="translate(${left} ${top})" fill="${INKS.monogram}"><path d="${S_SPINE}" fill="none" stroke="${INKS.monogram}" stroke-width="${stroke}"/>${beaks.join("")}</g>`
}

function drawMonogram() {
  const { monogram, diamond, on } = LABEL_ART,
    [across, down] = diamond.middle,
    reach = diamond.across / 2,
    corners = [
      [across, down - reach],
      [across + reach, down],
      [across, down + reach],
      [across - reach, down]
    ],
    points = corners.map(([x, y]) => `${x},${y}`).join(" "),
    letters = monogram.lefts.map(left => drawS(left, monogram.top))

  return [
    ...letters,
    `<polygon points="${points}" fill="${LABEL_BLACK}" stroke="${INKS.hyphens}" stroke-width="${diamond.outline}"/>`,
    drawWord(on, INKS.on, 700)
  ].join("\n")
}

function drawName() {
  const { baseline, capHeight, words } = LABEL_ART.name,
    drawn = words.map(function ({ word, left, width, ink, weight }) {
      return drawWord({ word, left, width, baseline, capHeight }, ink, weight)
    })

  return drawn.join("\n")
}

function drawCapital(capital, left) {
  const { baseline, capHeight, letter, stroke } = LABEL_ART.segmented,
    inner = stroke / 2,
    across = letter - stroke,
    down = capHeight - stroke,
    top = baseline - capHeight + inner,
    side = left + inner

  return CAPITALS[capital].map(function (segment) {
    const [[fromX, fromY], [toX, toY]] = SEGMENTS[segment]

    return `<line x1="${side + fromX * across}" y1="${top + fromY * down}" x2="${side + toX * across}" y2="${top + toY * down}"/>`
  })
}

// Each word was measured at its baseline, so it leans about it, its capitals spread evenly across it.
function drawSegmented() {
  const { words, baseline, letter, stroke, slant } = LABEL_ART.segmented,
    lines = []

  for (const { word, left, right } of words) {
    const pitch = (right - left - letter) / (word.length - 1)

    for (const [index, capital] of [...word].entries()) {
      const drawn = drawCapital(capital, left + index * pitch)

      lines.push(...drawn)
    }
  }

  return `<g transform="translate(0 ${baseline}) skewX(${-slant}) translate(0 ${-baseline})" stroke="${INKS.personalComputer}" stroke-width="${stroke}" stroke-linecap="square">${lines.join("")}</g>`
}

function drawMinutes() {
  const { top, bottom, stroke, one, five, mark } = LABEL_ART.minutes,
    inner = stroke / 2,
    head = top + inner,
    right = five.right - inner,
    foot = bottom - inner,
    radiusAcross = (right - five.left - inner) / 2,
    radiusDown = (five.bowl * (foot - head)) / 2,
    middleAcross = right - radiusAcross,
    middleDown = foot - radiusDown,
    diagonal = Math.cos(45 * RADIANS),
    stemAt = middleAcross - diagonal * radiusAcross,
    bowlFrom = middleDown - diagonal * radiusDown,
    bowlTo = middleDown + diagonal * radiusDown,
    fivePath = `M ${right} ${head} L ${stemAt} ${head} L ${stemAt} ${bowlFrom} A ${radiusAcross} ${radiusDown} 0 1 1 ${stemAt} ${bowlTo}`

  return [
    `<g fill="none" stroke="${INKS.minutes}" stroke-width="${stroke}">`,
    `<polyline points="${one.flag},${head} ${one.stem},${head} ${one.stem},${bottom}"/>`,
    `<path d="${fivePath}"/>`,
    `<line x1="${mark.at}" y1="${mark.top}" x2="${mark.at}" y2="${mark.bottom}"/>`,
    "</g>"
  ].join("\n")
}

function drawLabel() {
  return [
    svgOpen(LABEL_WIDTH, LABEL_DEPTH),
    `<rect x="0" y="0" width="${LABEL_WIDTH}" height="${LABEL_DEPTH}" fill="${LABEL_BLACK}"/>`,
    drawStrip(),
    drawMonogram(),
    drawName(),
    drawSegmented(),
    drawMinutes(),
    "</svg>"
  ].join("\n")
}

export function buildSoundOnSoundC15() {
  const opening = labelOpening(),
    writing = writingArea()

  return {
    tessellation: TESSELLATION,
    parts: [
      buildShell(LABEL, SHELL),
      ...buildWindows(BAR, "window-bar", WINDOW_PLATE, WINDOW_BAR),
      buildLabel(LABEL, opening, PAPER, [writing]),
      buildScrews(SCREW_METAL),
      ...buildReels(HUB_PLASTIC, TAPE_OXIDE),
      buildFrontTape(TAPE_OXIDE)
    ],
    prints: [{ name: LABEL_PRINT, language: LANGUAGE, svg: drawLabel(), pixels: LABEL_PIXELS }]
  }
}
