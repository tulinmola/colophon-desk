import { AMSOFT_INK, drawAmsoft } from "./amsoft.js"
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

// x runs across side A from its left end, seen with the tape's openings toward the reader, and y back from that front edge, in millimetres.

// The Amsoft CT-15, the blank Amsoft sold for recording programs and data [A], "Amsoft offer premium priced ten-pack of C-15 cassettes for recording programs and data. Complete with index card inlay.": https://archive.org/details/Amsoft_Software_And_Peripherals_Catalogue_Winter_1984-85_1984_Amstrad_Consumer_Electronics

// "The scan" is a flatbed scan of both faces of an Amsoft C15 [C], rectified here to its outline, ±0.5 [E]: https://oldwiki.cpcwiki.eu/imgs/f/f1/Amsoft_C15.jpg; a scan of another one agrees with it within that [E]: https://oldwiki.cpcwiki.eu/imgs/e/e3/C15_Tape.jpg
// The label lies 6.2 to 94.8 across and 17.4 to 57.1 back, its rear corners cut off at 45° 4 along each edge, and cut away where the shell's window shows. The window's plate reads as dark as the shell, and nothing behind it shows through, but in a clear rectangle 39.3 to 61.3 across by 33.4 to 40.6 back, through which the side's first pack shows, and the hubs show through their own holes [E]. Its screws hold side A only: side B carries none [E].
const LABEL = { left: 6.2, right: 94.8, front: 17.4, back: 57.1, cut: 4 },
  CLEAR = { left: 39.3, right: 61.3, front: 33.4, back: 40.6 }

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

const LANGUAGE = "es"

const LABEL_WIDTH = LABEL.right - LABEL.left,
  LABEL_DEPTH = LABEL.back - LABEL.front

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

    const dashAt = row.dots - counterDash.above,
      dash = drawLine([counterDash.left, dashAt], [counterDash.right, dashAt], line)

    drawn.push(dash)

    for (const [from, to] of counterLines) {
      const ruled = drawLine([from, row.line], [to, row.line], line)

      drawn.push(ruled)
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
  const opening = windowOutline(),
    writing = writingArea()

  return {
    tessellation: TESSELLATION,
    parts: [
      buildShell(LABEL, SHELL),
      ...buildWindows(CLEAR, "window-clear", WINDOW_PLATE, CLEAR_PLASTIC),
      buildLabel(LABEL, opening, PAPER, [writing]),
      buildScrews(SCREW_METAL),
      ...buildReels(HUB_PLASTIC, TAPE_OXIDE),
      buildFrontTape(TAPE_OXIDE)
    ],
    prints: [{ name: LABEL_PRINT, language: LANGUAGE, svg: drawLabel(), pixels: LABEL_PIXELS }]
  }
}
