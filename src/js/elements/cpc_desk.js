import { CameraRig, Desk } from "../models"
import { Cpc, KEY_MATRIX, mediaIn } from "../emulator"
import { Vector2, WebGPURenderer } from "three/webgpu"
import Element from "./element"
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
  DATACORDER_ICON = html`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <circle cx="8" cy="11" r="2" />
    <circle cx="16" cy="11" r="2" />
    <path d="M10 11h4M6 19l2-4h8l2 4" />
  </svg>`

const VIEW_MENU = html`<menu aria-label="Views" hidden>
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
  <li>
    <button type="button" data-view="datacorder" title="The datacorder" aria-pressed="false">
      ${DATACORDER_ICON}
    </button>
  </li>
</menu>`

// Where a machine takes what it reads: drive A its discs, a 464's datacorder its tapes, each image alone or in an archive.
const SLOTS = {
    drive: {
      view: "drive",
      noun: "disc",
      plural: "discs",
      suffixes: [".dsk"],
      place: "in drive A"
    },
    datacorder: {
      view: "datacorder",
      noun: "tape",
      plural: "tapes",
      suffixes: [".cdt", ".tzx"],
      place: "in the datacorder"
    }
  },
  ARCHIVE = ".zip"

function slotMarkup({ view, noun, plural, suffixes }) {
  const accepted = [...suffixes, ARCHIVE],
    accept = accepted.join(",")

  return html`<input type="file" name="${plural}" accept="${accept}" hidden />
    <output name="${view}"></output>
    <dialog name="${plural}">
      <form method="dialog">
        <p>Which ${noun}?</p>
        <menu aria-label="The ${plural} in the archive"></menu>
        <button value="">Cancel</button>
      </form>
    </dialog>`
}

const POWER = html`<dialog name="power">
  <form method="dialog">
    <p>Turn the computer off? Everything in its memory goes with it.</p>
    <button value="off">Turn it off</button>
    <button value="" autofocus>Leave it on</button>
  </form>
</dialog>`

const NOTHING_PICKED = { name: null, view: null }

// A desk that names no machine or monitor stands the ones it was first built for, and one that names no disc interface gives its machine none but its own.
const FIRST_MACHINE = "cpc6128",
  FIRST_MONITOR = "ctm644"

class CpcDeskElement extends Element {
  #cpc = null
  #desk
  #powerDialog
  #heldByCode = new Map()
  #offered = new Map()
  #hovering
  #initialising
  #menu
  #observer
  #pointer = new Vector2()
  #pressedAt = new Vector2()
  #renderer
  #rig
  #shown
  #slots = new Map()
  #viewBeforeChoosing = new Map()
  #viewBeforeSwitching

