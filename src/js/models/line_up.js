import {
  DirectionalLight,
  Group,
  MathUtils,
  PMREMGenerator,
  PerspectiveCamera,
  Scene,
  Vector3
} from "three/webgpu"
import Model from "./model"
import REDUCED_MOTION from "./reduced_motion"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"
import boundsOf from "./bounds_of"

// Each computer is seen alone in a frame of its own, every frame at one scale: as high, in metres, seen through the same field, in degrees, with the same margin either side, room enough for a computer come nearer to turn in. All are presentation choices.
const FRAME_HEIGHT = 0.34,
  MARGIN = 0.05,
  FIELD_OF_VIEW = 15

// At rest a computer is seen from above; shown, it comes nearer as the eye drops toward its front, and turns from that moment, gathering speed slowly, for as long as it is shown. The eye then aims below its middle, in metres, because the end turned toward it dips further than the far end rises. Presentation choices: elevations in degrees, how many times nearer, how long each takes in milliseconds, and the turn in radians a second.
const RESTING_ELEVATION = 40,
  SHOWN_ELEVATION = 22,
  NEARER = 1.08,
  AIM_DROP = 0.03,
  APPROACH_MILLISECONDS = 450,
  TURN_GATHERING = 4000,
  TURN_SPEED = 0.35,
  SETTLE_MILLISECONDS = 250

// Closer than this, in radians, a turn settling back has arrived.
const SETTLED = 0.001

// The studio's light is a presentation choice too: soft reflections from a room, a key light from the front left, and a rim from behind that draws a dark case's edges against the dark.
const ROOM_BLUR = 0.04,
  ROOM_INTENSITY = 0.3,
  KEY = { position: [-0.8, 0.9, 0.6], intensity: 3.2 },
  RIM = { position: [0.4, 0.5, -1], intensity: 4.5 }

// Answers the render target holding the room's reflections: disposing its texture alone frees nothing on the GPU.
function lightStudio(scene, renderer) {
  const room = new RoomEnvironment(),
    generator = new PMREMGenerator(renderer),
    reflections = generator.fromScene(room, ROOM_BLUR),
    key = new DirectionalLight(0xffffff, KEY.intensity),
    rim = new DirectionalLight(0xffffff, RIM.intensity)

  scene.environment = reflections.texture
  scene.environmentIntensity = ROOM_INTENSITY
  key.position.set(...KEY.position)
  rim.position.set(...RIM.position)
  scene.add(key, rim)
  room.dispose()
  generator.dispose()

  return reflections
}

export default class LineUp {
  scene = new Scene()
  #computers = new Map()
  #distance
  #lastFrameAt = null
  #reflections
  #shown = null

  async load(names, renderer) {
    const anisotropy = renderer.getMaxAnisotropy(),
      loading = names.map(name => Model.load(name, { anisotropy, small: true })),
      models = await Promise.all(loading),
      halfField = MathUtils.degToRad(FIELD_OF_VIEW / 2)

    this.#distance = FRAME_HEIGHT / (2 * Math.tan(halfField))
    this.#reflections = lightStudio(this.scene, renderer)

    for (const [index, model] of models.entries()) {
      const bounds = boundsOf(model),
        middle = new Vector3(),
        pivot = new Group(),
        camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, this.#distance / 10, this.#distance * 10),
        span = bounds.max.x - bounds.min.x + 2 * MARGIN,
        computer = { model, pivot, camera, middle, span, approach: 0, turn: 0, shownAt: null }

      bounds.getCenter(middle)
      pivot.position.copy(middle)
      model.position.sub(middle)
      pivot.add(model)
      this.#aim(computer)
      this.#computers.set(names[index], computer)
      this.scene.add(pivot)
    }
  }

  // How wide a computer's frame is, in metres, and how wide for its height.
  frameOf(name) {
    const { span } = this.#computers.get(name)

    return { span, aspect: span / FRAME_HEIGHT }
  }

  show(name) {
    this.#shown = name
  }

  advance(now) {
    const elapsed = this.#lastFrameAt == null ? 0 : now - this.#lastFrameAt

    let moving = false

    for (const [name, computer] of this.#computers) {
      const shown = name == this.#shown,
        approaching = this.#approach(computer, shown, elapsed),
        turning = this.#turn(computer, shown, now, elapsed)

      this.#aim(computer)
      moving ||= approaching || turning
    }

    this.#lastFrameAt = moving ? now : null

    return moving
  }

  #approach(computer, shown, elapsed) {
    const target = shown ? 1 : 0,
      step = REDUCED_MOTION.matches ? 1 : elapsed / APPROACH_MILLISECONDS,
      remaining = target - computer.approach

    computer.approach += Math.sign(remaining) * Math.min(Math.abs(remaining), step)

    return computer.approach != target
  }

  // A computer shown turns, gathering speed slowly; one no longer shown turns
  // back the shorter way.
  #turn(computer, shown, now, elapsed) {
    const still = REDUCED_MOTION.matches

    if (shown) {
      computer.shownAt ??= now

      const turningFor = now - computer.shownAt,
        gathered = MathUtils.clamp(turningFor / TURN_GATHERING, 0, 1),
        speed = still ? 0 : TURN_SPEED * gathered ** 2

      computer.turn += (speed * elapsed) / 1000
      computer.pivot.rotation.y = computer.turn

      return !still
    }

    const back = Math.atan2(Math.sin(computer.turn), Math.cos(computer.turn)),
      settled = still || Math.abs(back) < SETTLED,
      closing = 1 - Math.exp(-elapsed / SETTLE_MILLISECONDS)

    computer.shownAt = null
    computer.turn = settled ? 0 : back - back * closing
    computer.pivot.rotation.y = computer.turn

    return !settled
  }

  #aim({ camera, middle, approach }) {
    const eased = MathUtils.smoothstep(approach, 0, 1),
      elevationDegrees = MathUtils.lerp(RESTING_ELEVATION, SHOWN_ELEVATION, eased),
      elevation = MathUtils.degToRad(elevationDegrees),
      distance = this.#distance / MathUtils.lerp(1, NEARER, eased),
      aim = middle.clone()

    aim.y -= AIM_DROP * eased
    camera.position.set(
      aim.x,
      aim.y + distance * Math.sin(elevation),
      aim.z + distance * Math.cos(elevation)
    )
    camera.lookAt(aim)
  }

  // Draws each computer alone into its own frame on the canvas, in CSS pixels
  // from its top left. The canvas is cleared once: a clear on WebGPU reaches
  // past the scissor to the whole of it.
  render(renderer, frames) {
    renderer.autoClear = false
    renderer.clear()
    renderer.setScissorTest(true)

    for (const { name, left, top, width, height } of frames) {
      const { camera } = this.#computers.get(name)

      for (const [each, { pivot }] of this.#computers) {
        pivot.visible = each == name
      }

      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setViewport(left, top, width, height)
      renderer.setScissor(left, top, width, height)
      renderer.render(this.scene, camera)
    }

    renderer.setScissorTest(false)
  }

  dispose() {
    for (const { model } of this.#computers.values()) {
      model.dispose()
    }

    this.#reflections.dispose()
  }
}
