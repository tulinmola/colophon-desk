import ScreenMaterial from "./screen_material"
import loadTexture from "./load_texture"

export default async function showPicture(model, url, anisotropy) {
  const picture = await loadTexture(url, anisotropy)
  let screen = null

  model.traverse(function (object) {
    const lit = Object.hasOwn(object.userData, "screen")

    if (lit) {
      screen = new ScreenMaterial(object.geometry, picture)
      object.material = screen
    }
  })

  return screen
}