  init() {
    const renderer = new WebGPURenderer({ alpha: true, antialias: true }),
      canvas = renderer.domElement,
      desk = new Desk(),
      rig = new CameraRig(canvas)

    renderer.setPixelRatio(devicePixelRatio)
    this.prepend(canvas)
    canvas.insertAdjacentHTML("afterend", VIEW_MENU)

    const menu = this.querySelector("menu"),
      machine = this.getAttribute("machine") ?? FIRST_MACHINE,
      monitor = this.getAttribute("monitor") ?? FIRST_MONITOR,
      discInterface = this.getAttribute("disc-interface")

    menu.insertAdjacentHTML("afterend", POWER)

    this.#desk = desk
    this.#powerDialog = this.querySelector("dialog[name='power']")
    this.#hovering = false
    this.#menu = menu
    this.#renderer = renderer
    this.#rig = rig
    this.#shown = { view: null, lead: null, answers: false }

    const resized = this.onResized.bind(this),
      { signal } = this

    this.#observer = new ResizeObserver(resized)
    this.#observer.observe(this)

    this.addEventListener("keydown", this.onKeyDown.bind(this), { signal })
    this.addEventListener("keyup", this.onKeyUp.bind(this), { signal })
    this.addEventListener("blur", this.onBlur.bind(this), { signal })
    canvas.addEventListener("pointerdown", this.onPointerDown.bind(this), { signal })
    canvas.addEventListener("pointermove", this.onPointerMove.bind(this), { signal })
    canvas.addEventListener("pointerleave", this.onPointerLeave.bind(this), { signal })
    canvas.addEventListener("click", this.onSceneClicked.bind(this), { signal })
    this.#menu.addEventListener("click", this.onViewChosen.bind(this), { signal })
    this.#powerDialog.addEventListener("close", this.onPowerAnswered.bind(this), { signal })

    this.#initialising = this.#load(
      { desk, rig, renderer, names: { machine, monitor, discInterface } },
      signal
    )
  }

  // Each slot the desk has brings the chooser of what it reads, its notice and
  // the dialog that picks one out of an archive; the view of a slot it has not
  // got goes.
  #fitSlots(desk, signal) {
    const onDesk = { drive: desk.disc, datacorder: desk.datacorder }

    for (const kind of Object.values(SLOTS)) {
      const medium = onDesk[kind.view],
        fitted = medium != null

      if (!fitted) {
        const item = this.#menu.querySelector(`[data-view='${kind.view}']`).closest("li")

        item.remove()
        continue
      }

      const markup = slotMarkup(kind)

      this.#menu.insertAdjacentHTML("afterend", markup)

      const slot = {
        ...kind,
        medium,
        chooser: this.querySelector(`input[name='${kind.plural}']`),
        dialog: this.querySelector(`dialog[name='${kind.plural}']`),
        notice: this.querySelector(`output[name='${kind.view}']`),
        entries: []
      }

      slot.chooser.addEventListener("change", this.onFileChosen.bind(this, slot), { signal })
      slot.chooser.addEventListener("cancel", this.onChoiceCancelled.bind(this, slot), { signal })
      slot.dialog.addEventListener("close", this.onEntryPicked.bind(this, slot), { signal })
      this.#slots.set(kind.view, slot)
    }
  }

  onPointerDown(event) {
    this.#pressedAt.set(event.clientX, event.clientY)
  }

  onPointerMove(event) {
    const touching = event.pointerType == "touch",
      pressing = event.buttons != 0

    this.#hovering = !touching && !pressing
    this.#aim(event)
  }

  onPointerLeave() {
    this.#hovering = false
  }

  onSceneClicked(event) {
    const travelled = this.#pressedAt.distanceTo({ x: event.clientX, y: event.clientY }),
      turned = travelled > CLICK_SLACK

    if (turned) {
      return
    }

    this.#aim(event)

    const rig = this.#rig,
      picked = rig.pick(this.#pointer),
      intent = this.#intentOf(picked)

    switch (intent) {
      case "eject":
        this.#ejectDisc()
        break
      case "press":
        this.#pressDatacorderKey(picked.name)
        break
      case "reset":
        this.#desk.datacorder.resetCounter()
        break
      case "choose":
        this.#chooseMedium(picked.view)
        break
      case "power":
        this.#switchPower()
        break
      case "look":
        rig.look(picked.view)
        break
      default:
        break
    }
  }

  // The machine's keys reach it only while the desk holds the focus, so a
  // view chosen from the menu hands the focus back.
  onViewChosen(event) {
    const button = event.target.closest("button")

    if (!button) {
      return
    }

    this.#rig.look(button.dataset.view)
    this.focus()
  }

  // The chooser is emptied before the read, or the same file chosen again
  // would count as no choice at all.
  async onFileChosen(slot) {
    const { chooser } = slot,
      [file] = chooser.files,
      { signal } = this

    chooser.value = ""

    const contents = await file.arrayBuffer(),
      laidAway = signal.aborted

    if (laidAway) {
      return
    }

    const bytes = new Uint8Array(contents)

    this.#open(slot, file.name, bytes)
  }

  // A file holding one image goes straight in; one holding several is asked
  // about, because which disc or tape a set of them starts from is the reader's to say.
  async #open(slot, filename, bytes) {
    const entries = this.#entriesIn(slot, filename, bytes)

    if (!entries) {
      return
    }

    const alone = entries.length == 1,
      empty = entries.length == 0

    if (empty) {
      this.#tell(slot, `${filename} was refused: it holds no ${slot.noun}`)
      return
    }

    if (alone) {
      const [only] = entries

      await this.#take(slot, only)
      return
    }

    slot.entries = entries
    this.#listEntries(slot)
    slot.dialog.returnValue = ""
    slot.dialog.showModal()
  }

  #entriesIn(slot, filename, bytes) {
    try {
      return mediaIn(filename, bytes, slot.suffixes)
    } catch (problem) {
      this.#tell(slot, `${filename} was refused: ${problem.message}`)
      return null
    }
  }

  // A name out of an archive is whatever bytes it was written with, so it is
  // set as text and never as markup.
  #listEntries({ dialog, entries }) {
    const menu = dialog.querySelector("menu")

    menu.replaceChildren()

    for (const [place, entry] of entries.entries()) {
      const item = document.createElement("li"),
        button = document.createElement("button")

      button.value = String(place)
      button.textContent = entry.name
      item.append(button)
      menu.append(item)
    }
  }

  onEntryPicked(slot) {
    const picked = slot.dialog.returnValue,
      { entries } = slot

    slot.entries = []
    this.focus()

    const cancelled = picked == ""

    if (cancelled) {
      this.#lookBackFrom(slot)
      return
    }

    const place = Number(picked),
      entry = entries[place]

    this.#take(slot, entry)
  }

  // The image is unpacked only once it is chosen, so an archive of several
  // costs the reader one of them and not all.
  async #take(slot, entry) {
    const { signal } = this,
      { noun } = slot,
      roomy = entry.length <= slot.medium.capacity

    // The archive says how large an image stands before it is unpacked, so one
    // the machine has no room for is never unpacked at all.
    if (!roomy) {
      this.#tell(
        slot,
        `${entry.name} was refused: the image is larger than the room a ${noun} is given here`
      )
      return
    }

    try {
      const bytes = await entry.read(),
        laidAway = signal.aborted

      if (laidAway) {
        return
      }

      this.#offered.set(slot.view, { name: entry.name, bytes })
      slot.medium.insert(entry.name)
    } catch (problem) {
      this.#tell(slot, `${entry.name} was refused: ${problem.message}`)
    }
  }

  #insertOffered(slot) {
    const { name, bytes } = this.#offered.get(slot.view),
      { medium } = slot,
      inserted = medium.put(bytes)

    this.#offered.delete(slot.view)

    if (inserted) {
      this.#tell(slot, `${name} is ${slot.place}`)
      this.#lookBackFrom(slot)
      return
    }

    const problem = medium.problem()

    this.#tell(slot, `${name} was refused: ${problem}`)
    medium.erase()
    medium.eject()
  }

  onChoiceCancelled(slot) {
    this.#lookBackFrom(slot)
  }

  // Each slot keeps the view the reader chose it from, as a disc may still be
  // travelling in when the datacorder's lid is clicked.
  #lookBackFrom({ view }) {
    const left = this.#viewBeforeChoosing.get(view)

    this.#lookBack(left)
  }

  // Where the reader stood before a part carried the eye away. One turned
  // freely there left no view to come back to, and stays where it is.
  #lookBack(left) {
    const returning = left != null

    if (returning) {
      this.#rig.look(left)
    }
  }

  // A datacorder carrying a cassette takes no other until it is in.
  #intentOf({ name, view }) {
    const ejects = name == "eject-button",
      { datacorder } = this.#desk,
      worked = datacorder?.answers(name) ?? null,
      carrying = datacorder?.carrying ?? false,
      busy = view == SLOTS.datacorder.view && carrying,
      takesMedium = this.#slots.has(view) && !busy,
      switches = view == "power",
      leads = view != null && view != this.#rig.view

    if (ejects) {
      return "eject"
    }

    if (worked) {
      return worked
    }

    if (takesMedium) {
      return "choose"
    }

    if (switches) {
      return "power"
    }

    return leads ? "look" : null
  }

  // A browser opens the chooser only within the click that asked for it, so
  // nothing may be awaited before it opens.
  #chooseMedium(view) {
    const slot = this.#slots.get(view)

    this.#viewBeforeChoosing.set(view, this.#rig.view)
    this.#rig.look(view)
    slot.chooser.click()
  }

  // A machine switched on is made afresh and asks nothing; one switched off is
  // gone, with whatever it held, so that is the answer worth asking for.
  #switchPower() {
    const cpc = this.#cpc,
      off = !cpc.running

    // A machine made again carries the eye back to where its switch took it
    // from; one about to be destroyed keeps it here to watch.
    if (off) {
      cpc.switchOn()
      this.#desk.showPower(true)
      this.#lookBack(this.#viewBeforeSwitching)
      return
    }

    this.#viewBeforeSwitching = this.#rig.view
    this.#rig.look("power")
    this.#powerDialog.returnValue = ""
    this.#powerDialog.showModal()
  }

  onPowerAnswered() {
    const answered = this.#powerDialog.returnValue,
      off = answered == "off"

    this.focus()

    // The notice stands: a disc in the drive or a tape in the datacorder is in
    // it whether the machine is running or not, and is there again when the
    // power comes back.
    if (off) {
      this.#cpc.switchOff()
      this.#desk.showPower(false)
      return
    }

    this.#lookBack(this.#viewBeforeSwitching)
  }

  // A disc still on its way in is turned around, and the machine is never
  // given it: the reader pressed EJECT before the drive had it.
  #ejectDisc() {
    const slot = this.#slots.get(SLOTS.drive.view)

    this.#rig.look(slot.view)
    this.#offered.delete(slot.view)
    slot.medium.eject()
    this.#tell(slot, "")
  }

  #pressDatacorderKey(name) {
    const slot = this.#slots.get(SLOTS.datacorder.view),
      ejected = slot.medium.press(name)

    if (ejected) {
      this.#tell(slot, "")
    }
  }

  // The notice stays in the page, empty or not, so that a screen reader is
  // already listening when it speaks.
  #tell({ notice }, news) {
    notice.value = news
  }

  #aim({ offsetX, offsetY, target }) {
    const across = (offsetX / target.clientWidth) * 2 - 1,
      down = (offsetY / target.clientHeight) * 2 - 1

    this.#pointer.set(across, -down)
  }

  #showViews() {
    const rig = this.#rig,
      { view } = rig,
      picked = this.#hovering ? rig.pick(this.#pointer) : NOTHING_PICKED,
      answers = this.#intentOf(picked) != null,
      lead = picked.view == view ? null : picked.view,
      shown = this.#shown,
      unchanged = view == shown.view && lead == shown.lead && answers == shown.answers

    if (unchanged) {
      return
    }

    this.#shown = { view, lead, answers }
    this.#renderer.domElement.toggleAttribute("data-answers", answers)

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
      this.#cpc.pressKey(key)
    }
  }

  // A release is never withheld. A key let go of while a modifier happens to
  // be down is still let go of, and a press left standing repeats for ever.
  onKeyUp(event) {
    const standing = this.#cpc != null,
      keys = KEY_MATRIX[event.code],
      known = standing && Boolean(keys)

    if (!known) {
      return
    }

    const wasHeld = this.#heldByCode.delete(event.code)

    if (wasHeld) {
      this.#letGo(keys)
    }
  }

  onBlur() {
    const standing = this.#cpc != null

    if (standing) {
      this.#heldByCode.clear()
      this.#cpc.releaseAllKeys()
    }
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
        this.#cpc.releaseKey(key)
      }
    }
  }

  #takeKeys(event) {
    const standing = this.#cpc != null,
      keys = KEY_MATRIX[event.code],
      systemChord = event.metaKey || event.altKey,
      // The options panel stands inside this element, and a slider being
      // turned with the arrow keys is not the machine's keyboard.
      onTheDesk = event.target == this,
      reaches = standing && onTheDesk && Boolean(keys) && !systemChord

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

  async #load({ desk, rig, renderer, names }, signal) {
    await renderer.init()

    const wireframe = this.hasAttribute("wireframe"),
      anisotropy = renderer.getMaxAnisotropy(),
      cpc = await Cpc.create(signal, anisotropy, names.machine, names.discInterface)

    await desk.load(anisotropy, cpc, names)
    desk.scene.traverse(function (object) {
      const drawn = object.isMesh

      if (drawn) {
        object.material.wireframe = wireframe
      }
    })

    const standing = !signal.aborted

    if (standing) {
      const options = this.querySelector("colophon-options"),
        insertOffered = this.#insertOffered.bind(this),
        showViews = this.#showViews.bind(this),
        { disc } = desk

      this.#cpc = cpc
      this.#fitSlots(desk, signal)

      const slots = Array.from(this.#slots.values())

      rig.use(desk)
      options.use(desk.settings)
      this.#menu.hidden = false
      renderer.setAnimationLoop(function (now) {
        cpc.advance(now)
        rig.advance(now)

        for (const slot of slots) {
          const seated = slot.medium.advance(now)

          if (seated) {
            insertOffered(slot)
          }
        }

        if (disc) {
          // Read after the insert: the machine clears the lamp's line as it is asked for it.
          const inUse = cpc.driveInUse()

          desk.showDriveInUse(inUse)
        }

        showViews()
        renderer.render(desk.scene, rig.camera)
      })
    }

    return { cpc, desk }
  }

  dispose() {
    const renderer = this.#renderer

    renderer.setAnimationLoop(null)
    this.#cpc = null
    this.#observer.disconnect()
    this.#rig.dispose()
    this.#menu.remove()

    for (const { chooser, dialog, notice } of this.#slots.values()) {
      chooser.remove()
      dialog.remove()
      notice.remove()
    }

    this.#powerDialog.remove()
    this.#release(renderer)
    renderer.domElement.remove()
  }

  // A load that threw built nothing to release, but the device it was building
  // on is owed its disposal either way. Its failure is left to the promise
  // nobody else took, which is where the page reports it.
  async #release(renderer) {
    try {
      const { cpc, desk } = await this.#initialising

      cpc.dispose()
      desk.dispose()
    } catch {
      // Reported there; catching it here only keeps it from being told twice.
    } finally {
      renderer.dispose()
    }
  }

  onResized([entry]) {
    const { width, height } = entry.contentRect

    this.#renderer.setSize(width, height)
    this.#rig.resize(width, height)
  }
}

CpcDeskElement.define("colophon-cpc-desk")
