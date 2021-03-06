import { Spec } from '../spec/types'

export type TimeTracker = ReturnType<typeof createTimeTracker>

export function createTimeTracker({ timeout }: Pick<Spec.Options, 'timeout'>, onTimeout: (elapsed: number) => void) {
  let handle: any
  let startTick: number
  let endTick: number
  let prevTick: number
  return {
    /**
     * Get the duration since the first `elapse()` call.
     */
    duration() {
      endTick = new Date().getTime()
      return endTick - startTick
    },
    /**
     * Get the elapsed time since the last `elapse()` call.
     * First `elapse()` call returns 0.
     */
    elapse() {
      if (!handle) {
        prevTick = startTick = new Date().getTime()
        handle = setTimeout(() => this.terminate(), timeout)
        return 0
      }
      else {
        const newTick = new Date().getTime()
        const elapsed = newTick - prevTick
        prevTick = newTick

        clearTimeout(handle)
        handle = setTimeout(() => this.terminate(), timeout)

        return elapsed
      }
    },
    /**
     * Stop time tracker and return the total duration since the first `elapse()` call.
     */
    stop() {
      const duration = this.duration()
      clearTimeout(handle)
      handle = undefined
      return duration
    },
    terminate() {
      if (handle) {
        const newTick = new Date().getTime()
        const elapsed = newTick - prevTick
        onTimeout(elapsed)
        this.stop()
      }
    }
  }
}
