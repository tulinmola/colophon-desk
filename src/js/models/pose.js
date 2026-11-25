import { MathUtils, Vector2, Vector3 } from "three/webgpu"

// Every view is seen through the same lens, its field in degrees, so that a computer flown from one view into another keeps its proportions on the way. A presentation choice, as are the nearest and furthest the eye sees, in metres.
const FIELD_OF_VIEW = 15,
  NEAREST = 0.01,
  FURTHEST = 100

// Where an eye stands to see what it looks at: the point it aims at, its
// heading round that point and its elevation above it, in radians, how far
// back it stands, in metres, and how far the picture is shifted across its
// frame, in halves of the frame.
export default class Pose {
  static FIELD_OF_VIEW = FIELD_OF_VIEW
  aim = new Vector3()
  distance = 1
  elevation = 0
  heading = 0
  shift = new Vector2()

  // The way from the aim to the eye.
  towardEye(into) {
    const { heading, elevation } = this

    return into.set(
      Math.sin(heading) * Math.cos(elevation),
      Math.sin(elevation),
      Math.cos(heading) * Math.cos(elevation)
    )
  }

  copy(pose) {
    this.aim.copy(pose.aim)
    this.distance = pose.distance
    this.elevation = pose.elevation
    this.heading = pose.heading
    this.shift.copy(pose.shift)

    return this
  }

  // The heading turns the shorter way round.
  lerpPoses(from, to, progress) {
    const turn = to.heading - from.heading,
      shorter = Math.atan2(Math.sin(turn), Math.cos(turn))

    this.aim.lerpVectors(from.aim, to.aim, progress)
    this.distance = MathUtils.lerp(from.distance, to.distance, progress)
    this.elevation = MathUtils.lerp(from.elevation, to.elevation, progress)
    this.heading = from.heading + shorter * progress
    this.shift.lerpVectors(from.shift, to.shift, progress)

    return this
  }

  // The camera sees the frame given, in CSS pixels on a canvas of the size
  // given, as a picture of its own, and the rest of the canvas through the
  // same lens: the reflections the glass takes from the whole canvas then
  // meet what stands on it.
  place(camera, frame, canvas) {
    const eye = new Vector3(),
      across = this.shift.x * (frame.width / 2) - frame.left,
      down = -this.shift.y * (frame.height / 2) - frame.top

    this.towardEye(eye)
    camera.fov = FIELD_OF_VIEW
    camera.near = NEAREST
    camera.far = FURTHEST
    camera.position.copy(this.aim).addScaledVector(eye, this.distance)
    camera.lookAt(this.aim)
    camera.setViewOffset(frame.width, frame.height, across, down, canvas.width, canvas.height)
  }
}
