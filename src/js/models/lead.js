import { CatmullRomCurve3, Curve, Mesh, Quaternion, TubeGeometry, Vector3 } from "three/webgpu"
import Plug from "./plug"
import boundsOf from "./bounds_of"

// How finely the lead is drawn, by its turns and by its length, how far it runs straight out of where it leaves and out of the plug before it bends, and how many coils' breadth out it reaches the desk, so that its first turn clears what it left, or as far out as it leaves above the desk where that is further: choices of drawing.
const SEGMENTS_PER_TURN = 16,
  TAIL_SEGMENTS = 24,
  SEGMENT_LENGTH = 0.005,
  RADIAL_SEGMENTS = 8,
  STRAIGHT = 0.006,
  LANDING = 1

// Where the run along the desk is too short for the coil at rest, it bows back, at most this many coils' breadth. Where it passes nearer another lead than their coils allow, or under another's plug standing in its socket too low to pass beneath, found by walking the runs in so many steps, it climbs onto it, over a coil's breadth or as far as the highest it passes stands, lies half a cable clear of it, and comes down again as far beyond; passings whose climbs meet are taken as one. The route is measured, and walked, in so many divisions to each of its stretches, so that its landing and rising fall on them: choices of drawing.
const MOST_BOW = 2,
  BOWING_STEPS = 12,
  PASSING_STEPS = 40,
  STRETCH_DIVISIONS = 100

// Where its run turns from one stretch into the next, it rounds the turn over so far either side of it: a choice of drawing.
const ROUNDING = 0.02

const UP = new Vector3(0, 1, 0),
  OUT_OF_SOCKET = new Vector3(0, 0, 1),
  OUT_OF_TIP = new Vector3(0, 0, -1)

// Passings in order along the run, as shares of it, those whose climbs meet
// taken as one, as high as the higher.
function mergePassings(passings, climb) {
  const ordered = passings.toSorted((one, other) => one.from - other.from),
    kept = []

  for (const passing of ordered) {
    const last = kept.at(-1),
      meeting = last != null && passing.from - climb <= last.to + climb

    if (meeting) {
      last.to = Math.max(last.to, passing.to)
      last.height = Math.max(last.height, passing.height)
    } else {
      kept.push({ ...passing })
    }
  }

  return kept
}

// A stretch of desk run along in straight stretches, from where a lead lands to where it rises, walked by shares of its whole length.
class Run {
  points
  #lengths = [0]

  constructor(points) {
    this.points = points

    for (let index = 1; index < points.length; index++) {
      const stretch = points[index - 1].distanceTo(points[index])

      this.#lengths.push(this.#lengths[index - 1] + stretch)
    }
  }

  get length() {
    return this.#lengths.at(-1)
  }

  // How far along it turns from one stretch into the next, as shares.
  get turns() {
    const whole = this.length

    return this.#lengths.slice(1, -1).map(length => length / whole)
  }

  at(share, point = new Vector3()) {
    const lengths = this.#lengths,
      along = share * this.length

    let index = 1

    while (index < lengths.length - 1 && lengths[index] < along) {
      index++
    }

    const from = lengths[index - 1],
      stretch = lengths[index] - from,
      into = stretch == 0 ? 0 : (along - from) / stretch

    return point.lerpVectors(this.points[index - 1], this.points[index], into)
  }
}

// Outside its span the route runs bare, and the turns widen in over half a turn, so that the tails join them. Where the route dips toward the desk, each point is held up as far as its turn reaches, so that the coil stands on the desk and a bare tail may run down to a plug lying on it.
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
    point.y = Math.max(point.y, reach + cable / 2)
    point.addScaledVector(across, Math.cos(angle) * reach)
    point.addScaledVector(over, Math.sin(angle) * reach)

    return point
  }
}

// A lead fixed to its owner, as a computer's 12V lead or a monitor's, or held in the owner's socket by a plug of its own at that end, as the Spectrum's: its plug, drawn in the owner's model about its shoulder, goes into a socket of whatever the desk joins it to, and the lead runs to it from where it leaves the owner, down to the desk and along it, coiled or not, and up into the plug. Its figures name those parts.
export default class Lead {
  joined = null
  plug
  #anchor
  #across
  #siblings = []
  #beneath = []
  #owner
  #group
  #rest
  #tip
  #tail
  #figures
  #material
  #bundled = []
  #above = []
  #coil = null

