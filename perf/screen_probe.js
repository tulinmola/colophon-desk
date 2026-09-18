import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  RenderTarget,
  SRGBColorSpace,
  Scene,
  WebGPURenderer
} from "three/webgpu"
import { ScreenMaterial } from "../src/js/models/index.js"
import { texture } from "three/tsl"

// CPC_FRAMEBUFFER_WIDTH and CPC_FRAMEBUFFER_HEIGHT in the emulator's src/cpc.h, which the probe cannot ask for because it stands without the module.
const RASTER = { columns: 1024, rows: 312 }

// The plane carries that raster at the shape the beam sweeps, not the CTM644's aperture: the probe exercises the shader's arithmetic, not the tube.
export default async function createScreen(options = {}) {
  const renderer = new WebGPURenderer(options),
    data = new Uint8Array(RASTER.columns * RASTER.rows * 4),
    picture = new DataTexture(data, RASTER.columns, RASTER.rows),
    geometry = new PlaneGeometry(0.394, 0.24),
    target = new RenderTarget(256, 192, { depthBuffer: false }),
    camera = new PerspectiveCamera(35, 256 / 192, 0.01, 5),
    scene = new Scene()

  await renderer.init()
  renderer.setSize(256, 192)
  renderer.setRenderTarget(target)
  renderer.info.autoReset = false
  picture.colorSpace = SRGBColorSpace
  picture.minFilter = LinearMipmapLinearFilter
  picture.magFilter = LinearFilter
  picture.generateMipmaps = true
  picture.anisotropy = renderer.getMaxAnisotropy()
  geometry.rotateX(-Math.PI / 2)
  camera.up.set(0, 0, -1)

  const node = texture(picture),
    material = new ScreenMaterial(geometry, node, RASTER.rows),
    settings = material.settings,
    screen = new Mesh(geometry, material)

  scene.add(screen)

  function frame(red, green, blue, start = 0) {
    for (let index = 0; index < data.length; index += 4) {
      const column = (index / 4) % RASTER.columns,
        lit = column >= start

      data[index] = lit ? red : 0
      data[index + 1] = lit ? green : 0
      data[index + 2] = lit ? blue : 0
      data[index + 3] = 255
    }

    picture.needsUpdate = true
  }

  async function render(distance, angle = 0, translation = 0) {
    const across = Math.sin(angle) * distance + translation,
      above = Math.cos(angle) * distance

    camera.position.set(across, above, 0)
    camera.lookAt(translation, 0, 0)
    renderer.info.reset()
    renderer.render(scene, camera)

    const pixels = await renderer.readRenderTargetPixelsAsync(target, 96, 64, 64, 64),
      means = [0, 0, 0]

    for (let index = 0; index < pixels.length; index += 4) {
      for (let channel = 0; channel < 3; channel++) {
        means[channel] += pixels[index + channel] / (64 * 64 * 255)
      }
    }

    return {
      means,
      pixels: Array.from(pixels),
      draws: renderer.info.render.drawCalls
    }
  }

  function dispose() {
    geometry.dispose()
    material.dispose()
    picture.dispose()
    target.dispose()
    renderer.dispose()
  }

  function shader() {
    return renderer.debug.getShaderAsync(scene, camera, screen)
  }

  frame(255, 255, 255)
  camera.position.set(0, 0.5, 0)
  camera.lookAt(0, 0, 0)
  await renderer.compileAsync(scene, camera)

  return { frame, render, settings, shader, dispose }
}
