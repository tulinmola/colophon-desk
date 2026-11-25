import { Box3 } from "three/webgpu"

// A Box3 takes an object's parents' matrices as they last stood, and no frame may have been drawn yet.
export default function boundsOf(object) {
  const bounds = new Box3()

  object.updateWorldMatrix(true, false)
  bounds.setFromObject(object)

  return bounds
}
