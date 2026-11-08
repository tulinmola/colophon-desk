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

// The level each code puts on the MONITOR socket's pin 6, LUM, from black to
// bright white, by INKR code as gate_array_rgb is. The board mixes R, G and B
// into it through 3.3 kΩ, 1 kΩ and 10 kΩ [A], CPC464, CTM640 and GT64 Service
// Manual, circuit diagram: https://archive.org/details/amstrad-cpc-464-micro-computer-ctm-640-color-monitor-gt-64-green-monitor-service-manual
// Each level is that network fed with the colour pins a 40007 in a CPC464
// puts out, measured for every code [D], "The Gate Array" (Grim), Appendix I:
// http://web.archive.org/web/20260710174425id_/https://www.grimware.org/doku.php/documentations/devices/gatearray
// The 464's user instructions give the greys' order, the firmware's colour
// numbers rising [A], appendix 1.3: https://archive.org/details/cpc464.en, and
// the levels rise in that order [E].
const LUMINANCE = [
  0.4805, 0.4805, 0.7401, 0.9635, 0.029, 0.2551, 0.3728, 0.6094, 0.2551, 0.9635, 0.9321, 1, 0.225,
  0.2991, 0.5759, 0.6548, 0.029, 0.7401, 0.7057, 0.7773, 0, 0.0688, 0.3329, 0.418, 0.1324, 0.8456,
  0.8143, 0.8832, 0.1004, 0.1741, 0.4468, 0.5252
]

// gate_array_rgb tabulates what a monitor displays, and the tube's arithmetic
// averages light, so each entry crosses to linear here. A level on LUM is
// taken through the same curve: the green tube's own is not documented, and
// sRGB's was drawn after the tubes of its day.
function linearLight(red, green, blue) {
  const shown = new Color().setRGB(red, green, blue, SRGBColorSpace)

  return new Vector3(shown.r, shown.g, shown.b)
}

function coloursOf(rgb) {
  const colours = []

  for (let code = 0; code < COLOUR_CODES; code++) {
    const packed = rgb(code),
      red = (packed >> 16) & CHANNEL_MAX,
      green = (packed >> 8) & CHANNEL_MAX,
      blue = packed & CHANNEL_MAX,
      light = linearLight(red / CHANNEL_MAX, green / CHANNEL_MAX, blue / CHANNEL_MAX)

    colours.push(light)
  }

  return colours
}

// A palette position means nothing between one entry and the next, so the
// codes become colour before anything filters, mips or blurs them.
export default class CpcPicture {
  node
  lines

  #indices
  #palette
  #rgb

  constructor(framebuffer, { columns, rows, rgb, anisotropy }) {
    const indices = new DataTexture(framebuffer, columns, rows, RedFormat, UnsignedByteType)

    indices.minFilter = NearestFilter
    indices.magFilter = NearestFilter
    indices.generateMipmaps = false
    indices.needsUpdate = true

    const colours = coloursOf(rgb)

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
    this.#palette = palette
    this.#rgb = rgb
    this.node = node
    this.lines = rows
    this.refresh()
  }

  // A colour monitor reads the R, G and B pins, and a green one LUM alone, in
  // the one light its phosphor gives. The pass is run again to lay the codes
  // through the palette they now stand for.
  connect(pins) {
    const colours = this.#palette.array,
      signals = {
        RGB: () => coloursOf(this.#rgb),
        LUM: () => LUMINANCE.map(level => linearLight(level, level, level))
      },
      lights = signals[pins]()

    for (const [code, light] of lights.entries()) {
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
