// Schneider's mark, as its computers' nameplates and its monitors' badges carry it, drawn by eye: two hooks, the upper opening to the right over the lower opening to the left, each one's inner arm reaching to the mark's middle.
function drawSchneiderMark({ left, right, top, bottom, stroke }, ink) {
  const half = stroke / 2,
    width = right - left,
    middle = (top + bottom) / 2,
    upper = `M ${left + width * 0.7} ${top + half} H ${left + half} V ${middle - half} H ${left + width * 0.45}`,
    lower = `M ${left + width * 0.55} ${middle + half} H ${right - half} V ${bottom - half} H ${left + width * 0.3}`

  return `<path d="${upper} ${lower}" fill="none" stroke="${ink}" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="round"/>`
}

export default drawSchneiderMark
