import { CubicBezierCurve3, Quaternion, Vector3 } from "three/webgpu"
import Motion from "./motion"
import REDUCED_MOTION from "./reduced_motion"
import boundsOf from "./bounds_of"

// A plug let go lies on the desk this far out of its socket, turned this far askew, in metres and radians; a hand lifts it this far off its way as it carries it, and faces it to its socket this far out, far enough for it to clear the socket and whatever stands proud around it. How long the hand takes to bring a plug to face its socket, to push it home, to pull it out and to set it down, in milliseconds. Presentation choices.
const LYING_OUT = 0.05,
  LYING_TURN = 0.15,
  LIFT = 0.03,
  FACING = 0.015,
  BRINGING_MILLISECONDS = 650,
  PUSHING_MILLISECONDS = 180,
  PULLING_MILLISECONDS = 160,
  SETTING_DOWN_MILLISECONDS = 420

const UP = new Vector3(0, 1, 0)

function placeOf({ position, quaternion }) {
  return { position: position.clone(), quaternion: quaternion.clone() }
}

// A way from one place to another, lifted off the desk between them.
function wayBetween(from, to, lift) {
  const leaving = from.clone().addScaledVector(UP, lift),
    arriving = to.clone().addScaledVector(UP, lift)

  return new CubicBezierCurve3(from, leaving, arriving, to)
}

// The phases of a hand's motion ease themselves.
function even(progress) {
  return progress
}

// A part a hand carries into its socket and out of it, as a lead's plug or a
// drive's interface, whatever trails behind it laid again as it goes.
export default class Plug {
  static TAKING_OUT_MILLISECONDS = PULLING_MILLISECONDS + SETTING_DOWN_MILLISECONDS
  part
  #outward
  #layTrail
  #home = null
  #lying = null
  #out = null
  #loose = true
  #pushing = false

  // The way out of the socket is given in the part's own terms.
  constructor(part, outward, layTrail) {
    this.part = part
    this.#outward = outward
    this.#layTrail = layTrail
  }

  // Whether it is out of its socket, and no hand is bringing it home.
  get loose() {
    return this.#loose
  }

  // Its socket is where it stands now, and it lies on the desk before it when
  // let go. It then stands wherever it is out of its socket, and one never yet
  // out lies before it; but where motion is reduced no hand moves it, and it
  // stands in its socket.
  findSocket() {
    const reduced = REDUCED_MOTION.matches

    this.#home = placeOf(this.part)
    this.#lying = this.#lyingBefore()

    if (reduced) {
      this.#out = null
      this.#loose = false
    }

    const untouched = this.#loose && this.#out == null

    if (untouched) {
      this.#out = this.#lying
    }

    this.#stand(this.#out ?? this.#home)
  }

  // Whatever trails behind it is laid again, as when its owner moves.
  layTrail() {
    this.#layTrail()
  }

  // Put away with its owner, it is nowhere until it is next set out.
  putAway() {
    this.#out = null
    this.#loose = true
    this.#pushing = false
  }

  // Taken up from wherever it is, carried to face its socket, and pushed home.
  plugIn() {
    const from = placeOf(this.part),
      duration = REDUCED_MOTION.matches ? 0 : BRINGING_MILLISECONDS + PUSHING_MILLISECONDS,
      timing = { duration, ease: even }

    this.#loose = false
    this.#pushing = false

    return new Motion(timing, progress => this.#bringHome(from, progress))
  }

  // Pulled straight out along its socket's line if it stands on it, and set
  // down on the desk before its socket; taken in the air, it is set down from
  // there, and not lifted again.
  pullOut() {
    const from = placeOf(this.part),
      lined = this.#out == null || this.#pushing,
      out = lined ? this.#facing() : from,
      lying = this.#lying,
      lift = lined ? LIFT : 0,
      way = wayBetween(out.position, lying.position, lift),
      share = lined ? PULLING_MILLISECONDS / Plug.TAKING_OUT_MILLISECONDS : 0,
      timing = { duration: Plug.TAKING_OUT_MILLISECONDS, ease: even }

    this.#out = from
    this.#loose = true
    this.#pushing = false

    return new Motion(timing, progress => this.#takeOut({ from, out, lying, way, share }, progress))
  }

  // Its socket is read anew at every step, as a display may shift while the
  // hand brings it.
  #bringHome(from, progress) {
    const share = BRINGING_MILLISECONDS / (BRINGING_MILLISECONDS + PUSHING_MILLISECONDS),
      home = this.#home,
      facing = this.#facing(),
      bringing = progress < share,
      done = progress == 1,
      place = placeOf(home)

    this.#pushing = !bringing && !done

    if (done) {
      this.#out = null
      this.#stand(home)

      return
    }

    if (bringing) {
      const brought = Motion.easeInOut(progress / share),
        way = wayBetween(from.position, facing.position, LIFT)

      way.getPoint(brought, place.position)
      place.quaternion.slerpQuaternions(from.quaternion, home.quaternion, brought)
    } else {
      const pushed = Motion.easeIn((progress - share) / (1 - share))

      place.position.lerpVectors(facing.position, home.position, pushed)
    }

    this.#out = place
    this.#stand(place)
  }

  #takeOut({ from, out, lying, way, share }, progress) {
    const pulling = progress < share,
      place = placeOf(lying)

    if (pulling) {
      const pulled = Motion.easeOut(progress / share)

      place.position.lerpVectors(from.position, out.position, pulled)
      place.quaternion.slerpQuaternions(from.quaternion, out.quaternion, pulled)
    } else {
      const setDown = Motion.easeInOut((progress - share) / (1 - share))

      way.getPoint(setDown, place.position)
      place.quaternion.slerpQuaternions(out.quaternion, lying.quaternion, setDown)
    }

    this.#out = place
    this.#stand(place)
  }

  // A little way out of its socket, facing it.
  #facing() {
    const facing = placeOf(this.#home),
      outward = this.#outward.clone()

    outward.applyQuaternion(facing.quaternion)
    facing.position.addScaledVector(outward, FACING)

    return facing
  }

  // Out of its socket, down on the desk and a little askew, from where it
  // stands in its socket now.
  #lyingBefore() {
    const lying = placeOf(this.#home),
      outward = this.#outward.clone(),
      reach = boundsOf(this.part),
      floor = new Vector3(),
      askew = new Quaternion()

    this.part.parent.getWorldPosition(floor)
    outward.applyQuaternion(lying.quaternion)
    lying.position.addScaledVector(outward, LYING_OUT)
    lying.position.y -= reach.min.y - floor.y
    askew.setFromAxisAngle(UP, LYING_TURN)
    lying.quaternion.premultiply(askew)

    return lying
  }

  #stand({ position, quaternion }) {
    this.part.position.copy(position)
    this.part.quaternion.copy(quaternion)
    this.#layTrail()
  }
}
