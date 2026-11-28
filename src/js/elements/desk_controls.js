import { KEY_MATRIX, discsIn } from "../emulator"
import Element from "./element"
import { Vector2 } from "three/webgpu"
import html from "../html"

// A pointer that travels further than this, in CSS pixels, between going down
// and coming up has turned the camera rather than clicked.
const CLICK_SLACK = 10

const DESK_ICON = html`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"
    />
    <path d="M8.5 13V8a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5" />
    <path d="M8 13h8l1 4H7z" />
  </svg>`,
  SET_ICON = html`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 14V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10" />
    <rect x="9" y="6" width="6" height="4" rx="0.5" />
    <path d="M4.5 14h15l2.5 8H2z" />
    <path d="M8 18h8" />
  </svg>`,
  MONITOR_ICON = html`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="2" width="18" height="19" rx="2" />
    <rect x="7" y="6" width="10" height="7" rx="1" />
    <path d="M7 17h3M17 17h.01" />
  </svg>`,
  DRIVE_ICON = html`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 10h12M6 14h.01M15 14h3" />
  </svg>`,
  SOUND_ICON = html`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 9h4l5-4v14l-5-4H3z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>`

const CONTROLS = html`<div class="surface"></div>
  <menu aria-label="Views">
    <li>
      <button type="button" data-view="desk" title="The whole desk" aria-pressed="false">
        ${DESK_ICON}
      </button>
    </li>
    <li>
      <button type="button" data-view="set" title="The computer and monitor" aria-pressed="false">
        ${SET_ICON}
      </button>
    </li>
    <li>
      <button type="button" data-view="monitor" title="The monitor" aria-pressed="false">
        ${MONITOR_ICON}
      </button>
    </li>
    <li>
      <button type="button" data-view="drive" title="The disc drive" aria-pressed="false">
        ${DRIVE_ICON}
      </button>
    </li>
  </menu>
  <button type="button" name="sound" title="Sound" aria-pressed="true">${SOUND_ICON}</button>
  <input type="file" accept=".dsk,.zip" hidden />
  <output name="drive"></output>
  <dialog name="discs">
    <form method="dialog">
      <p>Which disc?</p>
      <menu aria-label="The discs in the archive"></menu>
      <button value="">Cancel</button>
    </form>
  </dialog>
  <dialog name="power">
    <form method="dialog">
      <p>Turn the computer off? Everything in its memory goes with it.</p>
      <button value="off">Turn it off</button>
      <button value="" autofocus>Leave it on</button>
    </form>
  </dialog>`

const NOTHING_PICKED = { name: null, view: null }

// The reader's hands on a running desk: the machine's keys while it holds the
// focus, the camera turned and parts pressed on its surface, the views, the
// sound, the disc drive and the power. It is laid once the desk it is given
// stands.
class DeskControlsElement extends Element {
  #chooser
  #desk = null
  #discs = []
  #discsDialog
  #driveNotice
  #heldByCode = new Map()
  #hovering = false
  #menu
  #pointer = new Vector2()
  #powerDialog
  #pressedAt = new Vector2()
  #shown = { view: null, lead: null, answers: false }
  #soundButton
  #surface
  #viewBeforeChoosing
  #viewBeforeSwitching

