import { MathUtils } from "three/webgpu"
import Motion from "./motion"
import Pose from "./pose"
import REDUCED_MOTION from "./reduced_motion"

// How long a computer takes to fly between the line-up and its set-up, in milliseconds. A presentation choice.
const FLIGHT_MILLISECONDS = 800

function between(from, to, progress) {
  return {
    left: MathUtils.lerp(from.left, to.left, progress),
    top: MathUtils.lerp(from.top, to.top, progress),
    width: MathUtils.lerp(from.width, to.width, progress),
    height: MathUtils.lerp(from.height, to.height, progress)
  }
}

// A computer seen from where it stood, in the frame it stood in, carried to
// wherever the view it flies to stands while it flies.
export default class Flight {
  static MILLISECONDS = FLIGHT_MILLISECONDS
  finished
  name
  #from
  #motion
  #pose = new Pose()
  #progress = 0

  constructor(name, { pose, frame }) {
    const duration = REDUCED_MOTION.matches ? 0 : FLIGHT_MILLISECONDS,
      timing = { duration, ease: Motion.easeInOut },
      fromPose = new Pose()

    fromPose.copy(pose)
    this.name = name
    this.#from = { pose: fromPose, frame: { ...frame } }
    this.#motion = new Motion(timing, progress => (this.#progress = progress))
    this.finished = this.#motion.finished
  }

  advance(now) {
    return this.#motion.advance(now)
  }

  over(view) {
    const { pose, frame } = this.#from,
      progress = this.#progress

    this.#pose.lerpPoses(pose, view.pose, progress)

    return { ...view, pose: this.#pose, frame: between(frame, view.frame, progress) }
  }
}
