import { attribute, materialColor, mix, select, texture, uv } from "three/tsl"
import { MeshStandardNodeMaterial } from "three/webgpu"

export default function createKeycapMaterial(keycap, atlas) {
  const legend = attribute("_LEGEND", "vec4"),
    legendCorner = legend.xy,
    legendSize = legend.zw,
    top = uv(),
    fromMiddle = top.sub(0.5).abs(),
    onTop = fromMiddle.x.max(fromMiddle.y).lessThanEqual(0.5),
    stretched = top.mul(legendSize),
    printedAt = legendCorner.add(stretched),
    printed = texture(atlas, printedAt),
    ink = select(onTop, printed.a, 0),
    material = new MeshStandardNodeMaterial({
      color: keycap.color,
      roughness: keycap.roughness,
      metalness: keycap.metalness
    })

  material.colorNode = mix(materialColor, printed.rgb, ink)

  return material
}
