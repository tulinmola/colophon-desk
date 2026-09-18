import ScreenMaterial from "./screen_material"

export default function showPicture(model, { node, lines }) {
  let screen = null

  model.traverse(function (object) {
    const lit = Object.hasOwn(object.userData, "screen")

    if (lit) {
      screen = new ScreenMaterial(object.geometry, node, lines)
      object.material = screen
    }
  })

  return screen
}
