import {
  BADGE_FACE,
  CONTROLS_HEIGHT,
  HEROS_CAP_HEIGHT,
  HEROS_X_HEIGHT,
  LEGEND_FACE,
  LEGEND_INK,
  PLATE_PIXELS,
  TESSELLATION,
  buildBadgePanel,
  buildFrontCabinet,
  buildGrilleFloor,
  buildPanelPlate,
  buildPowerButton,
  buildRearCabinet,
  buildScreen,
  buildWheels,
  downOn,
  drawAmstradBadge,
  drawFittedWord,
  drawPanel,
  fontSize,
  panelFrame
} from "./green_monitor.js"

// The GT64, Amstrad's green monitor with its first front, 170501, which carries no 12V DC jack [A], CPC464/CTM640/GT64 Service Manual p15: https://archive.org/details/amstrad-cpc-464-micro-computer-ctm-640-color-monitor-gt-64-green-monitor-service-manual. The face is measured as green_monitor.js measures it, down from its top and across from its left side.

// The badge band carries the AMSTRAD wordmark, outlined condensed capitals 7.5 tall, 16.4 to 44.5 across about a middle 239.5 down, and "GT 64 Monitor", capitals 3.7 tall, 47.2 to 85.5 across on a baseline 244.2 down, all on Amstrad's photograph [E], https://amstrad.eu/wp-content/uploads/ftp_cpcscene/Pubs/CPC/CPC464_Un_ordinateur_complet.pdf. The outline's stroke is not resolved there; the CTM644's 0.7 on capitals 12.5 tall, brought to these, gives the 0.45 taken.
// The lower panel names each control in lower case 3 to 4 tall over its descenders, 2.7 to its ascenders as read on the Living Computer Museum's English GT65, https://commons.wikimedia.org/wiki/File:CPC464(2).jpg, the middle of its lower case about 9.5 below the control's — "brightness" 85.7 to 111.2 across, "contrast" 122.4 to 142.5, "v-hold" 160.5 to 174.1 — and beside them "power" 248.2 to 263.1 across, 5.65 below, a dash and a filled square 9 below over "on" 247.0 to 252.4 and "off" 257.3 to 264.0, 12.35 below, read on Amstrad's photograph, that GT65's agreeing within 1 below the controls and placing the whole block 3 to the left [E]. The square reads about 1.2 across and the dash about twice as long; their thickness is taken.
// Amstrad's lettering is a geometric sans no source names, and Heros stands in for it, as green_monitor.js gives. The panel's lower case is sized by its ascenders, which stand about as tall as its capitals. Every word is fitted to the width measured for it.
const AMSTRAD_WORD = {
    word: "AMSTRAD",
    left: 16.4,
    width: 28.1,
    capHeight: 7.5,
    baseline: 243.25,
    stroke: 0.45
  },
  MODEL_WORDS = {
    capHeight: 3.7,
    baseline: 244.2,
    words: [{ word: "GT 64 Monitor", left: 47.2, width: 38.3 }]
  },
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

// The GT64 is drawn lettered in English, as Amstrad photographed it. No GT64 lettered in French or Spanish has been seen; the Spanish lettering photographed on a green monitor is the later GT65-2's [E], https://commons.wikimedia.org/wiki/File:Amstrad_CPC_464_(1984)_1.jpg
const ENGLISH = "en"

function drawBadge() {
  return drawAmstradBadge(BADGE_PANEL, { amstrad: AMSTRAD_WORD, model: MODEL_WORDS })
}

// The lower panel's words were measured down from the controls' middle, which stands above the print's top edge.
function drawLegends() {
  const size = fontSize(LEGEND_HEIGHT, HEROS_CAP_HEIGHT),
    middle = (HEROS_X_HEIGHT * size) / 2,
    controlBaseline = downOn(LEGEND_PANEL, LEGEND_DROP) + middle,
    words = CONTROL_WORDS.map(fitted => drawFittedWord(fitted, LEGEND_HEIGHT, controlBaseline)),
    power = POWER_WORDS.map(function (fitted) {
      const baseline = downOn(LEGEND_PANEL, fitted.drop) + middle

      return drawFittedWord(fitted, LEGEND_HEIGHT, baseline)
    }),
    markTop = downOn(LEGEND_PANEL, POWER_MARKS.drop) - POWER_MARKS.size / 2,
    marks = [
      `<rect x="${POWER_MARKS.on - POWER_MARKS.size}" y="${markTop + POWER_MARKS.size / 3}" width="${2 * POWER_MARKS.size}" height="${POWER_MARKS.size / 3}" fill="${LEGEND_INK}"/>`,
      `<rect x="${POWER_MARKS.off - POWER_MARKS.size / 2}" y="${markTop}" width="${POWER_MARKS.size}" height="${POWER_MARKS.size}" fill="${LEGEND_INK}"/>`
    ],
    frame = panelFrame(LEGEND_PANEL),
    drawn = [...words, ...power, ...marks].join("\n")

  return drawPanel(frame, LEGEND_FACE.colour, drawn)
}

export function buildGt64() {
  return {
    tessellation: TESSELLATION,
    parts: [
      buildFrontCabinet(BADGE_PANEL, LEGEND_PANEL),
      buildRearCabinet(),
      buildGrilleFloor(),
      buildWheels(),
      buildPowerButton(),
      buildScreen(),
      buildBadgePanel(BADGE_PANEL),
      buildPanelPlate(LEGEND_PANEL, LEGEND_FACE)
    ],
    prints: [
      { name: BADGE_FACE.name, language: ENGLISH, svg: drawBadge(), pixels: PLATE_PIXELS },
      { name: LEGEND_FACE.name, language: ENGLISH, svg: drawLegends(), pixels: PLATE_PIXELS }
    ]
  }
}
