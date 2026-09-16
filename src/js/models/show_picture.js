import { MeshBasicNodeMaterial } from "three/webgpu"
import { loadTexture } from "./load_texture"

export async function showPicture(model, url, anisotropy) {
  const picture = await loadTexture(url, anisotropy),
    material = new MeshBasicNodeMaterial({ map: picture })

  model.traverse(function (object) {
    const lit = Object.hasOwn(object.userData, "screen")

    if (lit) {
      object.material = material
    }
  })
}
