import { CatmullRomCurve3, Curve, Mesh, Quaternion, TubeGeometry, Vector3 } from "three/webgpu"

// How finely the lead is drawn, and how far it runs straight out of the boot and the plug before it bends: choices of drawing.
const SEGMENTS_PER_TURN = 16,
  TAIL_SEGMENTS = 24,
  RADIAL_SEGMENTS = 8,
  STRAIGHT = 0.006

// Where the run along the desk is too short for the coil at rest, it bows back, at most this many coils' breadth; the route is measured, and walked, in divisions a multiple of its six stretches, so that its landing and rising fall on them: choices of drawing.
const MOST_BOW = 2,
  BOWING_STEPS = 12,
  LENGTH_DIVISIONS = 600

const UP = new Vector3(0, 1, 0)

// Outside its span the route runs bare, and the turns widen in over half a turn, so that the tails join them. Where the route dips as it turns onto the desk, the coil is held up on it.
class CoiledRoute extends Curve {
  #route
  #figures
  #span

  constructor(route, figures, span) {
    super()
    this.#route = route
    this.#figures = figures
    this.#span = span
  }

  getPoint(progress, point = new Vector3()) {
    const { cable, coil, turns } = this.#figures,
      { from, to } = this.#span,
      into = (progress - from) / (to - from),
      begun = Math.max(into, 0),
      winding = Math.min(begun, 1),
      ramp = Math.min(winding * turns * 2, (1 - winding) * turns * 2, 1),
      reach = ((coil - cable) / 2) * ramp,
      angle = winding * turns * Math.PI * 2,
      tangent = this.#route.getTangentAt(progress),
      across = new Vector3().crossVectors(tangent, UP).normalize(),
      over = new Vector3().crossVectors(across, tangent)

    this.#route.getPointAt(progress, point)
    point.y = Math.max(point.y, coil / 2)
    point.addScaledVector(across, Math.cos(angle) * reach)
    point.addScaledVector(over, Math.sin(angle) * reach)

    return point
  }
}

// The computer's 12V lead: its plug, drawn in the computer's model about its shoulder, goes into a display's socket, and the lead runs to it from the boot's tip, down to the desk and along it, coiled, and up into the plug.
export default class Lead {
  #computer
  #group
  #rest
  #tip
  #tail
  #figures
  #material
  #coil = null

  constructor(computer, group) {
    this.#computer = computer
    this.#group = group
    this.#rest = { position: group.position.clone(), quaternion: group.quaternion.clone() }
    this.#tip = computer.getObjectByName("dc-cord-tip")
    this.#tail = group.getObjectByName("dc-cord-plug-tail")
    this.#figures = group.userData.lead
    this.#material = computer.getObjectByName("dc-cord").material
    this.stow()
  }

  // A laid lead may be hidden while its display travels, and shown once it stands.
  show(shown) {
    const coil = this.#coil

    this.#group.visible = shown

    if (coil) {
      coil.visible = shown
    }
  }

  // Unlaid, the lead stands hidden inside the case, where it adds nothing to the computer's bounds.
  stow() {
    const coil = this.#coil

    this.#group.visible = false
    this.#group.position.copy(this.#rest.position)
    this.#group.quaternion.copy(this.#rest.quaternion)

    if (coil) {
      coil.removeFromParent()
      coil.geometry.dispose()
      this.#coil = null
    }
  }

  lay(display) {
    this.stow()

    const computer = this.#computer,
      group = this.#group,
      mouth = display.getObjectByName("jack-mouth"),
      at = new Vector3(),
      facing = new Quaternion(),
      turned = new Quaternion()

    computer.updateWorldMatrix(true, true)
    mouth.updateWorldMatrix(true, false)
    mouth.getWorldPosition(at)
    mouth.getWorldQuaternion(facing)
    computer.getWorldQuaternion(turned)
    computer.worldToLocal(at)
    turned.invert()
    turned.multiply(facing)
    group.position.copy(at)
    group.quaternion.copy(turned)
    group.visible = true

    const { route, span } = this.#route(),
      coiled = new CoiledRoute(route, this.#figures, span),
      segments = this.#figures.turns * SEGMENTS_PER_TURN + TAIL_SEGMENTS,
      geometry = new TubeGeometry(coiled, segments, this.#figures.cable / 2, RADIAL_SEGMENTS),
      coil = new Mesh(geometry, this.#material)

    coil.name = "dc-cord-coil"
    computer.add(coil)
    this.#coil = coil
  }

  // The coil lies on the desk between the drop from the boot and the rise into the plug, and the run bows back where it would not hold the coil at rest. Every point is in the computer's own frame.
  #route() {
    const { cable, coil, turns } = this.#figures,
      group = this.#group,
      start = this.#tip.position.clone(),
      end = this.#tail.position.clone().applyQuaternion(group.quaternion).add(group.position),
      outOfPlug = new Vector3(0, 0, 1).applyQuaternion(group.quaternion),
      outOfBoot = new Vector3(0, 0, -1),
      lying = coil / 2,
      line = start.z - lying,
      leftBoot = start.clone().addScaledVector(outOfBoot, STRAIGHT),
      leftPlug = end.clone().addScaledVector(outOfPlug, STRAIGHT),
      landing = new Vector3(start.x, lying, line),
      rising = new Vector3(leftPlug.x, lying, leftPlug.z),
      atRest = turns * cable

    let laid = null

    for (let step = 0; step <= BOWING_STEPS; step++) {
      const bow = (MOST_BOW * coil * step) / BOWING_STEPS,
        middle = new Vector3((start.x + end.x) / 2, lying, (line + leftPlug.z) / 2 - bow),
        points = [start, leftBoot, landing, middle, rising, leftPlug, end],
        route = new CatmullRomCurve3(points, false, "centripetal")

      route.arcLengthDivisions = LENGTH_DIVISIONS

      const lengths = route.getLengths(),
        whole = lengths.at(-1),
        last = points.length - 1,
        landed = lengths[(LENGTH_DIVISIONS * points.indexOf(landing)) / last] / whole,
        rose = lengths[(LENGTH_DIVISIONS * points.indexOf(rising)) / last] / whole,
        long = (rose - landed) * whole >= atRest

      laid = { route, span: { from: landed, to: rose } }

      if (long) {
        break
      }
    }

    return laid
  }
}