  constructor(owner, group) {
    const figures = group.userData.lead,
      anchored = figures.anchor != null,
      anchor = anchored ? owner.getObjectByName(figures.anchor) : null,
      tip = owner.getObjectByName(figures.tip),
      outOfTip = OUT_OF_TIP.clone().applyQuaternion(tip.quaternion),
      left = new Vector3().crossVectors(UP, outOfTip)

    this.#across = tip.position.dot(left)
    this.#owner = owner
    this.#group = group
    this.#rest = { position: group.position.clone(), quaternion: group.quaternion.clone() }
    this.#anchor = anchor && { part: anchor, home: anchor.position.clone() }
    this.#tip = tip
    this.#tail = group.getObjectByName(figures.tail)
    this.#figures = figures
    this.#material = owner.getObjectByName(figures.sheath).material
    this.plug = new Plug(group, OUT_OF_SOCKET, () => this.#layCoil())
    this.stow()
  }

  // The name of the socket it goes into, on whatever has one.
  get socket() {
    return this.#figures.socket
  }

  // Unlaid, the lead and any plug holding it stand hidden inside its owner, where they add nothing to its bounds, and it is joined to nothing.
  stow() {
    const anchor = this.#anchor

    if (anchor) {
      anchor.part.visible = false
      anchor.part.position.copy(this.#rest.position)
    }

    this.joined = null
    this.#group.visible = false
    this.#group.position.copy(this.#rest.position)
    this.#group.quaternion.copy(this.#rest.quaternion)
    this.#removeCoil()
  }

  // A model's leads, which know one another, to lie side by side and to share
  // the runs of the cables they are cores of.
  static sideBySide(owner, groups) {
    const leads = groups.map(group => new Lead(owner, group))

    for (const lead of leads) {
      const { bundle } = lead.#figures

      lead.#siblings = leads
      lead.#bundled = leads.filter(
        other => other != lead && bundle != null && other.#figures.bundle == bundle
      )
    }

    return leads
  }

  // How far its stretch of desk is carried aside, to its left seen along it:
  // a coil's breadth apart from its owner's other leads into the same piece,
  // about the middle of them, in the order they leave, seen across the way
  // they leave.
  #aside() {
    const joined = this.joined,
      together = this.#siblings.filter(other => other.joined == joined),
      order = together.toSorted((one, other) => one.#across - other.#across),
      rank = order.indexOf(this),
      middle = (together.length - 1) / 2

    return (rank - middle) * this.#figures.coil
  }

  // Its plug stands in its socket on whatever it is joined to, and the lead is
  // laid to it, over any of the leads given that it passes, wherever they then
  // stand.
  lay(joined, beneath = []) {
    this.place(joined)
    this.#beneath = beneath

    for (const other of beneath) {
      const known = other.#above.includes(this)

      if (!known) {
        other.#above.push(this)
      }
    }

    this.#layCoil()
  }

  // Its plug stands in its socket on whatever it is joined to, the lead laid
  // to it by whoever places it.
  place(joined) {
    this.stow()

    const owner = this.#owner,
      group = this.#group,
      mouth = joined.getObjectByName(this.#figures.socket),
      at = new Vector3(),
      facing = new Quaternion(),
      turned = new Quaternion()

    owner.updateWorldMatrix(true, true)
    mouth.updateWorldMatrix(true, false)
    mouth.getWorldPosition(at)
    mouth.getWorldQuaternion(facing)
    owner.getWorldQuaternion(turned)
    owner.worldToLocal(at)
    turned.invert()
    turned.multiply(facing)
    group.position.copy(at)
    group.quaternion.copy(turned)
    group.visible = true
    this.joined = joined

    const anchor = this.#anchor

    if (anchor) {
      anchor.part.visible = true
      anchor.part.position.copy(anchor.home)
    }
  }

  // The lead is laid from where it leaves its owner to the plug, wherever the
  // plug stands, and with it the other cores of its cable, which share its run,
  // and whatever was laid over it, which passes it where it now lies.
  #layCoil() {
    const laying = new Set([this])

    for (const lead of laying) {
      const sharing = lead.#bundled.filter(other => other.joined != null),
        over = lead.#above.filter(other => other.joined != null && other.#beneath.includes(lead))

      for (const other of [...sharing, ...over]) {
        laying.add(other)
      }
    }

    for (const lead of laying) {
      lead.#layOwnCoil()
    }
  }

  #layOwnCoil() {
    this.#removeCoil()

    const { route, span } = this.#route(),
      coiled = new CoiledRoute(route, this.#figures, span),
      length = route.getLength(),
      lengthwise = Math.ceil(length / SEGMENT_LENGTH),
      segments = this.#figures.turns * SEGMENTS_PER_TURN + TAIL_SEGMENTS + lengthwise,
      geometry = new TubeGeometry(coiled, segments, this.#figures.cable / 2, RADIAL_SEGMENTS),
      coil = new Mesh(geometry, this.#material)

    coil.name = `${this.#group.name}-coil`
    this.#owner.add(coil)
    this.#coil = coil
  }

  #removeCoil() {
    const coil = this.#coil

    if (coil) {
      coil.removeFromParent()
      coil.geometry.dispose()
      this.#coil = null
    }
  }

  // Where the lead leaves its owner and where it leaves its plug, and the
  // stretch of desk it runs along between them, from where it lands to where
  // it rises by way of whatever its owner names from where it leaves and its
  // socket's piece names to the socket, carried aside, across the way it left
  // where it lands, in its owner's own frame. The cores of one cable in their sockets share one stretch, landing
  // and rising amid where each would alone, side by side.
  #ground() {
    const { start, leftTip, landing, rising, leftPlug, end, outOfTip } = this.#bare(),
      sharing = this.#bundled.filter(other => other.joined != null),
      theirs = sharing.map(other => other.#bare()),
      cores = theirs.length + 1

    for (const their of theirs) {
      landing.add(their.landing)
      rising.add(their.rising)
    }

    landing.divideScalar(cores)
    rising.divideScalar(cores)

    const fromTip = this.#ways(this.#owner, this.#figures.tip, landing.y),
      toSocket = this.#ways(this.joined, this.#figures.socket, landing.y),
      points = [landing, ...fromTip, ...toSocket, rising],
      lefts = points.map(function (point, index) {
        const before = points[Math.max(index - 1, 0)],
          after = points[Math.min(index + 1, points.length - 1)],
          landed = index == 0,
          along = landed ? outOfTip : new Vector3().subVectors(after, before)

        return new Vector3().crossVectors(UP, along).normalize()
      })

    const aside = this.#aside()

    for (let index = 0; index < points.length; index++) {
      points[index].addScaledVector(lefts[index], aside)
    }

    const run = new Run(points)

    return { start, leftTip, run, leftPlug, end, outOfTip }
  }

  // Where a model names a way round itself from or to one of its parts, the
  // points on the desk the lead passes by, in its owner's own frame.
  #ways(model, part, lying) {
    const owner = this.#owner,
      way = model.getObjectByName(`${part}-way`),
      passes = way?.children ?? []

    return passes.map(function (pass) {
      const point = new Vector3()

      pass.getWorldPosition(point)
      owner.worldToLocal(point)
      point.y = lying

      return point
    })
  }

  // Its ground as it would lie alone, its stretch of desk not yet carried aside.
  #bare() {
    const { coil } = this.#figures,
      group = this.#group,
      tip = this.#tip,
      start = tip.position.clone(),
      end = this.#tail.position.clone().applyQuaternion(group.quaternion).add(group.position),
      outOfPlug = OUT_OF_SOCKET.clone().applyQuaternion(group.quaternion),
      outOfTip = OUT_OF_TIP.clone().applyQuaternion(tip.quaternion),
      lying = coil / 2,
      out = Math.max(LANDING * coil, start.y),
      leftTip = start.clone().addScaledVector(outOfTip, STRAIGHT),
      leftPlug = end.clone().addScaledVector(outOfPlug, STRAIGHT),
      landing = start.clone().addScaledVector(outOfTip, out),
      rising = new Vector3(leftPlug.x, lying, leftPlug.z)

    landing.y = lying

    return { start, leftTip, landing, rising, leftPlug, end, outOfTip }
  }

