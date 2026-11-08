import ScreenMaterial from "./screen_material"

// A monitor's screen names the pins it reads, and the machine's picture is fed
// to it on those.
export default function showPicture(model, picture) {
  let screen = null

  model.traverse(function (object) {
    const pins = object.userData.screen,
      lit = Boolean(pins)

    if (lit) {
      picture.connect(pins)
      screen = new ScreenMaterial(object.geometry, picture.node, picture.lines, pins)
      object.material = screen
    }
  })

  return screen
}