  init() {
    const { signal } = this

    this.tabIndex = 0
    this.innerHTML = CONTROLS
    this.#chooser = this.querySelector("input[type='file']")
    this.#discsDialog = this.querySelector("dialog[name='discs']")
    this.#driveNotice = this.querySelector("output[name='drive']")
    this.#menu = this.querySelector("menu")
    this.#powerDialog = this.querySelector("dialog[name='power']")
    this.#soundButton = this.querySelector("button[name='sound']")
    this.#surface = this.querySelector(".surface")

    this.addEventListener("keydown", this.onKeyDown.bind(this), { signal })
    this.addEventListener("keyup", this.onKeyUp.bind(this), { signal })
    this.addEventListener("blur", this.onBlur.bind(this), { signal })
    this.#surface.addEventListener("pointerdown", this.onPointerDown.bind(this), { signal })
    this.#surface.addEventListener("pointermove", this.onPointerMove.bind(this), { signal })
    this.#surface.addEventListener("pointerleave", this.onPointerLeave.bind(this), { signal })
    this.#surface.addEventListener("click", this.onSurfaceClicked.bind(this), { signal })
    this.#menu.addEventListener("click", this.onViewChosen.bind(this), { signal })
    this.#soundButton.addEventListener("click", this.onSoundSwitched.bind(this), { signal })
    this.#chooser.addEventListener("change", this.onDiscChosen.bind(this), { signal })
    this.#chooser.addEventListener("cancel", this.onChoiceCancelled.bind(this), { signal })
    this.#discsDialog.addEventListener("close", this.onDiscPicked.bind(this), { signal })
    this.#powerDialog.addEventListener("close", this.onPowerAnswered.bind(this), { signal })
  }

  dispose() {
    this.#desk = null
    this.replaceChildren()
  }

  // The views shown follow the eye wherever the hand takes it, and wherever
  // the controls send it.
  use(desk) {
    this.#desk = desk
    desk.turnFrom(this.#surface, () => this.#showViews())
    this.#soundButton.setAttribute("aria-pressed", String(desk.heard))
    this.#showViews()
  }

  onPointerDown(event) {
    this.#pressedAt.set(event.clientX, event.clientY)
  }

  onPointerMove(event) {
    const touching = event.pointerType == "touch",
      pressing = event.buttons != 0

    this.#hovering = !touching && !pressing
    this.#aim(event)
    this.#showViews()
  }

  onPointerLeave() {
    this.#hovering = false
    this.#showViews()
  }

  onSurfaceClicked(event) {
    const travelled = this.#pressedAt.distanceTo({ x: event.clientX, y: event.clientY }),
      turned = travelled > CLICK_SLACK

    if (turned) {
      return
    }

    this.#aim(event)

    const desk = this.#desk,
      picked = desk.pick(this.#pointer),
      intent = this.#intentOf(picked)

    switch (intent) {
      case "eject":
        this.#ejectDisc()
        break
      case "choose":
        this.#chooseDisc()
        break
      case "power":
        this.#switchPower()
        break
      case "look":
        desk.look(picked.view)
        break
      default:
        break
    }

    this.#showViews()
  }

  // The machine's keys reach it only while the controls hold the focus, so a
  // view chosen from the menu hands the focus back.
  onViewChosen(event) {
    const button = event.target.closest("button")

    if (!button) {
      return
    }

    this.#desk.look(button.dataset.view)
    this.focus()
    this.#showViews()
  }

  // The sound switched hands the focus back too.
  onSoundSwitched() {
    const desk = this.#desk,
      heard = !desk.heard

    desk.heard = heard
    this.#soundButton.setAttribute("aria-pressed", String(heard))
    this.focus()
  }

  // The chooser is emptied before the read, or the same file chosen again
  // would count as no choice at all.
  async onDiscChosen() {
    const chooser = this.#chooser,
      [file] = chooser.files,
      { signal } = this

    chooser.value = ""

    const contents = await file.arrayBuffer(),
      laidAway = signal.aborted

    if (laidAway) {
      return
    }

    const bytes = new Uint8Array(contents)

    this.#open(file.name, bytes)
  }

  // A file holding one disc goes straight in; one holding several is asked
  // about, because which disc a set of them starts from is the reader's to say.
  async #open(filename, bytes) {
    const discs = this.#discsFrom(filename, bytes)

    if (!discs) {
      return
    }

    const alone = discs.length == 1,
      empty = discs.length == 0

    if (empty) {
      this.#tell(`${filename} was refused: it holds no disc`)
      return
    }

    if (alone) {
      const [only] = discs

      await this.#take(only)
      return
    }

    this.#discs = discs
    this.#listDiscs(discs)
    this.#discsDialog.returnValue = ""
    this.#discsDialog.showModal()
  }

  #discsFrom(filename, bytes) {
    try {
      return discsIn(filename, bytes)
    } catch (problem) {
      this.#tell(`${filename} was refused: ${problem.message}`)
      return null
    }
  }

