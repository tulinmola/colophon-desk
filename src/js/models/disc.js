import { Box3, Vector3 } from "three/webgpu"
import Label from "./label"
import REDUCED_MOTION from "./reduced_motion"

// How long the disc takes on each leg of its journey, in milliseconds, is a presentation choice, not a measurement of the machine.
const LIFT = 360,
  PUSH = 520,
  POP = 200,
  LOWER = 420

// Neither how far in a seated disc stands, nor how far an eject throws it back
// out, is measured anywhere: its label end is taken flush with the drive's face
// and the throw at 30 mm, enough of the disc to take hold of.
const THROWN_OUT = 0.03

export default class Disc {
  // The room the machine gives a disc, which an image must stand inside.
  capacity

  model
  #bound
  #cpc
  #label
  #from = new Vector3()
  #journey = []
  #mouth = new Vector3()
  #proud = new Vector3()
  #rest = new Vector3()
  #seated = new Vector3()
  #started = null

  // The drive's model places its slot's middle on the face of its bezel, where
  // the disc goes in.
  constructor(model, slot, cpc) {
    model.updateWorldMatrix(true, false)

    const mouth = new Vector3(),
      lying = new Box3().setFromObject(model),
      middle = (lying.min.y + lying.max.y) / 2 - model.position.y,
      headEnd = lying.min.z - model.position.z,
      labelEnd = lying.max.z - model.position.z,
      label = model.getObjectByName("label")

    slot.getWorldPosition(mouth)

    this.capacity = cpc.discCapacity
    this.model = model
    this.#cpc = cpc
    this.#label = new Label(label)
    this.#rest.copy(model.position)
    this.#mouth.set(mouth.x, mouth.y - middle, mouth.z - headEnd)
    this.#seated.set(mouth.x, mouth.y - middle, mouth.z - labelEnd)
    this.#proud.copy(this.#seated).setZ(this.#seated.z + THROWN_OUT)
    this.#bound = this.#rest
    model.visible = false
  }

  // There is one disc here, so a disc offered while one is in takes its own place.
  insert(filename) {
    const swapping = this.#bound == this.#seated,
      journey = swapping ? [...this.#outward(), ...this.#inward()] : this.#inward()

    this.#label.write(filename)
    this.model.visible = true
    this.#travel(journey)
  }

  put(bytes) {
    return this.#cpc.insertDisc(bytes)
  }

  problem() {
    return this.#cpc.discProblem()
  }

  // A file the machine would not read was never a disc, so the label it was
  // shown under is taken off again.
  erase() {
    this.#label.erase()
  }

  // The machine lets go of the disc at once, whether or not it had it yet.
  eject() {
    const throwing = this.#bound == this.#seated

    this.#cpc.ejectDisc()

    if (throwing) {
      this.#travel(this.#outward())
    }
  }

  advance(now) {
    const travelling = this.#journey.length > 0

    if (!travelling) {
      return false
    }

    this.#started ??= now

    const [leg] = this.#journey,
      instant = leg.milliseconds == 0,
      run = instant ? 1 : (now - this.#started) / leg.milliseconds,
      progress = Math.min(run, 1),
      arrived = progress == 1

    if (arrived) {
      this.model.position.copy(leg.to)
      this.#from.copy(leg.to)
      this.#started = null
      this.#journey.shift()

      return leg.to == this.#seated
    }

    const eased = progress * progress * (3 - 2 * progress)

    this.model.position.lerpVectors(this.#from, leg.to, eased)

    return false
  }

  #inward() {
    return [
      { to: this.#mouth, milliseconds: LIFT },
      { to: this.#seated, milliseconds: PUSH }
    ]
  }

  #outward() {
    return [
      { to: this.#proud, milliseconds: POP },
      { to: this.#rest, milliseconds: LOWER }
    ]
  }

  #travel(journey) {
    const cut = REDUCED_MOTION.matches,
      legs = cut ? journey.map(leg => ({ ...leg, milliseconds: 0 })) : journey,
      [last] = legs.slice(-1)

    this.#bound = last.to
    this.#from.copy(this.model.position)
    this.#journey = legs
    this.#started = null
  }
}
