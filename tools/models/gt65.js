import {
  BADGE_FACE,
  CABINET,
  CENTRING,
  CONTROLS_HEIGHT,
  HEROS,
  HEROS_CAP_HEIGHT,
  HEROS_CONDENSED,
  HEROS_CONDENSED_CAP_HEIGHT,
  HEROS_X_HEIGHT,
  LEGEND_FACE,
  LEGEND_INK,
  OVERRUN,
  PANEL_SET_BACK,
  PLATE_PIXELS,
  TESSELLATION,
  buildBadgePanel,
  buildFrontCabinet,
  buildGrilleFloor,
  buildPanelPlate,
  buildPanelRecess,
  buildPowerButton,
  buildRearCabinet,
  buildScreen,
  buildWheels,
  downOn,
  drawAmstradBadge,
  drawFittedWord,
  drawModelWords,
  drawPanel,
  fontSize,
  panelFrame
} from "./green_monitor.js"
import { draw, makeBox, makeCylinder } from "replicad"
import drawSchneiderMark from "./schneider.js"

// The GT65, Amstrad's green monitor with its second front, 170831, cut for a 12V DC jack [A], CPC6128/CTM644/GT65 Service Manual p19: https://archive.org/details/amstrad-cpc-6128-micro-computer-ctm-644-color-monitor-gt-65-green-monitor-service-manual. All else is the GT64's, as green_monitor.js draws it, and the face is measured as there, down from its top and across from its left side. On the lower panel every figure is given down from the controls' middle.
// It is drawn as it was sold with the 664 and the first 6128s, its front the GT64's in shape but for the jack, its badge at the left; the later GT65-2 is a moulding of its own. The front is read on units of the first kind [E]: a Schneider unit from the front and its lower panel square-on, https://oldcrap.org/2018/11/04/amstrad-schneider-gt-65-monitor/; the Living Computer Museum's English unit, https://commons.wikimedia.org/wiki/File:CPC464(2).jpg, and CPCWiki's, https://oldwiki.cpcwiki.eu/imgs/b/b8/GT65_front_dials.jpg; and French units at the Cité des sciences, https://commons.wikimedia.org/wiki/File:Amstrad_CPC_464-IMG_4849.JPG, and at La Défense, https://commons.wikimedia.org/wiki/File:Musee_de_l%27Informatique_07.jpg. Across the lower panel each is read against the three slots' middles, but the Cité's, which is read on its panel rectified from the face's pose.
const RADIANS = Math.PI / 180

// The jack is read on the Schneider unit's lower panel square-on, and checked on its front, on CPCWiki's English unit and on the Cité's French unit from aside [E]. It stands in a round-topped recess about a middle 34.1 across, its arch of radius 10.9 about a centre 18.0 down and its foot open 28.4 down, where its floor rises to meet the panel. The recess reads about 2.4 deep, ±0.8, its walls leaning out about 35° from square to the panel. In it a black housing about a middle 19.4 down holds the socket about an axis 18.7 down and a metal pin; the housing's face stands about 1.9 behind the panel, read on the Cité's view alone.
// The housing's and the socket's sizes read sharpest on the BnF's later GT65-2, whose jack is taken to be the same part [E]: https://commons.wikimedia.org/wiki/Category:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Amstrad_-_CPC_464._Micro-ordinateur_Amstrad_CPC_464,_n%C2%B0_de_s%C3%A9rie_du_clavier_533-7834019_-_btv1b55013024n
// Where the floor starts to rise is not seen; the housing shows whole, so the rise is taken from its foot. Whether the pin is 2 or 2.5 across is not settled, and 2 is taken. How far the housing runs back, how deep the socket goes and how far inside it the pin's tip stands are not seen either: 8, 6 and 1 are taken.
const JACK_MIDDLE = 34.1,
  JACK_RECESS = { radius: 10.9, arch: 18, foot: 28.4, depth: 2.4, draft: 35 },
  JACK = {
    width: 9,
    height: 11,
    middle: 19.4,
    setBack: 1.9,
    length: 8,
    axis: 18.7,
    socket: 6.3,
    socketDepth: 6,
    pin: 2,
    pinSetBack: 1
  },
  JACK_FACE = PANEL_SET_BACK + JACK.setBack,
  JACK_AXIS = CONTROLS_HEIGHT - JACK.axis

// The housing reads #181819 and the pin #716859 in the BnF's studio, beside the GT65-2's panel at #2b2d2f [E]. Each is scaled, channel by channel, as that panel's reading is to the cabinet's colour here.
const JACK_HOUSING = { name: "jack-housing", colour: "#272526" },
  JACK_PIN = { name: "jack-pin", colour: "#b5a288" }

