import { CameraRig, Desk } from "../models"
import { Vector2, WebGPURenderer } from "three/webgpu"
import Element from "./element"
import html from "../html"
import { mediaIn } from "../emulator"

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
</menu>`

const NOTHING_PICKED = { name: null, view: null }

const ARCHIVE = ".zip"

function viewMarkup({ view, title, icon }) {
  return html`<li>
    <button type="button" data-view="${view}" title="${title}" aria-pressed="false">${icon}</button>
  </li>`
}

function slotMarkup({ view, noun, plural, suffixes }) {
  const accepted = [...suffixes, ARCHIVE],
    accept = accepted.join(",")

  return html`<input type="file" accept="${accept}" hidden />
    <output name="${view}"></output>
    <dialog name="${plural}">
      <form method="dialog">
        <p>Which ${noun}?</p>
        <menu aria-label="The ${plural} in the archive"></menu>
        <button value="">Cancel</button>
      </form>
    </dialog>`
}

// A machine and its monitor standing on a desk: the scene, the views a reader
// moves between, the pointer that picks a part, the keyboard that reaches the
// machine, and the place it takes what it reads at. A desk for one machine
// brings `models`, the names of the models it stands; `createComputer`, the
// machine that runs; `keyMatrix`, where a browser's keys fall on that
// machine's matrix; `sharesControl`, whether the browser's CONTROL is that
// machine's CONTROL; `slotOf`, the place the desk laid out for what it reads
// and the medium that goes in there, each image alone or in an archive; and
// whatever controls of its own a reader works.
export default class DeskElement extends Element {
  #chooser = null
  #computer = null
  #desk
  #heldByCode = new Map()
  #hovering
  #initialising
  #media = []
  #mediaDialog = null
  #medium = null
  #menu
  #notice = null
  #observer
  #offered = null
  #pointer = new Vector2()
  #pressedAt = new Vector2()
  #renderer
  #rig
  #shown
  #slot = null
  #viewBeforeChoosing

  // The running machine, once it stands.
  get computer() {
    return this.#computer
  }

  get desk() {
    return this.#desk
  }

  get menu() {
    return this.#menu
  }

  get rig() {
    return this.#rig
  }

  init() {
    const renderer = new WebGPURenderer({ alpha: true, antialias: true }),
      canvas = renderer.domElement,
      desk = new Desk(),
      rig = new CameraRig(canvas)

    renderer.setPixelRatio(devicePixelRatio)
    this.prepend(canvas)
    canvas.insertAdjacentHTML("afterend", VIEW_MENU)

    this.#desk = desk
    this.#hovering = false
    this.#menu = this.querySelector("menu")
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

    this.#initialising = this.#load({ desk, rig, renderer }, signal)
  }

  // What a click on a part asks for: what the medium's own parts answer, a
  // medium chosen for the place it goes in at, or a look at the part it leads
  // to. A medium being carried takes no other until it is in.
  intentOf({ name, view }) {
    const medium = this.#medium,
      worked = medium?.answers(name) ?? null,
      carrying = medium?.carrying ?? false,
      takesMedium = view != null && view == this.#slot?.view && !carrying,
      leads = view != null && view != this.#rig.view

    if (worked) {
      return worked
    }

    if (takesMedium) {
      return "choose"
    }

    return leads ? "look" : null
  }

  act(intent, { name, view }) {
    switch (intent) {
      case "eject":
        this.#eject()
        break
      case "press":
        this.#press(name)
        break
      case "reset":
        this.#medium.resetCounter()
        break
      case "choose":
        this.#chooseMedium()
        break
      case "look":
        this.#rig.look(view)
        break
      default:
        break
    }
  }

  // Called every frame after the machine has run, for what moves with it: a
  // medium on its way, which the machine is given once it is in.
  advance(now) {
    const seated = this.#medium.advance(now)

    if (seated) {
      this.#insertOffered()
    }
  }

  // Where the reader stood before a part carried the eye away. One turned
  // freely there left no view to come back to, and stays where it is.
  lookBack(left) {
    const returning = left != null

    if (returning) {
      this.#rig.look(left)
    }
  }

  // The place a machine takes what it reads brings its view, the chooser of
  // what it reads, its notice and the dialog that picks one out of an archive.
  #fitSlot(desk, signal) {
    const { slot, medium } = this.slotOf(desk),
      view = viewMarkup(slot),
      markup = slotMarkup(slot)

    this.#menu.insertAdjacentHTML("beforeend", view)
    this.#menu.insertAdjacentHTML("afterend", markup)
    this.#slot = slot
    this.#medium = medium
    this.#chooser = this.querySelector("input[type='file']")
    this.#mediaDialog = this.querySelector(`dialog[name='${slot.plural}']`)
    this.#notice = this.querySelector(`output[name='${slot.view}']`)
    this.#chooser.addEventListener("change", this.onFileChosen.bind(this), { signal })
    this.#chooser.addEventListener("cancel", this.onChoiceCancelled.bind(this), { signal })
    this.#mediaDialog.addEventListener("close", this.onMediumPicked.bind(this), { signal })
  }

  // The chooser is emptied before the read, or the same file chosen again
  // would count as no choice at all.
  async onFileChosen() {
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

  // A file holding one image goes straight in; one holding several is asked
  // about, because which disc or tape a set of them starts from is the reader's to say.
  async #open(filename, bytes) {
    const media = this.#mediaFrom(filename, bytes)

    if (!media) {
      return
    }

    const alone = media.length == 1,
      empty = media.length == 0

    if (empty) {
      this.#tell(`${filename} was refused: it holds no ${this.#slot.noun}`)
      return
    }

    if (alone) {
      const [only] = media

      await this.#take(only)
      return
    }

    this.#media = media
    this.#listMedia(media)
    this.#mediaDialog.returnValue = ""
    this.#mediaDialog.showModal()
  }

  #mediaFrom(filename, bytes) {
    try {
      return mediaIn(filename, bytes, this.#slot.suffixes)
    } catch (problem) {
      this.#tell(`${filename} was refused: ${problem.message}`)
      return null
    }
  }

  // A name out of an archive is whatever bytes it was written with, so it is
  // set as text and never as markup.
  #listMedia(media) {
    const menu = this.#mediaDialog.querySelector("menu")

    menu.replaceChildren()

    for (const [place, medium] of media.entries()) {
      const item = document.createElement("li"),
        button = document.createElement("button")

      button.value = String(place)
      button.textContent = medium.name
      item.append(button)
      menu.append(item)
    }
  }

  onMediumPicked() {
    const picked = this.#mediaDialog.returnValue,
      media = this.#media

    this.#media = []
    this.focus()

    const cancelled = picked == ""

    if (cancelled) {
      this.lookBack(this.#viewBeforeChoosing)
      return
    }

    const place = Number(picked),
      medium = media[place]

    this.#take(medium)
  }

  // The image is unpacked only once it is chosen, so an archive of several
  // costs the reader one of them and not all.
  async #take(medium) {
    const { signal } = this,
      { noun } = this.#slot,
      roomy = medium.length <= this.#medium.capacity

    // The archive says how large an image stands before it is unpacked, so one
    // the machine has no room for is never unpacked at all.
    if (!roomy) {
      this.#tell(
        `${medium.name} was refused: the image is larger than the room a ${noun} is given here`
      )
      return
    }

    try {
      const bytes = await medium.read(),
        laidAway = signal.aborted

      if (laidAway) {
        return
      }

      this.#offered = { name: medium.name, bytes }
      this.#medium.insert(medium.name)
    } catch (problem) {
      this.#tell(`${medium.name} was refused: ${problem.message}`)
    }
  }

  #insertOffered() {
    const { name, bytes } = this.#offered,
      medium = this.#medium,
      inserted = medium.put(bytes)

    this.#offered = null

    if (inserted) {
      this.#tell(`${name} is ${this.#slot.place}`)
      this.lookBack(this.#viewBeforeChoosing)
      return
    }

    const problem = medium.problem()

    this.#tell(`${name} was refused: ${problem}`)
    medium.erase()
    medium.eject()
  }

  onChoiceCancelled() {
    this.lookBack(this.#viewBeforeChoosing)
  }

  // A browser opens the chooser only within the click that asked for it, so
  // nothing may be awaited before it opens.
  #chooseMedium() {
    this.#viewBeforeChoosing = this.#rig.view
    this.#rig.look(this.#slot.view)
    this.#chooser.click()
  }

  // A medium still on its way in is turned around, and the machine is never
  // given it: the reader pressed EJECT before the drive had it.
  #eject() {
    this.#rig.look(this.#slot.view)
    this.#offered = null
    this.#medium.eject()
    this.#tell("")
  }

  #press(name) {
    const ejected = this.#medium.press(name)

    if (ejected) {
      this.#tell("")
    }
  }

  // The notice stays in the page, empty or not, so that a screen reader is
  // already listening when it speaks.
  #tell(news) {
    this.#notice.value = news
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

    const picked = this.#rig.pick(this.#pointer),
      intent = this.intentOf(picked)

    this.act(intent, picked)
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

  #aim({ offsetX, offsetY, target }) {
    const across = (offsetX / target.clientWidth) * 2 - 1,
      down = (offsetY / target.clientHeight) * 2 - 1

    this.#pointer.set(across, -down)
  }

  #showViews() {
    const rig = this.#rig,
      { view } = rig,
      picked = this.#hovering ? rig.pick(this.#pointer) : NOTHING_PICKED,
      answers = this.intentOf(picked) != null,
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
      this.#computer.pressKey(key)
    }
  }

  // A release is never withheld. A key let go of while a modifier happens to
  // be down is still let go of, and a press left standing repeats for ever.
  onKeyUp(event) {
    const standing = this.#computer != null,
      keys = this.keyMatrix[event.code],
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
    const standing = this.#computer != null

    if (standing) {
      this.#heldByCode.clear()
      this.#computer.releaseAllKeys()
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
        this.#computer.releaseKey(key)
      }
    }
  }

  #takeKeys(event) {
    const standing = this.#computer != null,
      keys = this.keyMatrix[event.code],
      systemChord = event.metaKey || event.altKey,
      // The options panel stands inside this element, and a slider being
      // turned with the arrow keys is not the machine's keyboard.
      onTheDesk = event.target == this,
      reaches = standing && onTheDesk && Boolean(keys) && !systemChord

    if (!reaches) {
      return null
    }

    // A machine with a CONTROL key of its own shares it with the page, whose
    // shortcuts a chord holding it still reaches; one that reads the browser's
    // CONTROL as another key takes the chord whole.
    const leftToThePage = event.ctrlKey && this.sharesControl

    if (!leftToThePage) {
      event.preventDefault()
    }

    return keys
  }

  async #load({ desk, rig, renderer }, signal) {
    await renderer.init()

    const wireframe = this.hasAttribute("wireframe"),
      anisotropy = renderer.getMaxAnisotropy(),
      computer = await this.createComputer(signal, anisotropy)

    await desk.load(anisotropy, computer, this.models)
    desk.scene.traverse(function (object) {
      const drawn = object.isMesh

      if (drawn) {
        object.material.wireframe = wireframe
      }
    })

    const standing = !signal.aborted

    if (standing) {
      const options = this.querySelector("colophon-options"),
        advance = this.advance.bind(this),
        showViews = this.#showViews.bind(this)

      this.#computer = computer
      this.#fitSlot(desk, signal)
      rig.use(desk)
      options.use(desk.settings)
      this.#menu.hidden = false
      renderer.setAnimationLoop(function (now) {
        computer.advance(now)
        rig.advance(now)
        advance(now)
        showViews()
        renderer.render(desk.scene, rig.camera)
      })
    }

    return { computer, desk }
  }

  dispose() {
    const renderer = this.#renderer

    renderer.setAnimationLoop(null)
    this.#computer = null
    this.#observer.disconnect()
    this.#rig.dispose()
    this.#chooser?.remove()
    this.#mediaDialog?.remove()
    this.#notice?.remove()
    this.#menu.remove()
    this.#release(renderer)
    renderer.domElement.remove()
  }

  // A load that threw built nothing to release, but the device it was building
  // on is owed its disposal either way. Its failure is left to the promise
  // nobody else took, which is where the page reports it.
  async #release(renderer) {
    try {
      const { computer, desk } = await this.#initialising

      computer.dispose()
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
