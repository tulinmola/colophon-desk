import { DirectionalLight, PMREMGenerator } from "three/webgpu"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"

// The studio's light is a presentation choice: soft reflections from a room, a key light from the front left, and a rim from behind that draws a dark case's edges against the dark.
const ROOM_BLUR = 0.04,
  ROOM_INTENSITY = 0.3,
  KEY = { position: [-0.8, 0.9, 0.6], intensity: 3.2 },
  RIM = { position: [0.4, 0.5, -1], intensity: 4.5 }

// One room's reflections light every scene the studio holds. They are kept as
// the render target they were drawn into: disposing its texture alone frees
// nothing on the GPU.
export default class Studio {
  #reflections

  constructor(renderer) {
    const room = new RoomEnvironment(),
      generator = new PMREMGenerator(renderer)

    this.#reflections = generator.fromScene(room, ROOM_BLUR)
    room.dispose()
    generator.dispose()
  }

  light(scene) {
    const key = new DirectionalLight(0xffffff, KEY.intensity),
      rim = new DirectionalLight(0xffffff, RIM.intensity)

    scene.environment = this.#reflections.texture
    scene.environmentIntensity = ROOM_INTENSITY
    key.position.set(...KEY.position)
    rim.position.set(...RIM.position)
    scene.add(key, rim)
  }

  dispose() {
    this.#reflections.dispose()
  }
}
