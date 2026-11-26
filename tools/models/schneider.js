// Schneider's mark, as its computers' nameplates and its monitors' badges carry it: two pieces alike, the second the first turned half a turn about the mark's middle. Each stands 0.475 of the mark's width and 0.62 of its height, rounded whole at its closed end and slotted from its open end to that rounding's middle, the slot 0.167 of the piece's height, ±0.03; read on a Schneider 6128's nameplate on a photograph at about 5 pixels to the millimetre, rectified [D, E]: https://commons.wikimedia.org/wiki/File:Schneider_CPC_664_und_CPC_6128_(54853121982).jpg. The slot's end is too small there to resolve, and is taken round.
const PIECE_WIDTH = 0.475,
  PIECE_HEIGHT = 0.62,
  SLOT = 0.167

function drawSchneiderMark({ left, right, top, bottom }, ink) {
  const width = (right - left) * PIECE_WIDTH,
    height = (bottom - top) * PIECE_HEIGHT,
    radius = height / 2,
    halfSlot = (height * SLOT) / 2,
    middle = top + radius,
    bend = left + radius,
    end = left + width,
    piece = `M ${end} ${top} H ${bend} A ${radius} ${radius} 0 0 0 ${bend} ${top + height} H ${end} V ${middle + halfSlot} H ${bend} A ${halfSlot} ${halfSlot} 0 0 1 ${bend} ${middle - halfSlot} H ${end} Z`,
    turn = `rotate(180 ${(left + right) / 2} ${(top + bottom) / 2})`

  return `<path d="${piece}" fill="${ink}"/>\n<path d="${piece}" fill="${ink}" transform="${turn}"/>`
}

export default drawSchneiderMark
