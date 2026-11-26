import { Group, MathUtils, Scene, Vector3 } from "three/webgpu"
import Model from "./model"
import Pose from "./pose"
import REDUCED_MOTION from "./reduced_motion"
import boundsOf from "./bounds_of"

// Each computer is seen alone in a frame of its own, every frame at one scale: as high, in metres, with the same margin either side, room enough for a computer come nearer to turn in. Both are presentation choices.
const FRAME_HEIGHT = 0.34,
  MARGIN = 0.05

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

const UP = new Vector3(0, 1, 0)

export default class LineUp {
  #computers = new Map()
  #distance
  #lastFrameAt = null
  #shown = null

  constructor() {
    const halfField = MathUtils.degToRad(Pose.FIELD_OF_VIEW / 2)

    this.#distance = FRAME_HEIGHT / (2 * Math.tan(halfField))
  }

  async load(computers, { anisotropy, studio }) {
    const loading = computers.map(({ name, language }) =>
        Model.load(name, { anisotropy, small: true, language })
      ),
      models = await Promise.all(loading)

    for (const [index, model] of models.entries()) {
      this.stand(computers[index].name, model, studio)
    }
  }

  // Each computer stands alone in a scene of its own, turning about its middle.
  stand(name, model, studio) {
    const bounds = boundsOf(model),
      middle = new Vector3(),
      pivot = new Group(),
      scene = new Scene(),
      span = bounds.max.x - bounds.min.x + 2 * MARGIN,
      computer = { model, pivot, scene, middle, span, approach: 0, turn: 0, shownAt: null }

    bounds.getCenter(middle)
    pivot.position.copy(middle)
    model.position.sub(middle)
    pivot.add(model)
    studio.light(scene)
    scene.add(pivot)
    this.#computers.set(name, computer)
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

      moving ||= approaching || turning
    }

    this.#lastFrameAt = moving ? now : null

    return moving
  }

  // Each computer in the frame the page gives it.
  views(frameOf) {
    const views = []

    for (const [name, computer] of this.#computers) {
      const pose = this.#poseOf(computer),
        frame = frameOf(name)

      views.push({ name, pose, frame, scene: computer.scene, clipped: true })
    }

    return views
  }

  // The computer leaves the line-up as it stands, turned about its middle
  // under the same light, for whatever takes it to turn square.
  release(name) {
    const computer = this.#computers.get(name),
      { model, pivot, middle, turn } = computer,
      pose = this.#poseOf(computer),
      turned = middle.clone()

    turned.applyAxisAngle(UP, turn)
    pivot.remove(model)
    model.rotation.y = turn
    model.position.subVectors(middle, turned)
    this.#computers.delete(name)

    return { model, pose }
  }

  dispose() {
    for (const { model } of this.#computers.values()) {
      model.dispose()
    }
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

  #poseOf({ middle, approach }) {
    const pose = new Pose(),
      eased = MathUtils.smoothstep(approach, 0, 1),
      elevation = MathUtils.lerp(RESTING_ELEVATION, SHOWN_ELEVATION, eased)

    pose.aim.copy(middle)
    pose.aim.y -= AIM_DROP * eased
    pose.elevation = MathUtils.degToRad(elevation)
    pose.distance = this.#distance / MathUtils.lerp(1, NEARER, eased)

    return pose
  }
}
