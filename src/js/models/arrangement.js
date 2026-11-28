import Plug from "./plug"
import { Vector3 } from "three/webgpu"
import boundsOf from "./bounds_of"

// "The computer should be placed centrally in front of the monitor, but as far away from the screen as possible" [A], CPC6128 User Instructions, Installation Notes: https://archive.org/details/amstrad-cpc-6128-user-manual. How far the desk stands the monitor or television behind is its own choice, room for a hand to plug in what joins them; one gap stands between the computer and a drive or a power supply beside it; and a wider one between a recorder and whatever stands nearest it, the computer, the display or the supply, whichever reaches furthest across, for its jacks face that way and the plugs in them want room. All are measured from what each model reaches, and all are arrangement choices, not measurements.
const BEHIND = 0.1,
  GAP = 0.03,
  RECORDER_GAP = 0.06

// A DDI-1's drive stands "to the right of the computer" and "at least 20 cm from the monitor" [A], User Instructions F1.4: https://archive.org/download/manualsonline-id-073a0aea-c864-4724-8004-a2dbc04e2798/073a0aea-c864-4724-8004-a2dbc04e2798.pdf. Its front stands level with the computer's, as a photograph of one at home stands it [E]: https://www.classic-computers.org.nz/blog/images/2015-10-06-amstrad-fdd1-with-464-3-800x.jpg. That is an arrangement choice, and the 20 cm is kept across, the drive being as deep as the monitor stands behind.
const MONITOR_CLEARANCE = 0.2

const OFF_CONNECTOR = new Vector3(0, 0, -1)

// A power supply lies turned a quarter turn, anticlockwise seen from above, so that the side its DC lead leaves faces back, toward the computer's sockets: an arrangement choice.
const SUPPLY_TURN = Math.PI / 2

// The interface stands square on the edge connector the computer's model names, on the desk.
function plugInterface(drive, computer) {
  const connector = computer.getObjectByName("floppy-disc"),
    unit = drive.getObjectByName("disc-interface"),
    at = new Vector3()

  connector.getWorldPosition(at)
  unit.position.set(at.x, 0, at.z)
  unit.rotation.set(0, 0, 0)

  return unit
}

function standBehind(display, behind) {
  display.position.set(0, 0, 0)

  const own = boundsOf(display)

  display.position.z = behind.min.z - BEHIND - own.max.z
}

// The ribbon runs straight from the interface's end of it to the drive's,
// and on over each of them for half its own width, where it folds.
function layRibbon(drive) {
  const ribbon = drive.getObjectByName("ribbon"),
    interfaceEnd = drive.getObjectByName("ribbon-from"),
    driveEnd = drive.getObjectByName("ribbon-to"),
    from = new Vector3(),
    to = new Vector3()

  ribbon.rotation.set(0, 0, 0)
  ribbon.scale.x = 1
  interfaceEnd.getWorldPosition(from)
  driveEnd.getWorldPosition(to)
  drive.worldToLocal(from)
  drive.worldToLocal(to)

  const own = boundsOf(ribbon),
    across = new Vector3().subVectors(to, from),
    length = across.length(),
    level = Math.hypot(across.x, across.z),
    heading = Math.atan2(-across.z, across.x),
    rise = Math.atan2(across.y, level),
    half = (own.max.z - own.min.z) / 2,
    laidLength = own.max.x - own.min.x

  ribbon.position.copy(from).addScaledVector(across, -half / length)
  ribbon.rotation.set(0, heading, rise, "YZX")
  ribbon.scale.x = (length + 2 * half) / laidLength
}

// The interface is carried onto the computer's connector by hand, from behind,
// and its ribbon laid after it.
function interfacePlug(drive) {
  const unit = drive.getObjectByName("disc-interface")

  return new Plug(unit, OFF_CONNECTOR, () => layRibbon(drive))
}

// A power supply lies at the computer's right, a gap beside it, its front in
// line with the computer's.
function standSupply(supply, reach) {
  supply.position.set(0, 0, 0)
  supply.rotation.set(0, SUPPLY_TURN, 0)

  const own = boundsOf(supply)

  supply.position.set(reach.max.x + GAP - own.min.x, 0, reach.max.z - own.max.z)
}

function standDrive(drive, reach, display) {
  const unit = drive.getObjectByName("disc-drive"),
    displayBounds = boundsOf(display),
    beside = reach.max.x + GAP,
    clear = displayBounds.max.x + MONITOR_CLEARANCE,
    left = Math.max(beside, clear)

  unit.position.set(left, 0, reach.max.z)
  layRibbon(drive)
}

// At the computer's right, its front in line with the computer's: a recorder
// deeper than the computer reaches back beside the display, and beyond a power
// supply standing there.
function standBeside(recorder, reach, display, supply) {
  recorder.position.set(0, 0, 0)

  const own = boundsOf(recorder),
    displayBounds = boundsOf(display),
    supplyBounds = supply == null ? reach : boundsOf(supply),
    right = Math.max(reach.max.x, displayBounds.max.x, supplyBounds.max.x)

  recorder.position.set(right + RECORDER_GAP - own.min.x, 0, reach.max.z - own.max.z)
}

// Each piece is stood from where it would stand alone, so a desk whose pieces
// change is arranged again whole. The leads fixed to the computer and to the
// pieces are stowed while they are measured, and laid once all stand, each
// into whichever has its socket, the computer's last, each over the leads
// laid before it and their plugs where it passes them; one whose socket
// stands nowhere stays stowed.
function arrange(computer, { monitor, television, drive, recorder, supply }) {
  const display = monitor ?? television,
    pieces = [display, drive, recorder, supply].filter(piece => piece != null),
    piecesLeads = pieces.flatMap(piece => piece.leads)

  for (const lead of [...computer.leads, ...piecesLeads]) {
    lead.stow()
  }

  const reach = boundsOf(computer),
    behind = reach.clone()

  if (drive) {
    const unit = plugInterface(drive, computer),
      unitBounds = boundsOf(unit)

    behind.union(unitBounds)
  }

  standBehind(display, behind)

  if (drive) {
    standDrive(drive, reach, display)
  }

  if (supply) {
    standSupply(supply, reach)
  }

  if (recorder) {
    standBeside(recorder, reach, display, supply)
  }

  for (const lead of piecesLeads) {
    const socketed = computer.getObjectByName(lead.socket) != null

    if (socketed) {
      lead.lay(computer)
    }
  }

  const beneath = [...piecesLeads]

  for (const lead of computer.leads) {
    const joined = pieces.find(piece => piece.getObjectByName(lead.socket) != null)

    if (joined) {
      lead.lay(joined, [...beneath])
      beneath.push(lead)
    }
  }
}

export { arrange, interfacePlug }