// "12V DC" stands under the recess on every unit of this front photographed, English, French and Schneider alike, ±0.4 [E]. Its face is a squared, extended sans no source names; Heros stands in, stretched to the width measured. It is printed on the moulding, so it is given the thinnest plate, its ink's rectangle grown by 1.
const DC_WORD = { word: "12V DC", left: 27.6, width: 13.4, capHeight: 2.5, baseline: 33.85 },
  DC_PANEL = {
    left: DC_WORD.left - 1,
    right: DC_WORD.left + DC_WORD.width + 1,
    top: CONTROLS_HEIGHT - DC_WORD.baseline + DC_WORD.capHeight + 1,
    bottom: CONTROLS_HEIGHT - DC_WORD.baseline - 1
  },
  DC_FACE = { name: "dc-legend", colour: CABINET.colour }

// The badge band, in the face's frame, ±0.5 to ±0.7 [E]. The English unit's, on the Living Computer Museum's, is the GT64's AMSTRAD wordmark beside "GT 65 Monitor", and the French unit's, on the Cité's, the same wordmark beside "GT 65 MONITEUR" in smaller capitals; both set GT and 65 closer than a word space. The wordmark's stroke is not resolved on either: the CTM644's 0.7 on capitals 12.5 tall, brought to these as on the GT64, gives the 0.45 and 0.41 taken.
// The Schneider unit's, on its front, is Schneider's mark, "Schneider" in bold over COMPUTER DIVISION in leaning capitals, and at the band's right "Green Monitor »GT65«" in upright capitals. Its capitals' lean, the 664 nameplate's 15°, is by eye.
// The lettering is taken in the panel words' ink, as on the GT64; the Schneider's reads near-white, under a warm light, uncalibrated.
const ENGLISH_BADGE = {
    amstrad: {
      word: "AMSTRAD",
      left: 17.4,
      width: 27.3,
      capHeight: 8,
      baseline: 243.9,
      stroke: 0.45
    },
    model: {
      capHeight: 3.8,
      baseline: 243.9,
      words: [
        { word: "GT", left: 48.4, width: 7.5 },
        { word: "65", left: 56.9, width: 7.5 },
        { word: "Monitor", left: 67.1, width: 19.9 }
      ]
    }
  },
  FRENCH_BADGE = {
    amstrad: {
      word: "AMSTRAD",
      left: 17,
      width: 27.3,
      capHeight: 7.3,
      baseline: 243.3,
      stroke: 0.41
    },
    model: {
      capHeight: 3.2,
      baseline: 243.5,
      words: [
        { word: "GT", left: 48.4, width: 7.9 },
        { word: "65", left: 57.5, width: 7.5 },
        { word: "MONITEUR", left: 69.3, width: 30.1 }
      ]
    }
  },
  SCHNEIDER_BADGE = {
    mark: { left: 16.8, right: 28.8, top: 235, bottom: 243.1 },
    name: { word: "Schneider", left: 29.6, width: 27.1, capHeight: 4.6, baseline: 239.7 },
    division: {
      word: "COMPUTER DIVISION",
      left: 29.6,
      width: 27.1,
      capHeight: 2.6,
      baseline: 243,
      lean: 15
    },
    model: {
      capHeight: 5.8,
      baseline: 241.9,
      words: [
        { word: "Green", left: 197.9, width: 21.5 },
        { word: "Monitor", left: 221.5, width: 27.1 },
        { word: "»GT", left: 249.9, width: 13.8 },
        { word: "65«", left: 264.5, width: 12.7 }
      ]
    }
  }

// The power marks as the Schneider unit's panel resolves them, a bar with a stub for on and a bar with a block for off, standing on one foot [E]; the other units' are drawn alike about the middles read on them.
const POWER_MARKS = {
  thickness: 0.6,
  on: { length: 2.8, raised: [1, 0.5] },
  off: { length: 2.7, raised: [1.8, 1.2] }
}

// The English unit's lower case on CPCWiki's, its ascenders 2.9 tall over a baseline 11.7 down [E], and its middle half Heros's lower case above that.
const ENGLISH_LETTERS = { height: 2.9, baseline: 11.7 },
  ENGLISH_SIZE = fontSize(ENGLISH_LETTERS.height, HEROS_CAP_HEIGHT),
  ENGLISH_MIDDLE = ENGLISH_LETTERS.baseline - (HEROS_X_HEIGHT * ENGLISH_SIZE) / 2

