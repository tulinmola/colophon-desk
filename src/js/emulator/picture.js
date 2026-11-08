import {
  Color,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NearestFilter,
  RedFormat,
  SRGBColorSpace,
  UnsignedByteType,
  Vector3
} from "three/webgpu"
import { rtt, texture, uniformArray, uv, vec3 } from "three/tsl"

const CHANNEL_MAX = 0xff

// A machine tabulates what a monitor displays, and the tube's arithmetic
// averages light, so each entry crosses to linear here. A level on a single
// pin is taken through the same curve: no tube's own is documented, and sRGB's
// was drawn after the tubes of its day.
function linearLight([red, green, blue]) {
  const shown = new Color().setRGB(red, green, blue, SRGBColorSpace)

  return new Vector3(shown.r, shown.g, shown.b)
}

// The samples a machine drew, each the code it put on its cable, laid through
// what each code is worth on the pins a monitor reads. A palette position
// means nothing between one entry and the next, so the codes become colour
// before anything filters, mips or blurs them.
export default class Picture {
  node
  lines

  #indices
  #palette
  #signals

  // What each of a machine's codes puts on its cable, decoded by rgb as
  // 0xRRGGBB, as red, green and blue from nothing to full.
  static coloursOf(rgb, colourCodes) {
    const colours = []

    for (let code = 0; code < colourCodes; code++) {
      const packed = rgb(code),
        red = (packed >> 16) & CHANNEL_MAX,
        green = (packed >> 8) & CHANNEL_MAX,
        blue = packed & CHANNEL_MAX

      colours.push([red / CHANNEL_MAX, green / CHANNEL_MAX, blue / CHANNEL_MAX])
    }

    return colours
  }

  // Each signal names the pins that carry it and gives, code by code, the red,
  // green and blue a monitor reading them shows. No code is worth anything
  // until a monitor is connected.
  constructor(framebuffer, { columns, rows, colourCodes, anisotropy, signals }) {
    const indices = new DataTexture(framebuffer, columns, rows, RedFormat, UnsignedByteType)

    indices.minFilter = NearestFilter
    indices.magFilter = NearestFilter
    indices.generateMipmaps = false
    indices.needsUpdate = true

    const unlit = Array.from({ length: colourCodes }, () => new Vector3()),
      palette = uniformArray(unlit, "vec3"),
      sample = texture(indices, uv()),
      // A byte read from an R8 texture arrives as a fraction of 255, and the
      // code is what it was before that division.
      code = sample.r.mul(CHANNEL_MAX).add(0.5).floor().toInt(),
      entry = palette.element(code),
      converted = vec3(entry)

    // Nothing here changes but the bytes, so the pass is run when they move
    // rather than on every frame the page draws.
    const node = rtt(converted, columns, rows, {
      type: UnsignedByteType,
      colorSpace: SRGBColorSpace,
      generateMipmaps: true,
      minFilter: LinearMipmapLinearFilter,
      magFilter: LinearFilter,
      autoUpdate: false,
      anisotropy
    })

    this.#indices = indices
    this.#palette = palette
    this.#signals = signals
    this.node = node
    this.lines = rows
    this.refresh()
  }

  // The pass is run again to lay the codes through the lights they now stand
  // for.
  connect(pins) {
    const colours = this.#palette.array,
      shown = this.#signals[pins]

    for (const [code, channels] of shown.entries()) {
      const light = linearLight(channels)

      colours[code].copy(light)
    }

    this.refresh()
  }

  // The bytes are the machine's own, so a frame is drawn by saying they moved.
  refresh() {
    this.#indices.needsUpdate = true
    this.node.textureNeedsUpdate = true
  }

  dispose() {
    this.#indices.dispose()
    this.node.dispose()
  }
}
