import { Box3, MathUtils, PerspectiveCamera, Scene, Vector3 } from "three/webgpu"
import { arrange, interfacePlug } from "./arrangement"
import Flight from "./flight"
import GlassTop from "./glass_top"
import Model from "./model"
import Motion from "./motion"
import PIECES from "../pieces"
import Plug from "./plug"
import Pose from "./pose"
import REDUCED_MOTION from "./reduced_motion"
import boundsOf from "./bounds_of"

// The desk is seen whole from its front left and above, the eye standing where every piece the computer could be given has room, so that it stays put while they are chosen. Presentation choices: the heading and the elevation in degrees, and how much room, as a share of what the pieces need.
const HEADING = -25,
  ELEVATION = 25,
  ROOM = 1.12

// The reader may carry the eye round the desk by hand, all the way round, and from a little above the desk to nearly overhead, in degrees; let go, it comes back in so many milliseconds. Presentation choices.
const LOWEST = 5,
  HIGHEST = 85,
  RETURN_MILLISECONDS = 500

// A display comes in from the left, behind the computer, where nothing else stands, and a piece beside it from the right, each from wholly beyond the canvas, a little further still and lifted, both in metres, and each goes back the way it came. Each takes so many milliseconds, those coming one after another by the stagger; those coming, and those staying that move to new places, set off once the others have gone, for a display going and a display coming pass the same way; and the glass fades in or out. Presentation choices.
const BEYOND = 0.05,
  LIFT = 0.12,
  COMING_MILLISECONDS = 550,
  GOING_MILLISECONDS = 300,
  MOVING_MILLISECONDS = 450,
  FADING_MILLISECONDS = 450,
  STAGGER = 80

const UP = new Vector3(0, 1, 0)

const DOUBLINGS = 6,
  HALVINGS = 12

function cornersOf({ min, max }) {
  const corners = []

  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) {
        corners.push(new Vector3(x, y, z))
      }
    }
  }

  return corners
}

// Each piece stands as the kind the desk takes it as: a monitor, a television,
// a drive, a recorder or a power supply.
function piecesBy(names, models) {
  const pieces = {}

  for (const name of names) {
    pieces[PIECES[name].kind] = models.get(name)
  }

  return pieces
}

// Where a piece and each of its parts stand: arranging a desk moves a piece
// whole, or its parts, as the drive's, but for the parts the hand carries.
function stanceOf(piece, carried) {
  const parts = [piece, ...piece.children].filter(part => !carried.includes(part))

  return parts.map(function (part) {
    const { position, quaternion, scale } = part

    return {
      part,
      position: position.clone(),
      quaternion: quaternion.clone(),
      scale: scale.clone()
    }
  })
}

function standBetween(from, to, progress) {
  for (const [index, { part, position, quaternion, scale }] of from.entries()) {
    const target = to[index]

    part.position.lerpVectors(position, target.position, progress)
    part.quaternion.slerpQuaternions(quaternion, target.quaternion, progress)
    part.scale.lerpVectors(scale, target.scale, progress)
  }
}

// A computer turned about its own middle, the point it turns on in the line-up.
function turn(computer, middle, angle) {
  const turned = middle.clone()

  turned.applyAxisAngle(UP, angle)
  computer.rotation.y = angle
  computer.position.subVectors(middle, turned)
}

// A corner behind the eye projects mirrored, and is taken for beyond.
function beyondCanvas(reach, offset, side, eye) {
  const moved = reach.clone()

  moved.translate(offset)

  return cornersOf(moved).every(function (corner) {
    corner.applyMatrix4(eye.matrixWorldInverse)

    const behind = corner.z >= 0

    corner.applyMatrix4(eye.projectionMatrix)

    return behind || corner.x * side > 1
  })
}

function aside(stance, offset) {
  const [whole, ...parts] = stance,
    position = whole.position.clone()

  position.add(offset)

  return [{ ...whole, position }, ...parts]
}

