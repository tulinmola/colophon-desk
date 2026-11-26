import { Vector3 } from "three/webgpu"
import boundsOf from "./bounds_of"

// One chosen gap stands between the computer and the monitor or television behind it, and between the computer, or that display where it reaches further across, and a recorder beside it, measured from what each model reaches. The gap is an arrangement choice, not a measurement.
const GAP = 0.03

// A DDI-1's drive stands "to the right of the computer" and "at least 20 cm from the monitor" [A], User Instructions F1.4: https://archive.org/download/manualsonline-id-073a0aea-c864-4724-8004-a2dbc04e2798/073a0aea-c864-4724-8004-a2dbc04e2798.pdf. Its front stands level with the computer's, as a photograph of one at home stands it [E]: https://www.classic-computers.org.nz/blog/images/2015-10-06-amstrad-fdd1-with-464-3-800x.jpg. That is an arrangement choice, and the 20 cm is kept across, the drive being as deep as the monitor stands behind.
const MONITOR_CLEARANCE = 0.2

// The interface stands on the edge connector the computer's model names, on the desk.
function plugInterface(drive, computer) {
  const connector = computer.getObjectByName("floppy-disc"),
    unit = drive.getObjectByName("disc-interface"),
    at = new Vector3()

  connector.getWorldPosition(at)
  unit.position.set(at.x, 0, at.z)

  return unit
}

function standBehind(display, behind) {
  display.position.set(0, 0, 0)

  const own = boundsOf(display)

  display.position.z = behind.min.z - GAP - own.max.z
}

// The ribbon is laid straight across the desk from the interface's end of it
// to the drive's, over each of them for half its own width, where it folds.
function layRibbon(drive) {
  const ribbon = drive.getObjectByName("ribbon"),
    interfaceEnd = drive.getObjectByName("ribbon-from"),
    driveEnd = drive.getObjectByName("ribbon-to"),
    from = new Vector3(),
    to = new Vector3()

  ribbon.rotation.y = 0
  ribbon.scale.x = 1
  interfaceEnd.getWorldPosition(from)
  driveEnd.getWorldPosition(to)

  const own = boundsOf(ribbon),
    across = new Vector3().subVectors(to, from),
    length = across.length(),
    half = (own.max.z - own.min.z) / 2,
    laidLength = own.max.x - own.min.x

  ribbon.position.copy(from).addScaledVector(across, -half / length)
  ribbon.rotation.y = Math.atan2(-across.z, across.x)
  ribbon.scale.x = (length + 2 * half) / laidLength
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
// deeper than the computer reaches back beside the display.
function standBeside(recorder, reach, display) {
  recorder.position.set(0, 0, 0)

  const own = boundsOf(recorder),
    displayBounds = boundsOf(display),
    right = Math.max(reach.max.x, displayBounds.max.x)

  recorder.position.set(right + GAP - own.min.x, 0, reach.max.z - own.max.z)
}

// Each piece is stood from where it would stand alone, so a desk whose pieces
// change is arranged again whole; a computer's lead is stowed while it is
// measured, and laid to the display once that stands.
export default function arrange(computer, { monitor, television, drive, recorder }) {
  const display = monitor ?? television,
    { lead } = computer

  if (lead) {
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

  if (recorder) {
    standBeside(recorder, reach, display)
  }

  if (lead) {
    lead.lay(display)
  }
}
