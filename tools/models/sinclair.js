// Sinclair's logotype, "sinclair" in eight blocks, moulded in smooth relief on the Spectrum's raised top and on its power supply's lid. On the Bibliothèque nationale's Spectrum, from above at 17.85 pixels to the millimetre [E]: https://commons.wikimedia.org/wiki/File:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Sinclair_-_ZX_Spectrum._Micro-ordinateur_Sinclair_ZX_Spectrum,_n%C2%B0_de_s%C3%A9rie_022-007502_-_btv1b55013033m_(09_of_43).jpg
// The blocks stand 8.0 tall, parted by gaps 0.56 wide; the i's dots and the l's stem rise 3.08 above them, the dots standing 0.67 clear. Measured from its left edge: s 0 to 14.45, grooved 2.58 down from 2.41 to its right edge and 5.55 down from its left edge to 11.93; i 15.01 to 17.37; n 17.93 to 32.77, open below from 20.73 to 30.25 under a bar 2.24 deep; c 33.33 to 48.18, open to the right from 35.85 between 2.24 and 5.83 down; l 48.63 to 50.98; a 51.54 to 66.33, grooved 2.58 down from its left edge to 63.75 and 5.55 down from 54.23 to 63.75; i 66.89 to 69.47; and r 70.03 to 84.76, a bar 2.24 deep over a stem to 72.66. The grooves read about 0.45 wide [E]; the dark edge each block is drawn with, 0.15 wide, stands for the light falling off its relief and is a guess.
const MARK = { height: 8, gap: 0.56, rise: 3.08, dotGap: 0.67, groove: 0.45, edge: 0.15 },
  BLOCKS = [
    {
      left: 0,
      right: 14.45,
      grooves: [
        { left: 2.41, right: 14.45, middle: 2.58 },
        { left: 0, right: 11.93, middle: 5.55 }
      ]
    },
    { left: 15.01, right: 17.37, dot: true },
    { left: 17.93, right: 32.77, opening: { left: 20.73, right: 30.25, top: 2.24, bottom: 8 } },
    { left: 33.33, right: 48.18, opening: { left: 35.85, right: 48.18, top: 2.24, bottom: 5.83 } },
    { left: 48.63, right: 50.98, stem: true },
    {
      left: 51.54,
      right: 66.33,
      grooves: [
        { left: 51.54, right: 63.75, middle: 2.58 },
        { left: 54.23, right: 63.75, middle: 5.55 }
      ]
    },
    { left: 66.89, right: 69.47, dot: true },
    { left: 70.03, right: 84.76, opening: { left: 72.66, right: 84.76, top: 2.24, bottom: 8 } }
  ]

// How wide the mark stands, how tall its blocks, and how far the dots and the stem rise above them, at its own size.
const SINCLAIR_MARK = { width: BLOCKS.at(-1).right, height: MARK.height, rise: MARK.rise }

function drawRectangle(
  { left, right, top, bottom },
  { fill, stroke = null, thickness = 0, radius = 0 }
) {
  const outline = stroke ? ` stroke="${stroke}" stroke-width="${thickness}"` : ""

  return `<rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" rx="${radius}" fill="${fill}"${outline}/>`
}

// The mark drawn at so many times its own size, its blocks' top left corner
// where given: its faces in one ink edged in another, its gaps and grooves in
// that other, and its openings in the ground's, running on below the blocks
// as far as asked. Answers its drawing's elements.
function drawSinclairMark({ x, y, scale, below }, { face, gap: gapInk, ground }) {
  const height = MARK.height * scale,
    rise = MARK.rise * scale,
    dotGap = MARK.dotGap * scale,
    groove = MARK.groove * scale,
    gap = MARK.gap * scale,
    edged = { fill: face, stroke: gapInk, thickness: MARK.edge * scale },
    band = {
      left: x + BLOCKS[0].left * scale,
      right: x + BLOCKS.at(-1).right * scale,
      top: y,
      bottom: y + height
    },
    drawn = [drawRectangle(band, { fill: gapInk })]

  for (const block of BLOCKS) {
    const top = block.stem ? y - rise : y,
      blockFace = {
        left: x + block.left * scale,
        right: x + block.right * scale,
        top,
        bottom: y + height
      },
      drawnFace = drawRectangle(blockFace, edged)

    drawn.push(drawnFace)

    if (block.dot) {
      const dot = {
          left: blockFace.left,
          right: blockFace.right,
          top: y - rise,
          bottom: y - dotGap
        },
        drawnDot = drawRectangle(dot, edged)

      drawn.push(drawnDot)
    }

    if (block.opening) {
      const opening = {
          left: x + block.opening.left * scale,
          right: x + block.opening.right * scale + gap,
          top: y + block.opening.top * scale,
          bottom: y + block.opening.bottom * scale + below
        },
        drawnOpening = drawRectangle(opening, { ...edged, fill: ground })

      drawn.push(drawnOpening)
    }

    for (const cut of block.grooves ?? []) {
      const line = {
          left: x + cut.left * scale,
          right: x + cut.right * scale,
          top: y + cut.middle * scale - groove / 2,
          bottom: y + cut.middle * scale + groove / 2
        },
        drawnGroove = drawRectangle(line, { fill: gapInk, radius: groove / 2 })

      drawn.push(drawnGroove)
    }
  }

  return drawn
}

export { SINCLAIR_MARK, drawSinclairMark }
