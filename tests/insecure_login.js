/* eslint-disable no-native-reassign, no-global-assign */

export const InsecureLogin = {
  queue: [],
  ran: false,
  resolver: null,
  readyPromise: null,
  ready: async function (callback) {
    this.queue.push(callback)
    if (this.ran) {
      await this.unwind()
    } else {
      if (!this.readyPromise) {
        this.readyPromise = new Promise((resolve) => {
          this.resolver = resolve
        })
      }
      return this.readyPromise
    }
  },
  run: async function () {
    await this.unwind()
    this.ran = true
  },
  unwind: async function () {
    for (const cb of this.queue) {
      await cb()
    }

    if (this.resolver) {
      this.resolver()
    }
    this.readyPromise = null
    this.resolver = null
    this.queue = []
  }
}