// The leads still joined to a piece once it has gone are put away in their
// owner.
function putAwayFrom(piece, leads) {
  for (const lead of leads) {
    const joining = lead.joined == piece

    if (joining) {
      lead.stow()
      lead.plug.putAway()
    }
  }
}

export default class SetUp {
  scene = new Scene()
  #awaiting = new Map()
  #computer = null
  #corners = []
  #display = null
  #eye = new PerspectiveCamera()
  #glass
  #middle = new Vector3()
  #motions = new Map()
  #name
  #offered
  #pieces = new Map()
  #interfaces = new Map()
  #pose = new Pose()
  #posedFor = null
  #standing = new Set()
  #turned = { heading: 0, elevation: 0 }
  #turnedPose = new Pose()
  #width

  // Every piece the computer may be given, or always stands with, is loaded, so
  // that choosing one never waits on it.
  async load({ name, displays, beside, alongside = [] }, { anisotropy, studio, language }) {
    const names = [...displays, ...beside, ...alongside],
      loading = names.map(each => Model.load(each, { anisotropy, small: true, language })),
      pieces = await Promise.all(loading)

    this.#name = name
    this.#offered = { displays, beside, alongside }
    studio.light(this.scene)

    for (const [index, piece] of pieces.entries()) {
      const pieceName = names[index],
        drive = PIECES[pieceName].kind == "drive"

      piece.visible = false
      this.#pieces.set(pieceName, piece)
      this.scene.add(piece)

      if (drive) {
        const carried = interfacePlug(piece)

        this.#interfaces.set(pieceName, carried)
      }
    }
  }

  // The computer is framed standing square at the origin, and turns square
  // from however the line-up let it go while it flies in.
  stand(computer) {
    const turned = computer.rotation.y,
      from = Math.atan2(Math.sin(turned), Math.cos(turned)),
      middle = new Vector3(),
      duration = REDUCED_MOTION.matches ? 0 : Flight.MILLISECONDS,
      timing = { duration, ease: Motion.easeInOut },
      motion = new Motion(timing, progress => turn(computer, middle, from * (1 - progress)))

    turn(computer, middle, 0)
    this.#computer = computer
    this.scene.add(computer)
    this.#frame()

    const square = boundsOf(computer)

    square.getCenter(middle)
    turn(computer, middle, from)
    this.#motions.set(computer, motion)
  }