  // A name out of an archive is whatever bytes it was written with, so it is
  // set as text and never as markup.
  #listDiscs(discs) {
    const menu = this.#discsDialog.querySelector("menu")

    menu.replaceChildren()

    for (const [place, disc] of discs.entries()) {
      const item = document.createElement("li"),
        button = document.createElement("button")

      button.value = String(place)
      button.textContent = disc.name
      item.append(button)
      menu.append(item)
    }
  }

  onDiscPicked() {
    const picked = this.#discsDialog.returnValue,
      discs = this.#discs

    this.#discs = []
    this.focus()

    const cancelled = picked == ""

    if (cancelled) {
      this.#lookBack(this.#viewBeforeChoosing)
      return
    }

    const place = Number(picked),
      disc = discs[place]

    this.#take(disc)
  }

  // The image is unpacked only once its disc is chosen, so an archive of
  // several costs the reader one of them and not all; and the machine is given
  // it only once the drive has it, never if the reader pressed EJECT first.
  async #take(disc) {
    const { signal } = this,
      { machine } = this.#desk,
      roomy = disc.length <= machine.discCapacity

    // The archive says how large a disc stands before it is unpacked, so one
    // the machine has no room for is never unpacked at all.
    if (!roomy) {
      this.#tell(`${disc.name} was refused: the image is larger than the room a disc is given here`)
      return
    }

    const bytes = await this.#read(disc)

    if (!bytes) {
      return
    }

    const laidAway = signal.aborted

    if (laidAway) {
      return
    }

    const seated = await this.#desk.disc.insert(disc.name),
      gone = signal.aborted || !seated

    if (gone) {
      return
    }

    this.#insert(disc.name, bytes)
  }

  async #read(disc) {
    try {
      return await disc.read()
    } catch (problem) {
      this.#tell(`${disc.name} was refused: ${problem.message}`)
      return null
    }
  }

  #insert(name, bytes) {
    const { machine, disc } = this.#desk,
      inserted = machine.insertDisc(bytes)

    if (inserted) {
      this.#tell(`${name} is in drive A`)
      this.#lookBack(this.#viewBeforeChoosing)
      return
    }

    const problem = machine.discProblem()

    this.#tell(`${name} was refused: ${problem}`)
    disc.erase()
    disc.eject()
  }

  onChoiceCancelled() {
    this.#lookBack(this.#viewBeforeChoosing)
  }

  // Where the reader stood before a part carried the eye away. One turned
  // freely there left no view to come back to, and stays where it is.
  #lookBack(left) {
    const returning = left != null

    if (returning) {
      this.#desk.look(left)
      this.#showViews()
    }
  }

  #intentOf({ name, view }) {
    const ejects = name == "eject-button",
      takesDisc = view == "drive",
      switches = view == "power",
      leads = view != null && view != this.#desk.view

    if (ejects) {
      return "eject"
    }

    if (takesDisc) {
      return "choose"
    }

    if (switches) {
      return "power"
    }

    return leads ? "look" : null
  }

  // A browser opens the chooser only within the click that asked for it, so
  // nothing may be awaited before it opens.
  #chooseDisc() {
    const desk = this.#desk

    this.#viewBeforeChoosing = desk.view
    desk.look("drive")
    this.#chooser.click()
  }

  // A machine switched on is made afresh and asks nothing; one switched off is
  // gone, with whatever it held, so that is the answer worth asking for.
  #switchPower() {
    const desk = this.#desk,
      off = !desk.machine.running

    // A machine made again carries the eye back to where the badge took it
    // from; one about to be destroyed keeps it here to watch.
    if (off) {
      desk.switchOn()
      this.#lookBack(this.#viewBeforeSwitching)
      return
    }

    this.#viewBeforeSwitching = desk.view
    desk.look("power")
    this.#powerDialog.returnValue = ""
    this.#powerDialog.showModal()
  }

  onPowerAnswered() {
    const answered = this.#powerDialog.returnValue,
      off = answered == "off"

    this.focus()

    // The notice stands: a disc in the drive is in it whether the machine is
    // running or not, and it is there again when the power comes back.
    if (off) {
      this.#desk.switchOff()
      return
    }

    this.#lookBack(this.#viewBeforeSwitching)
  }

  // A disc still on its way in is turned around, and the machine is never
  // given it: the reader pressed EJECT before the drive had it.
  #ejectDisc() {
    const desk = this.#desk

    desk.look("drive")
    desk.machine.ejectDisc()
    desk.disc.eject()
    this.#tell("")
  }

  // The notice stays in the page, empty or not, so that a screen reader is
  // already listening when it speaks.
  #tell(news) {
    this.#driveNotice.value = news
  }

  #aim({ offsetX, offsetY, target }) {
    const across = (offsetX / target.clientWidth) * 2 - 1,
      down = (offsetY / target.clientHeight) * 2 - 1

    this.#pointer.set(across, -down)
  }

  #showViews() {
    const desk = this.#desk,
      { view } = desk,
      picked = this.#hovering ? desk.pick(this.#pointer) : NOTHING_PICKED,
      answers = this.#intentOf(picked) != null,
      lead = picked.view == view ? null : picked.view,
      shown = this.#shown,
      unchanged = view == shown.view && lead == shown.lead && answers == shown.answers

    if (unchanged) {
      return
    }

    this.#shown = { view, lead, answers }
    this.#surface.toggleAttribute("data-answers", answers)

    for (const button of this.#menu.querySelectorAll("button")) {
      const chosen = button.dataset.view == view,
        pointedAt = button.dataset.view == lead

      button.setAttribute("aria-pressed", String(chosen))
      button.toggleAttribute("data-pointed", pointedAt)
    }
  }

  onKeyDown(event) {
    const keys = this.#takeKeys(event)

    if (!keys) {
      return
    }

    this.#heldByCode.set(event.code, keys)

    for (const key of keys) {
      this.#desk.machine.pressKey(key)
    }
  }

  // A release is never withheld. A key let go of while a modifier happens to
  // be down is still let go of, and a press left standing repeats for ever.
  onKeyUp(event) {
    const keys = KEY_MATRIX[event.code],
      wasHeld = this.#heldByCode.delete(event.code)

    if (wasHeld) {
      this.#letGo(keys)
    }
  }

  onBlur() {
    this.#heldByCode.clear()
    this.#desk.machine.releaseAllKeys()
  }

  // A switch two browser keys close is still closed while either is down:
  // SHIFT and CONTROL are each one position under two keys.
  #letGo(keys) {
    const stillHeld = new Set()

    for (const held of this.#heldByCode.values()) {
      for (const key of held) {
        stillHeld.add(key)
      }
    }

    for (const key of keys) {
      if (!stillHeld.has(key)) {
        this.#desk.machine.releaseKey(key)
      }
    }
  }

  // Only a key pressed on the controls themselves reaches the machine: one
  // pressed on a button among them, or in a dialog, is the page's.
  #takeKeys(event) {
    const keys = KEY_MATRIX[event.code],
      systemChord = event.metaKey || event.altKey,
      onTheDesk = event.target == this,
      reaches = onTheDesk && Boolean(keys) && !systemChord

    if (!reaches) {
      return null
    }

    // CONTROL is a key this machine reads, so a chord holding it is sent on
    // with the page's own default left alone.
    const heldWithControl = event.ctrlKey

    if (!heldWithControl) {
      event.preventDefault()
    }

    return keys
  }
}

DeskControlsElement.define("colophon-desk-controls")