// The lower panel's words by the line, each line's baseline down from the controls' middle and the height of its capitals, or of its lower case's ascenders, which stand as tall.
// The English unit's across on the Living Computer Museum's, ±0.5, each word's box taken 0.3 in at each end for the blur, every word centred on its control [E]. Its power words and marks are not resolved down, so they stand from its control words as the GT64's stand from its own on Amstrad's photograph: the word over the button 3.85 above them, the words under it 2.85 below, and the marks' middle 0.5 above the lower case's, the off mark's foot half its height under that. There the GT64's control words stand 1.5 to 1.9 right of their slots and 1.1 higher, as gt64.js keeps.
// The French unit's: the Cité's words, ±1.5 across and ±0.6 down, moved 1.3 right, the bias that puts its three control words left of their slots where every other unit centres them [E]. MARCHE and ARRÊT and the marks over them read only on La Défense's unit at 1.7 pixels to the millimetre against its slots, ±1.5 across and ±2 down, and are not moved: their capitals are taken as tall as ALIMENTATION's, and the marks midway between the two lines.
// The Schneider unit's, read square-on, ±0.4 [E]: capitals centred on their controls, guide lines 0.45 wide running down from each slot and from the button toward its word, and the marks beside ON and OFF.
const ENGLISH_PANEL = {
    lines: [
      {
        ...ENGLISH_LETTERS,
        words: [
          { word: "brightness", left: 83.8, width: 25.2 },
          { word: "contrast", left: 120.8, width: 20.5 },
          { word: "v-hold", left: 159.5, width: 12.8 }
        ]
      },
      {
        height: ENGLISH_LETTERS.height,
        baseline: ENGLISH_LETTERS.baseline - 3.85,
        words: [{ word: "power", left: 246.6, width: 15.2 }]
      },
      {
        height: ENGLISH_LETTERS.height,
        baseline: ENGLISH_LETTERS.baseline + 2.85,
        words: [
          { word: "on", left: 245, width: 5.8 },
          { word: "off", left: 256.6, width: 7.1 }
        ]
      }
    ],
    marks: {
      on: 247.9,
      off: 260.6,
      foot: ENGLISH_MIDDLE - 0.5 + (POWER_MARKS.thickness + POWER_MARKS.off.raised[1]) / 2
    },
    guides: []
  },
  FRENCH_PANEL = {
    lines: [
      {
        height: 2.2,
        baseline: 13.1,
        words: [
          { word: "LUMINOSITÉ", left: 85.7, width: 21.8 },
          { word: "CONTRASTE", left: 120.2, width: 21.8 },
          { word: "VERTICAL", left: 156.7, width: 17.4 }
        ]
      },
      { height: 2, baseline: 9.4, words: [{ word: "ALIMENTATION", left: 240.6, width: 26.8 }] },
      {
        height: 2,
        baseline: 16,
        words: [
          { word: "MARCHE", left: 237, width: 14 },
          { word: "ARRÊT", left: 254, width: 11 }
        ]
      }
    ],
    marks: { on: 244, off: 260, foot: 12.6 },
    guides: []
  },
  SCHNEIDER_PANEL = {
    lines: [
      {
        height: 2.9,
        baseline: 18.9,
        words: [
          { word: "BRIGHTNESS", left: 86.3, width: 21.8 },
          { word: "CONTRAST", left: 122.1, width: 18.5 },
          { word: "V-HOLD", left: 158.8, width: 13.4 }
        ]
      },
      { height: 2.9, baseline: 17.2, words: [{ word: "POWER", left: 248.8, width: 13.4 }] },
      {
        height: 2.3,
        baseline: 20.25,
        words: [
          { word: "ON", left: 249.6, width: 4.4 },
          { word: "OFF", left: 255.4, width: 5.6 }
        ]
      }
    ],
    marks: { on: 247.9, off: 262.65, foot: 20.25 },
    guides: [
      { across: 97, from: 5.1, to: 15.2 },
      { across: 131.1, from: 5.1, to: 15.2 },
      { across: 165.5, from: 5.1, to: 15.2 },
      { across: 255.4, from: 3.9, to: 13.6 }
    ]
  },
  GUIDE_WIDTH = 0.45

// Each plate holds every version's lettering, its edges 1 outside the outermost: the badge's within the band, as the GT64's, and the lower panel's below 3.4 down, clear of the slots and the button.
const BADGE_PANEL = { left: 15.8, right: 278.2, top: 234.9, bottom: 244.5 },
  LEGEND_PANEL = {
    left: 82.8,
    right: 268.4,
    top: CONTROLS_HEIGHT - 3.4,
    bottom: CONTROLS_HEIGHT - 21.25
  }

