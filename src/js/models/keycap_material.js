import {
  attribute,
  materialColor,
  mix,
  positionLocal,
  select,
  texture,
  uniform,
  uniformArray,
  uv,
  vec3
} from "three/tsl"
import { MeshStandardNodeMaterial } from "three/webgpu"

const MILLIMETRES = 0.001

// How far a cap sinks when its key is held. No source here gives the travel of
// a 6128's keys and no unit has been measured, so this is a guess, and the
// knob on the page is the whole of what stands behind it.
const KEY_TRAVEL = 3

export default class KeycapMaterial extends MeshStandardNodeMaterial {
  settings = { keyTravel: uniform(KEY_TRAVEL) }

  constructor(keycap, atlas, keys) {
    const { color, roughness, metalness } = keycap

    super({ color, roughness, metalness })

    const legend = attribute("_LEGEND", "vec4"),
      legendCorner = legend.xy,
      legendSize = legend.zw,
      top = uv(),
      fromMiddle = top.sub(0.5).abs(),
      onTop = fromMiddle.x.max(fromMiddle.y).lessThanEqual(0.5),
      stretched = top.mul(legendSize),
      printedAt = legendCorner.add(stretched),
      printed = texture(atlas, printedAt),
      ink = select(onTop, printed.a, 0)

    const key = attribute("_KEY", "float"),
      held = uniformArray(keys, "float").element(key.toInt()),
      sunk = this.settings.keyTravel.mul(held).mul(MILLIMETRES)

    this.colorNode = mix(materialColor, printed.rgb, ink)
    this.positionNode = positionLocal.sub(vec3(0, sunk, 0))
  }
}
