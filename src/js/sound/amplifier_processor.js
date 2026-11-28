// Loaded into the audio thread on its own, so it imports nothing.

// Enough lead to cover the whole frames a page delivers its runs in, and room
// for what a page delivers after a stall.
const LEAD_SECONDS = 0.05,
  CAPACITY_SECONDS = 0.25,
  // A lead this far past its mark for this long is let go down to it, as
  // jsbeeb lets it go (ExcessLeadMs and PersistentExcessSeconds,
  // src/audio-latency.js, aa0a7d7, https://github.com/mattgodbolt/jsbeeb).
  EXCESS_SECONDS = 0.05,
  EXCESS_PATIENCE_SECONDS = 0.5

// Proportional on the lead smoothed over half a second. A sound card's crystal
// "is off by tens of parts per million, a bad one by a few hundred"
// (audio/audio_driver.c, d44a83afda, https://github.com/libretro/RetroArch);
// RetroArch steers by at most 0.5% (DEFAULT_RATE_CONTROL_DELTA, config.def.h)
// and jsbeeb's worklet by 0.05% (MaxAdjustFraction,
// src/web/audio-renderer.js), and this by 0.2%.
const SMOOTHING_SECONDS = 0.5,
  MAXIMUM_ADJUSTMENT = 0.002

// The levels come in tenths of a millivolt. Full scale stands above the
// loudest the socket gives, every output of the sound chip at its top: the
// 9250 at the top of colophon-emulator's output_tenths_of_millivolts (src/cpc.c,
// Couriersud's measurement as MAME quotes it), which the socket's 22 and 10
// parts in 32 leave as it is, risen from silence, and the less than a tenth a
// band-limited step overshoots by [E].
const FULL_SCALE = 10200

// A socket carries its DC, and whatever is plugged into it blocks that: here
// below hearing.
const BLOCKED_BELOW_HERTZ = 5,
  POLE = Math.exp((-2 * Math.PI * BLOCKED_BELOW_HERTZ) / sampleRate)

// The socket's two sides, interleaved.
const SIDES = 2

class AmplifierProcessor extends AudioWorkletProcessor {
  #capacity = Math.ceil(CAPACITY_SECONDS * sampleRate)
  #ended = false
  #excessFor = 0
  #first = 0
  #held = 0
  #lead = Math.round(LEAD_SECONDS * sampleRate)
  #level = [0, 0]
  #playing = false
  #previousInput = [0, 0]
  #previousOutput = [0, 0]
  #ring = new Float32Array(this.#capacity * SIDES)
  #smoothed = 0

  constructor() {
    super()
    this.port.onmessage = event => this.onMessage(event.data)
  }

  onMessage(message) {
    switch (message.kind) {
      case "begin":
        this.#begin()
        break
      case "samples":
        this.#receive(message)
        break
      case "end":
        this.#ended = true
        break
      default:
        break
    }
  }

  // A gap, where nothing was delivered, holds the last level, which the
  // coupling then lets fall to silence. A processor that has not ended is
  // kept running whether or not anything still plays through it.
  process(_inputs, outputs) {
    const [left, right] = outputs[0]

    for (let index = 0; index < left.length; index++) {
      const starting = !this.#playing && this.#held >= this.#lead,
        runDry = this.#playing && this.#held == 0

      if (starting) {
        this.#playing = true
        this.#join()
      } else if (runDry) {
        this.#playing = false
      }

      if (this.#playing) {
        this.#level[0] = this.#ring[this.#first * SIDES]
        this.#level[1] = this.#ring[this.#first * SIDES + 1]
        this.#first = (this.#first + 1) % this.#capacity
        this.#held--
      }

      left[index] = this.#couple(0)
      right[index] = this.#couple(1)
    }

    this.#steer(left.length)

    return !this.#ended
  }

  #begin() {
    this.#held = 0
    this.#playing = false
    this.#smoothed = 0
    this.#excessFor = 0
  }

  // The samples go back to be filled again, with how far the page should
  // nudge its rate.
  #receive({ samples, length }) {
    const adjustment = this.#adjustment(),
      returned = { samples, adjustment }

    this.#take(samples, length)
    this.port.postMessage(returned, [samples.buffer])
  }

  // What finds no room is dropped.
  #take(samples, length) {
    const frames = length / SIDES

    for (let frame = 0; frame < frames && this.#held < this.#capacity; frame++) {
      const at = ((this.#first + this.#held) % this.#capacity) * SIDES

      this.#ring[at] = samples[frame * SIDES]
      this.#ring[at + 1] = samples[frame * SIDES + 1]
      this.#held++
    }
  }

  // A series capacitor into a load: one zero at DC and one pole.
  #couple(side) {
    const level = this.#level[side] / FULL_SCALE,
      coupled = level - this.#previousInput[side] + POLE * this.#previousOutput[side]

    this.#previousInput[side] = level
    this.#previousOutput[side] = coupled

    return coupled
  }

  // Across a seam — sound resumed after a gap, or an excess let go — the
  // coupling is told the level was already the one that follows, so the jump
  // is never heard as a step.
  #join() {
    this.#previousInput[0] = this.#ring[this.#first * SIDES] / FULL_SCALE
    this.#previousInput[1] = this.#ring[this.#first * SIDES + 1] / FULL_SCALE
  }

  // The excess is measured on the smoothed lead, so that one delivery is not
  // taken for a lead kept, and let go from what is held now.
  #steer(frames) {
    const weight = frames / (SMOOTHING_SECONDS * sampleRate),
      excess = this.#held - this.#lead

    this.#smoothed += (this.#held - this.#smoothed) * weight

    const within = this.#smoothed <= this.#lead + EXCESS_SECONDS * sampleRate || excess <= 0

    if (within) {
      this.#excessFor = 0
      return
    }

    this.#excessFor += frames

    const persisted = this.#excessFor >= EXCESS_PATIENCE_SECONDS * sampleRate

    if (persisted) {
      this.#first = (this.#first + excess) % this.#capacity
      this.#held = this.#lead
      this.#smoothed = this.#lead
      this.#excessFor = 0
      this.#join()
    }
  }

  // Short of the lead the page is asked for more, past it for less.
  #adjustment() {
    const error = (this.#lead - this.#smoothed) / this.#lead,
      bounded = Math.max(-1, Math.min(1, error))

    return 1 + bounded * MAXIMUM_ADJUSTMENT
  }
}

registerProcessor("colophon-amplifier", AmplifierProcessor)