  // Pieces no longer chosen go, once whatever is plugged into them is pulled
  // out, those chosen come, and those that stay move to where the new
  // arrangement stands them, the stage framed on the canvas as given. A piece
  // still on its way is taken from wherever it has reached.
  choose(chosen, framing) {
    const stood = this.#standing,
      offered = chosen.filter(name => this.#pieces.has(name)),
      wanted = [...offered, ...this.#offered.alongside],
      going = [...stood].filter(name => !wanted.includes(name)),
      { leads } = this.#computer,
      joinedBefore = leads.map(lead => [lead, lead.joined]),
      pulling = this.#pull(going),
      waiting = this.#clearing(going, pulling),
      current = new Map(),
      arranged = new Map()

    for (const [name, piece] of this.#pieces) {
      const shown = piece.visible

      if (shown) {
        const stance = this.#stanceOf(name),
          reach = boundsOf(piece)

        current.set(name, { stance, reach })
      }
    }

    for (const name of wanted) {
      this.#pieces.get(name).position.set(0, 0, 0)
    }

    const pieces = piecesBy(wanted, this.#pieces)

    arrange(this.#computer, pieces)
    this.#standing = new Set(wanted)
    this.#display = wanted.find(name => this.#offered.displays.includes(name))
    this.#findSockets()

    this.#leaveBehind(joinedBefore)

    for (const name of wanted) {
      const piece = this.#pieces.get(name),
        stance = this.#stanceOf(name),
        reach = boundsOf(piece)

      arranged.set(name, { stance, reach })
    }

    for (const { stance } of current.values()) {
      standBetween(stance, stance, 0)
    }

    for (const name of going) {
      this.#go(name, current.get(name), framing, pulling)
    }

    let arrivals = 0

    for (const name of wanted) {
      const { stance: to, reach } = arranged.get(name),
        piece = this.#pieces.get(name),
        stayed = stood.has(name),
        motion = this.#motions.get(piece),
        underway = motion != null && motion.begun,
        delay = stayed ? (underway ? 0 : waiting) : waiting + arrivals * STAGGER,
        was = current.get(name)

      let from = was?.stance

      if (!was) {
        const offstage = this.#offstageOf(name, reach, framing)

        from = aside(to, offstage)
      }

      if (!stayed) {
        arrivals++
      }

      this.#come(name, from, to, { delay, stayed })
    }

    const clear = this.#glass.presence < 1

    if (clear) {
      this.#fade(1)
    }
  }

  // Everything on the desk goes but the computer, once pulled out of it, and
  // the glass with it; the computer's leads are put away at once. Answers when
  // every piece, and any still going from before, has gone.
  leave(framing) {
    const { leads } = this.#computer,
      standing = [...this.#standing],
      going = [this.#fade(0)]

    for (const lead of leads) {
      this.#motions.delete(lead.plug.part)
      this.#awaiting.delete(lead.plug)
      lead.stow()
      lead.plug.putAway()
    }

    const pulling = this.#pull(standing)

    this.#display = null
    this.#standing = new Set()

    for (const name of standing) {
      const piece = this.#pieces.get(name),
        stance = this.#stanceOf(name),
        reach = boundsOf(piece)

      this.#go(name, { stance, reach }, framing, pulling)
    }

    for (const piece of this.#pieces.values()) {
      const motion = this.#motions.get(piece),
        moving = motion != null

      if (moving) {
        going.push(motion.finished)
      }
    }

    return Promise.all(going)
  }

  advance(now) {
    let moving = false

    for (const [object, motion] of this.#motions) {
      const going = motion.advance(now)

      if (!going) {
        this.#motions.delete(object)
      }

      moving ||= going
    }

    for (const [plug, piece] of this.#awaiting) {
      const still = [piece, plug.part].every(each => !this.#motions.has(each))

      if (still) {
        const plugging = plug.plugIn()

        this.#awaiting.delete(plug)
        this.#motions.set(plug.part, plugging)
        moving = true
      }
    }

    return moving
  }

  // The desk in the frame the page gives it, seen from wherever the hand has
  // carried the eye.
  views(frameOf) {
    const frame = frameOf(this.#name),
      standing = this.#poseFor(frame.width / frame.height),
      pose = this.#turnedPose.copy(standing),
      { heading, elevation } = this.#turned

    pose.heading += heading
    pose.elevation += elevation

    return [{ name: this.#name, pose, frame, scene: this.scene, clipped: false }]
  }

  // The desk turned by hand: its front carried across as the hand goes, the
  // eye going the other way round it, and its top tipped toward the eye as the
  // hand goes down. The eye is caught wherever it is, even on its way back.
  turnBy(across, down) {
    const turned = this.#turned,
      lowest = MathUtils.degToRad(LOWEST - ELEVATION),
      highest = MathUtils.degToRad(HIGHEST - ELEVATION),
      elevation = turned.elevation + down

    this.#motions.delete(turned)
    turned.heading -= across
    turned.elevation = MathUtils.clamp(elevation, lowest, highest)
  }

  // Let go, the eye comes back the shorter way round.
  letGo() {
    const turned = this.#turned,
      heading = Math.atan2(Math.sin(turned.heading), Math.cos(turned.heading)),
      { elevation } = turned,
      duration = REDUCED_MOTION.matches ? 0 : RETURN_MILLISECONDS,
      timing = { duration, ease: Motion.easeInOut },
      motion = new Motion(timing, function (progress) {
        turned.heading = heading * (1 - progress)
        turned.elevation = elevation * (1 - progress)
      })

    this.#motions.set(turned, motion)
  }

  // The computer and every piece offered beside it, in the language asked for
  // where each was made in it.
  async takeLanguage(language) {
    const models = [this.#computer, ...this.#pieces.values()],
      taking = models.map(model => model.takeLanguage(language))

    await Promise.all(taking)
  }

  // The computer leaves for the line-up, still standing square at the origin.
  release() {
    const computer = this.#computer

    this.scene.remove(computer)
    this.#computer = null

    return computer
  }

  // The computer is not the set-up's to free: it leaves for the line-up first.
  dispose() {
    for (const piece of this.#pieces.values()) {
      piece.dispose()
    }

    this.#glass.dispose()
  }

  #go(name, { stance: from, reach }, framing, delay) {
    const piece = this.#pieces.get(name),
      { leads } = this.#computer,
      offstage = this.#offstageOf(name, reach, framing),
      to = aside(from, offstage),
      duration = REDUCED_MOTION.matches ? 0 : GOING_MILLISECONDS,
      timing = { duration, delay, ease: Motion.easeIn },
      motion = new Motion(timing, function (progress) {
        const gone = progress == 1

        standBetween(from, to, progress)
        piece.visible = !gone

        if (gone) {
          putAwayFrom(piece, leads)
        }
      })

    this.#motions.set(piece, motion)
  }

  #come(name, from, to, { delay, stayed }) {
    const piece = this.#pieces.get(name),
      [whole] = from,
      [wholeTo] = to,
      displayed = name == this.#display,
      shifting = stayed && displayed && !whole.position.equals(wholeTo.position),
      reduced = REDUCED_MOTION.matches,
      duration = stayed ? MOVING_MILLISECONDS : COMING_MILLISECONDS,
      ease = stayed ? Motion.easeInOut : Motion.easeOut,
      timing = reduced ? { duration: 0, ease } : { duration, delay, ease },
      moving = { from, to, shifting },
      motion = new Motion(timing, progress => this.#move(name, moving, progress))

    this.#move(name, { from, to: from, shifting }, 0)
    piece.visible = true
    this.#motions.set(piece, motion)
  }

  // A piece moving stands between where it stood and where it goes, and what
  // it carries follows it: a drive's ribbon is laid again, and while a display
  // shifts where it stands the leads joining it to the computer are placed
  // again in their sockets, so that a plug in its socket stays there.
  #move(name, { from, to, shifting }, progress) {
    const piece = this.#pieces.get(name),
      plug = this.#interfaces.get(name),
      computer = this.#computer

    standBetween(from, to, progress)
    plug?.layTrail()

    if (shifting) {
      const laid = piece.leads.filter(lead => lead.joined != null),
        joining = computer.leads.filter(lead => lead.joined == piece)

      for (const lead of [...laid, ...joining]) {
        lead.place(lead.joined)
        lead.plug.findSocket()
      }
    }
  }

  // How long until every piece going has gone, those going now once pulled
  // out of whatever joins them and those still going from before.
  #clearing(going, pulling) {
    let clearing = going.length > 0 ? pulling + GOING_MILLISECONDS : 0

    for (const [name, piece] of this.#pieces) {
      const goneBefore = piece.visible && !this.#standing.has(name)

      if (goneBefore) {
        const motion = this.#motions.get(piece)

        clearing = Math.max(clearing, motion.remaining)
      }
    }

    return clearing
  }

  // Each of the computer's leads the arrangement leaves nowhere to go stays
  // joined to the piece it was in, while that piece is going, its plug pulled
  // out, until the piece has gone.
  #leaveBehind(joinedBefore) {
    for (const [lead, piece] of joinedBefore) {
      const leftBehind = lead.joined == null && piece != null && piece.visible

      if (leftBehind) {
        lead.place(piece)
        lead.plug.findSocket()
      }
    }
  }

  // The parts of a piece the hand carries: a drive's interface, or the plugs
  // of its leads.
  #carriedBy(name) {
    const piece = this.#pieces.get(name),
      plug = this.#interfaces.get(name),
      plugs = piece.leads.map(lead => lead.plug)

    if (plug) {
      plugs.push(plug)
    }

    return plugs
  }

  #stanceOf(name) {
    const piece = this.#pieces.get(name),
      carried = this.#carriedBy(name),
      parts = carried.map(plug => plug.part)

    return stanceOf(piece, parts)
  }

  // Each plug joining the computer to a piece standing, with that piece's
  // name: the plugs a piece carries, its leads and a drive's interface, onto
  // the computer, and then the computer's leads into whichever standing piece
  // each is laid in, which lie over the others and so are moved after them.
  #joints() {
    const joints = new Map(),
      { leads } = this.#computer

    for (const name of this.#standing) {
      const carried = this.#carriedBy(name)

      for (const plug of carried) {
        joints.set(plug, name)
      }
    }

    for (const lead of leads) {
      const name = this.#nameOf(lead.joined),
        standing = this.#standing.has(name)

      if (standing) {
        joints.set(lead.plug, name)
      }
    }

    return joints
  }

  // The name a piece was offered by, or nothing for what is not one.
  #nameOf(model) {
    const [name] = [...this.#pieces].find(([, piece]) => piece == model) ?? []

    return name
  }

  // Whatever joins the computer to a piece going is pulled out first, but for
  // a reader who would see less motion, for whom no hand moves it; answers how
  // long that takes.
  #pull(going) {
    const reduced = REDUCED_MOTION.matches

    let pulling = 0

    for (const [plug, name] of this.#joints()) {
      const parting = going.includes(name),
        pulled = parting && !plug.loose && !reduced

      if (parting) {
        this.#awaiting.delete(plug)
      }

      if (pulled) {
        const taking = plug.pullOut()

        this.#motions.set(plug.part, taking)
        pulling = Plug.TAKING_OUT_MILLISECONDS
      }
    }

    return pulling
  }

  // Every plug joining the computer to a piece standing finds its socket
  // where the arrangement stood it, and one lying loose goes in once its piece
  // stands still. Where motion is reduced no hand moves it, and whatever the
  // hand was doing stops.
  #findSockets() {
    const reduced = REDUCED_MOTION.matches

    for (const [plug, name] of this.#joints()) {
      const piece = this.#pieces.get(name)

      if (reduced) {
        this.#motions.delete(plug.part)
      }

      plug.findSocket()

      const { loose } = plug

      if (loose) {
        this.#awaiting.set(plug, piece)
      } else {
        this.#awaiting.delete(plug)
      }
    }
  }

  #fade(presence) {
    const glass = this.#glass,
      from = glass.presence,
      duration = REDUCED_MOTION.matches ? 0 : FADING_MILLISECONDS,
      timing = { duration, ease: Motion.easeInOut },
      motion = new Motion(timing, function (progress) {
        const reached = MathUtils.lerp(from, presence, progress)

        glass.presence = reached
        glass.visible = reached > 0
      })

    this.#motions.set(glass, motion)

    return motion.finished
  }

  // How far to its side a piece must stand from the reach given, lifted, to be
  // wholly beyond the canvas the stage is framed on.
  #offstageOf(name, reach, { frame, canvas }) {
    const display = this.#offered.displays.includes(name),
      side = display ? -1 : 1,
      pose = this.#poseFor(frame.width / frame.height),
      eye = this.#eye,
      offset = new Vector3(0, LIFT, 0)

    pose.place(eye, frame, canvas)
    eye.updateMatrixWorld()

    let short = 0,
      clear = this.#width

    for (let doubling = 0; ; doubling++) {
      offset.x = side * clear

      const beyond = beyondCanvas(reach, offset, side, eye),
        exhausted = doubling == DOUBLINGS

      if (beyond) {
        break
      }

      if (exhausted) {
        throw new Error(`The ${name} finds no edge of the canvas within ${clear} m`)
      }

      short = clear
      clear *= 2
    }

    for (let halving = 0; halving < HALVINGS; halving++) {
      const halfway = (short + clear) / 2

      offset.x = side * halfway

      const beyond = beyondCanvas(reach, offset, side, eye)

      if (beyond) {
        clear = halfway
      } else {
        short = halfway
      }
    }

    offset.x = side * (clear + BEYOND)

    return offset
  }

