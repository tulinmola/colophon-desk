import { CanvasTexture, SRGBColorSpace } from "three/webgpu"
import { FAMILY } from "./handwriting"

// What a hand did with a label is measured nowhere. Three guesses stand here: that the name was written in capitals, as a title along a ruled line; that it was written in a ballpoint's blue, black being what the label's own prints are in; and that it was written at one size, a name too long for its line running out of room rather than shrinking to fit, as a hand that keeps its own size does.
const INK = "#26306a"

// Large enough that the measurement does not turn on the hinting of a small size.
const MEASURING_SIZE = 200

// The size is set by whichever of these stands tallest, so that an accent never rides out of its line.
const TALLEST = "\u00c1\u00c9\u00cd\u00d3\u00da\u00dc\u00d1"

// Patrick Hand carries no ellipsis, and three full stops are what a hand running out of line would have written anyway.
const RUNS_ON = "..."

function nameOn(filename) {
  const dot = filename.lastIndexOf("."),
    named = dot > 0,
    stem = named ? filename.slice(0, dot) : filename

  return stem.toUpperCase()
}

export default class DiscLabel {
  #areas
  #context
  #paper
  #texture

  constructor(label) {
    const print = label.material.map,
      paper = print.image,
      canvas = document.createElement("canvas")

    canvas.width = paper.width
    canvas.height = paper.height

    const texture = new CanvasTexture(canvas)

    texture.colorSpace = SRGBColorSpace
    texture.flipY = false
    texture.anisotropy = print.anisotropy

    this.#areas = label.userData.writing
    this.#context = canvas.getContext("2d")
    this.#paper = paper
    this.#texture = texture
    label.material.map = texture
    this.#print()
  }

  write(filename) {
    const name = nameOn(filename),
      context = this.#context

    this.#print()
    context.fillStyle = INK
    context.textAlign = "center"

    for (const area of this.#areas) {
      this.#writeIn(area, name)
    }

    this.#texture.needsUpdate = true
  }

  erase() {
    this.#print()
    this.#texture.needsUpdate = true
  }

  #print() {
    const context = this.#context,
      { width, height } = this.#texture.image

    context.clearRect(0, 0, width, height)
    context.drawImage(this.#paper, 0, 0, width, height)
  }

  #writeIn(area, name) {
    const context = this.#context,
      { width, height } = this.#texture.image,
      across = area.width * width,
      down = area.height * height,
      middle = (area.left + area.width / 2) * width,
      size = this.#sizeFor(down),
      written = this.#shorten(name, across, size)

    context.font = `${size}px "${FAMILY}"`

    // Set on what the name itself inks rather than on its baseline, so that it
    // stands with as much paper above it as below whether or not it carries an
    // accent or a descender.
    const ink = context.measureText(written),
      standing = ink.actualBoundingBoxAscent,
      hanging = ink.actualBoundingBoxDescent,
      baseline = area.top * height + (down - standing - hanging) / 2 + standing

    context.fillText(written, middle, baseline)
  }

  #sizeFor(down) {
    const context = this.#context

    context.font = `${MEASURING_SIZE}px "${FAMILY}"`

    const measured = context.measureText(TALLEST)

    return (down / measured.actualBoundingBoxAscent) * MEASURING_SIZE
  }

  // As much of the name as its line holds, and where it holds none of it, the
  // three stops alone.
  #shorten(name, across, size) {
    const context = this.#context

    context.font = `${size}px "${FAMILY}"`

    const measured = context.measureText(name),
      whole = measured.width <= across

    if (whole) {
      return name
    }

    for (let kept = name.length; kept > 0; kept--) {
      const shortened = `${name.slice(0, kept)}${RUNS_ON}`,
        cut = context.measureText(shortened),
        within = cut.width <= across

      if (within) {
        return shortened
      }
    }

    return RUNS_ON
  }
}
