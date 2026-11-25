import { Mesh, MeshBasicNodeMaterial, PlaneGeometry } from "three/webgpu"
import { positionLocal, reflector, uniform, vec2 } from "three/tsl"

// The pieces stand on dark glass, which is staging and not part of any machine: it shows only what stands on it, as strongly as chosen here, and fades into the dark over the reach given, in metres, beyond whatever may stand on it, so that it has no edge to be seen. Presentation choices, as is how finely the reflection is drawn, as a share of the canvas.
const REFLECTANCE = 0.3,
  FADING_REACH = 0.35,
  REFLECTION_SCALE = 0.5

// It lies at the height of the desk's floor, y = 0, over the footprint given,
// as black as the page beyond it, and its reflection fades in and out by its
// presence, from 0 to 1.
export default class GlassTop extends Mesh {
  #presence
  #reflection

  constructor({ min, max }) {
    const halfWidth = (max.x - min.x) / 2,
      halfDepth = (max.z - min.z) / 2,
      width = 2 * (halfWidth + FADING_REACH),
      depth = 2 * (halfDepth + FADING_REACH),
      geometry = new PlaneGeometry(width, depth),
      reflection = reflector({ resolutionScale: REFLECTION_SCALE }),
      presence = uniform(0),
      footprint = vec2(halfWidth, halfDepth),
      beyond = positionLocal.xy.abs().sub(footprint).max(0).length(),
      fading = beyond.smoothstep(0, FADING_REACH).oneMinus(),
      strength = fading.mul(presence).mul(REFLECTANCE),
      material = new MeshBasicNodeMaterial()

    material.colorNode = reflection.rgb.mul(strength)
    super(geometry, material)
    this.#presence = presence
    this.#reflection = reflection
    this.rotation.x = -Math.PI / 2
    this.position.set((min.x + max.x) / 2, 0, (min.z + max.z) / 2)
    this.add(reflection.target)
  }

  get presence() {
    return this.#presence.value
  }

  set presence(presence) {
    this.#presence.value = presence
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
    this.#reflection.dispose()
    super.dispose()
  }
}