  // Every display with whatever else may stand beside it, by the corners of
  // each part: the corners of one box round a whole desk, or round a whole
  // drive with its interface and ribbon, stand in the air. A part that only
  // marks a place, as a slot or a connector, reaches nowhere. The glass lies
  // under the whole of them.
  #frame() {
    const { displays, beside, alongside } = this.#offered,
      { leads } = this.#computer,
      whole = new Box3()

    for (const display of displays) {
      const pieces = piecesBy([display, ...beside, ...alongside], this.#pieces)

      arrange(this.#computer, pieces)

      for (const standing of [this.#computer, ...Object.values(pieces)]) {
        for (const part of standing.children) {
          const reach = boundsOf(part),
            marker = reach.isEmpty()

          if (!marker) {
            const corners = cornersOf(reach)

            whole.union(reach)
            this.#corners.push(...corners)
          }
        }
      }
    }

    for (const lead of leads) {
      lead.stow()
    }

    const glass = new GlassTop(whole)

    glass.visible = false
    this.#glass = glass
    this.scene.add(glass)
    whole.getCenter(this.#middle)
    this.#width = whole.max.x - whole.min.x
  }

  // The eye stands as far back as the corner that most wants room needs, and
  // the picture is then shifted to stand what it sees in the middle of the
  // frame: the middle of the pieces in space is not the middle of their picture.
  #poseFor(aspect) {
    const pose = this.#pose,
      posed = this.#posedFor == aspect

    if (posed) {
      return pose
    }

    const halfField = MathUtils.degToRad(Pose.FIELD_OF_VIEW / 2),
      halfHigh = Math.tan(halfField),
      halfWide = halfHigh * aspect,
      towardEye = new Vector3(),
      right = new Vector3(),
      up = new Vector3(),
      offset = new Vector3(),
      pictured = new Box3()

    pose.aim.copy(this.#middle)
    pose.heading = MathUtils.degToRad(HEADING)
    pose.elevation = MathUtils.degToRad(ELEVATION)
    pose.shift.set(0, 0)
    pose.towardEye(towardEye)
    right.set(Math.cos(pose.heading), 0, -Math.sin(pose.heading))
    up.crossVectors(towardEye, right)

    let distance = 0

    for (const corner of this.#corners) {
      offset.subVectors(corner, this.#middle)

      const toward = offset.dot(towardEye),
        across = Math.abs(offset.dot(right)) / halfWide,
        rise = Math.abs(offset.dot(up)) / halfHigh,
        needed = toward + Math.max(across, rise) * ROOM

      distance = Math.max(distance, needed)
    }

    for (const corner of this.#corners) {
      offset.subVectors(corner, this.#middle)

      const depth = distance - offset.dot(towardEye),
        across = offset.dot(right) / (depth * halfWide),
        rise = offset.dot(up) / (depth * halfHigh),
        projected = new Vector3(across, rise, 0)

      pictured.expandByPoint(projected)
    }

    const centre = new Vector3()

    pictured.getCenter(centre)
    pose.distance = distance
    pose.shift.set(centre.x, centre.y)
    this.#posedFor = aspect

    return pose
  }
}
