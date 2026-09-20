import { Box3, Vector3 } from "three/webgpu"
import DiscLabel from "./disc_label"
import REDUCED_MOTION from "./reduced_motion"

// How long the disc takes on each leg of its journey, in milliseconds, is a presentation choice, not a measurement of the machine.
const LIFT = 360,
  PUSH = 520,
  POP = 200,
  LOWER = 420

// The drive's opening is 36 high, from the parts printed to plug it [D]: https://www.thingiverse.com/thing:2876318
// Its slot's middle stands 21.7 above that opening's lower edge, rectified from two photographs of the front, the EME-150 drawing's 21 agreeing [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html and https://www.cpcwiki.eu/index.php/File:Panasonic-3_inch_Floppy_Drive_EME-150.pdf
// The remaining 14.3 is read down from the opening's upper edge because that is the edge the drive's solid keeps: its lower edge is held a hairline clear of the cabinet, and a disc laid from there would stand its own upper face in the plane of the slot's.
const SLOT_MIDDLE_BELOW_OPENING = 0.0143

// Neither how far in a seated disc stands, nor how far an eject throws it back
// out, is measured anywhere: its label end is taken flush with the drive's face
// and the throw at 30 mm, enough of the disc to take hold of.
const THROWN_OUT = 0.03

export default class Disc {
  model
  #bound
  #label
  #from = new Vector3()
  #journey = []
  #mouth = new Vector3()
  #proud = new Vector3()
  #rest = new Vector3()
  #seated = new Vector3()
  #started = null

  constructor(model, drive) {
    model.updateWorldMatrix(true, false)
    drive.updateWorldMatrix(true, false)

    const face = new Box3().setFromObject(drive),
      lying = new Box3().setFromObject(model),
      across = (face.min.x + face.max.x) / 2,
      slot = face.max.y - SLOT_MIDDLE_BELOW_OPENING,
      middle = (lying.min.y + lying.max.y) / 2 - model.position.y,
      headEnd = lying.min.z - model.position.z,
      labelEnd = lying.max.z - model.position.z

    const label = model.getObjectByName("label")

    this.model = model
    this.#label = new DiscLabel(label)
    this.#rest.copy(model.position)
    this.#mouth.set(across, slot - middle, face.max.z - headEnd)
    this.#seated.set(across, slot - middle, face.max.z - labelEnd)
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

  // A file the machine would not read was never a disc, so the label it was
  // shown under is taken off again.
  erase() {
    this.#label.erase()
  }

  eject() {
    const throwing = this.#bound == this.#seated

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
