import {
  MeshBasicNodeMaterial,
  QuadMesh,
  RenderTarget,
  SRGBColorSpace,
  WebGPURenderer
} from "three/webgpu"
import CpcPicture from "../src/js/emulator/cpc_picture.js"
import createModule from "../src/js/emulator/module.js"

// Four texels down the target, so the halves of the raster land in rows of
// their own with none of them straddling the seam.
const ACROSS = 4,
  DOWN = 4

const CHANNEL_MAX = 0xff

function channelsOf(pixels, texel) {
  const at = texel * 4

  return [pixels[at], pixels[at + 1], pixels[at + 2]]
}

// A raster of two colour codes, the first filling its top half, laid through
// the conversion the page lays it through and read back off the target.
export default async function readPicture(topCode, bottomCode) {
  const emulator = await createModule(),
    renderer = new WebGPURenderer({ antialias: false })

  await renderer.init()

  const columns = emulator._desk_framebuffer_width(),
    rows = emulator._desk_framebuffer_height(),
    framebuffer = new Uint8Array(columns * rows),
    half = Math.floor(rows / 2) * columns

  framebuffer.fill(topCode, 0, half)
  framebuffer.fill(bottomCode, half)

  const rgb = code => emulator._desk_rgb(code),
    anisotropy = renderer.getMaxAnisotropy(),
    picture = new CpcPicture(framebuffer, { columns, rows, rgb, anisotropy }),
    material = new MeshBasicNodeMaterial(),
    quad = new QuadMesh(material),
    target = new RenderTarget(ACROSS, DOWN, { depthBuffer: false })

  material.colorNode = picture.node
  material.toneMapped = false
  target.texture.colorSpace = SRGBColorSpace

  renderer.setRenderTarget(target)
  quad.render(renderer)
  renderer.setRenderTarget(null)

  const pixels = await renderer.readRenderTargetPixelsAsync(target, 0, 0, ACROSS, DOWN),
    lastRow = ACROSS * (DOWN - 1)

  function wanted(code) {
    const packed = rgb(code)

    return [(packed >> 16) & CHANNEL_MAX, (packed >> 8) & CHANNEL_MAX, packed & CHANNEL_MAX]
  }

  const read = {
    // A readback starts at the bottom of a target and ends at its top.
    bottom: channelsOf(pixels, 0),
    top: channelsOf(pixels, lastRow),
    wantTop: wanted(topCode),
    wantBottom: wanted(bottomCode)
  }

  picture.dispose()
  material.dispose()
  target.dispose()
  renderer.dispose()

  return read
}