// The recess's outline in the panel's plane: its arch about its centre, and its sides run on below its foot, where the floor's rise ends them.
function jackRecessOutline(radius) {
  const springing = CONTROLS_HEIGHT - JACK_RECESS.arch,
    below = CONTROLS_HEIGHT - JACK_RECESS.foot - JACK_RECESS.radius

  return draw([JACK_MIDDLE - radius, below])
    .lineTo([JACK_MIDDLE + radius, below])
    .lineTo([JACK_MIDDLE + radius, springing])
    .threePointsArcTo([JACK_MIDDLE - radius, springing], [JACK_MIDDLE, springing + radius])
    .close()
}

// Everything in front of the floor's slope, which falls from the panel at the recess's foot to the recess's full depth at the housing's foot, seen from the side.
function buildFloorRise() {
  const flush = CONTROLS_HEIGHT - JACK_RECESS.foot,
    full = CONTROLS_HEIGHT - JACK.middle - JACK.height / 2,
    risePerDepth = (full - flush) / JACK_RECESS.depth,
    front = PANEL_SET_BACK - 2 * OVERRUN,
    back = PANEL_SET_BACK + JACK_RECESS.depth + OVERRUN,
    reach = JACK_RECESS.radius + 2 * OVERRUN,
    side = draw([front, flush - 2 * OVERRUN * risePerDepth])
      .lineTo([back, flush + (JACK_RECESS.depth + OVERRUN) * risePerDepth])
      .lineTo([back, CONTROLS_HEIGHT])
      .lineTo([front, CONTROLS_HEIGHT])
      .close()

  return side.sketchOnPlane("YZ", JACK_MIDDLE - reach).extrude(2 * reach)
}

function buildJackRecess() {
  const spread = Math.tan(JACK_RECESS.draft * RADIANS),
    mouth = jackRecessOutline(JACK_RECESS.radius + OVERRUN * spread).sketchOnPlane("XZ", [
      0,
      PANEL_SET_BACK - OVERRUN,
      0
    ]),
    floor = jackRecessOutline(JACK_RECESS.radius - JACK_RECESS.depth * spread).sketchOnPlane("XZ", [
      0,
      PANEL_SET_BACK + JACK_RECESS.depth,
      0
    ]),
    walls = mouth.loftWith(floor, { ruled: true }),
    rise = buildFloorRise()

  return walls.intersect(rise)
}

// The housing stands in a pocket of its own shape, cut through the recess's floor.
function jackHousing() {
  const middle = CONTROLS_HEIGHT - JACK.middle

  return makeBox(
    [JACK_MIDDLE - JACK.width / 2, JACK_FACE, middle - JACK.height / 2],
    [JACK_MIDDLE + JACK.width / 2, JACK_FACE + JACK.length, middle + JACK.height / 2]
  )
}

function buildJack() {
  const housing = jackHousing(),
    socket = makeCylinder(
      JACK.socket / 2,
      JACK.socketDepth + OVERRUN,
      [JACK_MIDDLE, JACK_FACE - OVERRUN, JACK_AXIS],
      [0, 1, 0]
    ),
    cut = housing.cut(socket)

  return { name: "jack", shape: cut.translate(CENTRING), material: JACK_HOUSING }
}

function buildJackPin() {
  const pin = makeCylinder(
    JACK.pin / 2,
    JACK.socketDepth - JACK.pinSetBack + OVERRUN,
    [JACK_MIDDLE, JACK_FACE + JACK.pinSetBack, JACK_AXIS],
    [0, 1, 0]
  )

  return { name: "jack-pin", shape: pin.translate(CENTRING), material: JACK_PIN }
}

function drawStyledWord(fitted, { family, perEm, weight, lean }) {
  const size = fontSize(fitted.capHeight, perEm)

  return `<text transform="translate(${fitted.left} ${fitted.baseline}) skewX(${-lean})" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${LEGEND_INK}" textLength="${fitted.width}" lengthAdjust="spacingAndGlyphs">${fitted.word}</text>`
}

function drawSchneiderBadge() {
  const { mark, name, division, model } = SCHNEIDER_BADGE,
    words = drawModelWords(model),
    drawn = [
      drawSchneiderMark(mark, LEGEND_INK),
      drawStyledWord(name, { family: HEROS, perEm: HEROS_CAP_HEIGHT, weight: 700, lean: 0 }),
      drawStyledWord(division, {
        family: HEROS_CONDENSED,
        perEm: HEROS_CONDENSED_CAP_HEIGHT,
        weight: 400,
        lean: division.lean
      }),
      ...words
    ].join("\n")

  return drawPanel(BADGE_PANEL, BADGE_FACE.colour, drawn)
}

