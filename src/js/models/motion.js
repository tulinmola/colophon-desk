import { MathUtils } from "three/webgpu"

// A change carried out over so many milliseconds, after so many more of
// waiting, each counted from the first frame that advances it. Each frame
// hands the step its progress, eased, from 0 to 1.
export default class Motion {
  static easeIn = progress => progress ** 3
  static easeOut = progress => 1 - (1 - progress) ** 3
  static easeInOut = progress => MathUtils.smootherstep(progress, 0, 1)
  finished
  #delay
  #duration
  #ease
  #resolve
  #startedAt = null
  #step

  constructor({ duration, delay = 0, ease }, step) {
    this.#delay = delay
    this.#duration = duration
    this.#ease = ease
    this.#step = step
    this.finished = new Promise(resolve => {
      this.#resolve = resolve
    })
  }

  // Answers whether it goes on.
  advance(now) {
    this.#startedAt ??= now

    const elapsed = now - this.#startedAt - this.#delay,
      done = elapsed >= this.#duration,
      begun = elapsed >= 0,
      progress = done ? 1 : Math.max(elapsed, 0) / this.#duration,
      eased = this.#ease(progress)

    if (begun) {
      this.#step(eased)
    }

    if (done) {
      this.#resolve()
    }

    return !done
  }
}
