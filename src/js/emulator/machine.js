// A tab hidden for an hour owes an hour of emulation. The machine loses the
// time instead, as one switched off would.
const MAXIMUM_DEBT_MILLISECONDS = 80

const BITS_A_LINE = 8

// What the desk asks of any machine it stands, kept as the player keeps it in
// its src/js/emulator/machine.js: the cycles owed since the last frame, run on
// to the next retrace so the picture is whole, and a key's release held until
// a frame has reached the glass. A machine class brings its own board's calls
// and adds its own hardware to this.
export default class Machine {
  picture

  // One entry a matrix position, 1 where the machine holds a key down.
  keys

  // Whether the machine is switched on. One switched off is not a machine
  // standing idle: it is gone, and switching on makes another.
  running = true

  #board
  #debt = 0
  #last
  #pendingReleases = new Set()
  #presentCount = 0
  #pressedAt = new Map()

  constructor(board, picture) {
    this.picture = picture
    this.keys = new Array(board.matrix.length * BITS_A_LINE)
    this.#board = board
    this.#last = performance.now()
    this.#readKeys()
  }

  pressKey(key) {
    this.#pendingReleases.delete(key)
    this.#pressedAt.set(key, this.#presentCount)
    this.#board.press(key)
  }

  // The firmware reads the matrix once a frame, so a key pressed and let go
  // between two reads was never pressed at all.
  releaseKey(key) {
    const seen = this.#presentCount > this.#pressedAt.get(key)

    if (seen) {
      this.#pressedAt.delete(key)
      this.#board.release(key)
    } else {
      this.#pendingReleases.add(key)
    }
  }

  releaseAllKeys() {
    this.#pressedAt.clear()
    this.#pendingReleases.clear()
    this.#board.releaseAll()
    this.#readKeys()
  }

  // A machine switched off owes nothing, and one switched on owes only the
  // time since the frame before.
  advance(now) {
    const off = !this.running

    if (off) {
      this.#debt = 0
      this.#last = now
      return
    }

    const board = this.#board,
      owed = (now - this.#last) * board.ticksPerMillisecond,
      maximum = MAXIMUM_DEBT_MILLISECONDS * board.ticksPerMillisecond

    this.#debt = Math.min(this.#debt + owed, maximum)
    this.#last = now

    let drew = false
    while (this.#debt > 0) {
      // A frame's worth of slack past the debt lets the frame standing finish,
      // and is what tells a retrace from a limit that simply ran out.
      const limit = Math.ceil(this.#debt) + board.ticksPerFrame,
        ticks = board.runUntilRetrace(limit)

      this.#debt -= ticks
      drew = true
    }

    if (drew) {
      this.#present()
    }
  }

  dispose() {
    this.picture.dispose()
  }

  #present() {
    this.#presentCount++
    // Read before the waiting releases are let go, so the caps stand on what
    // the machine held through the frame now reaching the glass: a key tapped
    // inside one frame is down for exactly that frame.
    this.#readKeys()

    for (const key of this.#pendingReleases) {
      this.#pressedAt.delete(key)
      this.#board.release(key)
    }

    this.#pendingReleases.clear()
    this.picture.refresh()
  }

  #readKeys() {
    const { matrix } = this.#board

    for (let line = 0; line < matrix.length; line++) {
      const byte = matrix[line]

      for (let bit = 0; bit < BITS_A_LINE; bit++) {
        const down = (byte & (1 << bit)) == 0

        this.keys[line * BITS_A_LINE + bit] = down ? 1 : 0
      }
    }
  }
}