// A power mark stands on its bar's foot, the part raised over the bar's middle.
function drawPowerMark(middle, foot, { length, raised }) {
  const [width, height] = raised,
    barTop = foot - POWER_MARKS.thickness

  return [
    `<rect x="${middle - length / 2}" y="${barTop}" width="${length}" height="${POWER_MARKS.thickness}" fill="${LEGEND_INK}"/>`,
    `<rect x="${middle - width / 2}" y="${barTop - height}" width="${width}" height="${height + POWER_MARKS.thickness}" fill="${LEGEND_INK}"/>`
  ].join("\n")
}

function drawGuide({ across, from, to }) {
  const top = downOn(LEGEND_PANEL, from),
    bottom = downOn(LEGEND_PANEL, to)

  return `<line x1="${across}" y1="${top}" x2="${across}" y2="${bottom}" stroke="${LEGEND_INK}" stroke-width="${GUIDE_WIDTH}"/>`
}

function drawLegends({ lines, marks, guides }) {
  const lettered = lines.flatMap(function ({ height, baseline, words }) {
      const down = downOn(LEGEND_PANEL, baseline)

      return words.map(fitted => drawFittedWord(fitted, height, down))
    }),
    foot = downOn(LEGEND_PANEL, marks.foot),
    drawnMarks = [
      drawPowerMark(marks.on, foot, POWER_MARKS.on),
      drawPowerMark(marks.off, foot, POWER_MARKS.off)
    ],
    drawnGuides = guides.map(drawGuide),
    frame = panelFrame(LEGEND_PANEL),
    drawn = [...lettered, ...drawnMarks, ...drawnGuides].join("\n")

  return drawPanel(frame, LEGEND_FACE.colour, drawn)
}

function drawDcLegend() {
  const down = downOn(DC_PANEL, DC_WORD.baseline),
    word = drawFittedWord(DC_WORD, DC_WORD.capHeight, down),
    frame = panelFrame(DC_PANEL)

  return drawPanel(frame, DC_FACE.colour, word)
}

// Each language the badge and the panel were lettered in, the English first. No GT65 of the first kind sold in Spain has been seen: the Spanish lettering photographed is the GT65-2's, on a unit of that moulding, https://oldwiki.cpcwiki.eu/imgs/4/4c/GT65_01.jpg, and on others lettered alike, https://commons.wikimedia.org/wiki/File:Amstrad_CPC_464_(1984)_1.jpg [E]. So a Spanish desk shows the English, as it shows "12V DC", which reads alike in every language.
const ENGLISH = "en",
  BADGE_LETTERING = {
    en: () => drawAmstradBadge(BADGE_PANEL, ENGLISH_BADGE),
    fr: () => drawAmstradBadge(BADGE_PANEL, FRENCH_BADGE),
    de: drawSchneiderBadge
  },
  PANEL_LETTERING = { en: ENGLISH_PANEL, fr: FRENCH_PANEL, de: SCHNEIDER_PANEL }

function drawPrints() {
  const badges = Object.entries(BADGE_LETTERING).map(function ([language, drawBadge]) {
      return { name: BADGE_FACE.name, language, svg: drawBadge(), pixels: PLATE_PIXELS }
    }),
    legends = Object.entries(PANEL_LETTERING).map(function ([language, lettering]) {
      return { name: LEGEND_FACE.name, language, svg: drawLegends(lettering), pixels: PLATE_PIXELS }
    }),
    dcLegend = { name: DC_FACE.name, language: ENGLISH, svg: drawDcLegend(), pixels: PLATE_PIXELS }

  return [...badges, ...legends, dcLegend]
}

export function buildGt65() {
  const jackRecess = buildJackRecess(),
    jackPocket = jackHousing(),
    dcRecess = buildPanelRecess(DC_PANEL)

  return {
    tessellation: TESSELLATION,
    parts: [
      buildFrontCabinet(BADGE_PANEL, LEGEND_PANEL, [jackRecess, jackPocket, dcRecess]),
      buildRearCabinet(),
      buildGrilleFloor(),
      buildWheels(),
      buildPowerButton(),
      buildJack(),
      buildJackPin(),
      buildScreen(),
      buildBadgePanel(BADGE_PANEL),
      buildPanelPlate(LEGEND_PANEL, LEGEND_FACE),
      buildPanelPlate(DC_PANEL, DC_FACE)
    ],
    prints: drawPrints()
  }
}