  // A run of its own as the desk sees it.
  #seen(run) {
    const owner = this.#owner,
      points = run.points.map(function (point) {
        const seen = point.clone()

        return owner.localToWorld(seen)
      })

    return new Run(points)
  }

  // Where this lead's stretch of desk passes another's nearer than their coils
  // allow, seen from above: from how far along this one to how far, as shares
  // of it, and how high the other's coil stands; or nothing.
  #passing(run, other) {
    const { run: theirs } = other.#ground(),
      theirRun = other.#seen(theirs),
      room = (this.#figures.coil + other.#figures.coil) / 2,
      mine = new Vector3(),
      their = new Vector3(),
      near = []

    for (let step = 0; step <= PASSING_STEPS; step++) {
      run.at(step / PASSING_STEPS, mine)

      let nearest = Infinity

      for (let theirStep = 0; theirStep <= PASSING_STEPS; theirStep++) {
        theirRun.at(theirStep / PASSING_STEPS, their)

        const apart = Math.hypot(mine.x - their.x, mine.z - their.z)

        nearest = Math.min(nearest, apart)
      }

      const close = nearest < room

      if (close) {
        near.push(step / PASSING_STEPS)
      }
    }

    const passing = near.length > 0

    return passing ? { from: near[0], to: near.at(-1), height: other.#figures.coil } : null
  }

  // Where this lead's stretch of desk passes under another's plug standing in
  // its socket, seen from above, nearer than its coil allows, and too low for
  // it to lie beneath: from how far along this one to how far, as shares of
  // it, and how high the plug stands; or nothing.
  #passingUnder(run, other) {
    const { coil } = this.#figures,
      plug = boundsOf(other.#group),
      overhead = plug.min.y >= coil,
      clearance = new Vector3(coil / 2, 0, coil / 2),
      mine = new Vector3(),
      near = []

    if (overhead) {
      return null
    }

    plug.expandByVector(clearance)

    for (let step = 0; step <= PASSING_STEPS; step++) {
      run.at(step / PASSING_STEPS, mine)
      mine.y = plug.min.y

      const under = plug.containsPoint(mine)

      if (under) {
        near.push(step / PASSING_STEPS)
      }
    }

    const passing = near.length > 0

    return passing ? { from: near[0], to: near.at(-1), height: plug.max.y } : null
  }

  // Where the run lies along the desk and where it lies on what it passes, as
  // shares of the run and heights over the desk, between its landing and its
  // rising, which are themselves raised where it passes something at either
  // end, and where it turns, as high as it lies there. With nothing to pass it
  // lies on the desk throughout. What it was laid over may since have been
  // stowed, and is passed no more.
  #lie(run) {
    const { cable, coil } = this.#figures,
      landing = run.points[0],
      rising = run.points.at(-1),
      seen = this.#seen(run),
      bundled = this.#bundled,
      laid = this.#beneath.filter(other => other.joined != null && !bundled.includes(other)),
      found = laid.flatMap(other => [this.#passing(seen, other), this.#passingUnder(seen, other)]),
      passed = found.filter(passing => passing != null),
      heights = passed.map(passing => passing.height),
      highest = Math.max(coil, ...heights),
      climb = highest / run.length,
      passings = mergePassings(passed, climb),
      rounding = ROUNDING / run.length,
      turning = run.turns.flatMap(share => [share - rounding, share + rounding]),
      knots = turning.map(function (share) {
        const over = passings.find(({ from, to }) => share >= from - climb && share <= to + climb),
          height = over == null ? 0 : over.height + cable / 2

        return { share, height }
      })

    for (const { from, to, height } of passings) {
      const resting = height + cable / 2,
        climbing = from - climb,
        descending = to + climb,
        atLanding = climbing <= 0,
        atRising = descending >= 1

      if (atLanding) {
        landing.y += resting
      } else {
        knots.push({ share: climbing, height: 0 }, { share: from, height: resting })
      }

      if (atRising) {
        rising.y += resting
      } else {
        knots.push({ share: to, height: resting }, { share: descending, height: 0 })
      }
    }

    const level = knots.length == 0,
      ordered = knots.toSorted((one, other) => one.share - other.share),
      inside = ordered.filter(({ share }) => share > 0 && share < 1),
      apart = inside.filter((knot, index) => index == 0 || knot.share > inside[index - 1].share)

    return level ? [{ share: 0.5, height: 0 }] : apart
  }

  // The coil lies on the desk between the drop from where the lead leaves its owner and the rise into the plug, its run carried aside, laid over whatever it passes, and bowed on the way it left where it would not hold the coil at rest. Every point is in the owner's own frame.
  #route() {
    const { cable, coil, turns } = this.#figures,
      { start, leftTip, run, leftPlug, end, outOfTip } = this.#ground(),
      lying = this.#lie(run),
      landing = run.points[0],
      rising = run.points.at(-1),
      atRest = turns * cable

    let laid = null

    for (let step = 0; step <= BOWING_STEPS; step++) {
      const bow = (MOST_BOW * coil * step) / BOWING_STEPS,
        between = lying.map(function ({ share, height }) {
          const point = run.at(share)

          point.addScaledVector(outOfTip, bow)
          point.y = coil / 2 + height

          return point
        }),
        points = [start, leftTip, landing, ...between, rising, leftPlug, end],
        last = points.length - 1,
        route = new CatmullRomCurve3(points, false, "centripetal")

      route.arcLengthDivisions = STRETCH_DIVISIONS * last

      const lengths = route.getLengths(),
        whole = lengths.at(-1),
        landed = lengths[STRETCH_DIVISIONS * 2] / whole,
        rose = lengths[STRETCH_DIVISIONS * (last - 2)] / whole,
        long = (rose - landed) * whole >= atRest

      laid = { route, span: { from: landed, to: rose } }

      if (long) {
        break
      }
    }

    return laid
  }
}
