// Amsoft's logotype, which its blank media carry: on the CF2's label, strokes of the bare paper 0.34 thick across and 0.44 on the slant, sheared 30°, each edged in black that is the stroke grown 0.28 and shifted 0.06 right and 0.09 down. It is drawn here from its strokes' centrelines as measured on the disc's side 1, at one width of 0.4 [E]: https://commons.wikimedia.org/wiki/File:AMSoft_Compact_Floppy_Disc_20071208.jpg
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
}

function listPoints(points) {
  const pairs = points.map(([x, y]) => `${x},${y}`)

  return pairs.join(" ")
}

// How far the inked strokes reach, their edges and the edges' shift included, from the place the logotype is drawn at.
function inkedExtent() {
  const points = [...LOGOTYPE.strokes.flat(), ...LOGOTYPE.ring],
    xs = points.map(([x]) => x),
    ys = points.map(([, y]) => y),
    half = LOGOTYPE.stroke / 2 + LOGOTYPE.edge,
    [shadowAcross, shadowDown] = LOGOTYPE.shadow

  return {
    left: Math.min(...xs) - half,
    top: Math.min(...ys) - half,
    right: Math.max(...xs) + half + shadowAcross,
    bottom: Math.max(...ys) + half + shadowDown
  }
}

const AMSOFT_INK = inkedExtent()

// The strokes in the paper's own colour over their edges in the ink's.
function drawAmsoft([across, down], { ink, paper }) {
  const [shadowAcross, shadowDown] = LOGOTYPE.shadow,
    edged = LOGOTYPE.stroke + 2 * LOGOTYPE.edge,
    lines = LOGOTYPE.strokes.map(points => `<polyline points="${listPoints(points)}"/>`),
    ring = `<polygon points="${listPoints(LOGOTYPE.ring)}"/>`,
    strokes = [...lines, ring].join("")

  return [
    `<g transform="translate(${across + shadowAcross} ${down + shadowDown})" fill="none" stroke="${ink}" stroke-width="${edged}" stroke-linejoin="bevel">${strokes}</g>`,
    `<g transform="translate(${across} ${down})" fill="none" stroke="${paper}" stroke-width="${LOGOTYPE.stroke}" stroke-linejoin="bevel">${strokes}</g>`
  ].join("\n")
}

export { AMSOFT_INK, drawAmsoft }
