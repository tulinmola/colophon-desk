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

// Every value the Gate Array can put on the cable, which is the five bits the
// INKR command keeps: gate_array_rgb in the emulator's gate_array.c.
const COLOUR_CODES = 32

const CHANNEL_MAX = 0xff

// A palette position means nothing between one entry and the next, so the
// codes become colour before anything filters, mips or blurs them.
export default class CpcPicture {
  node
  lines

  #indices

  constructor(framebuffer, { columns, rows, rgb, anisotropy }) {
    const indices = new DataTexture(framebuffer, columns, rows, RedFormat, UnsignedByteType)

    indices.minFilter = NearestFilter
    indices.magFilter = NearestFilter
    indices.generateMipmaps = false
    indices.needsUpdate = true

    const colours = []

    for (let code = 0; code < COLOUR_CODES; code++) {
      const packed = rgb(code),
        red = (packed >> 16) & CHANNEL_MAX,
        green = (packed >> 8) & CHANNEL_MAX,
        blue = packed & CHANNEL_MAX,
        // gate_array_rgb tabulates what a monitor displays, and the tube's
        // arithmetic averages light, so each entry crosses to linear here.
        measured = new Color().setRGB(
          red / CHANNEL_MAX,
          green / CHANNEL_MAX,
          blue / CHANNEL_MAX,
          SRGBColorSpace
        ),
        light = new Vector3(measured.r, measured.g, measured.b)

      colours.push(light)
    }

    const palette = uniformArray(colours, "vec3"),
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
    this.node = node
    this.lines = rows
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
