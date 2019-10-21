/* eslint-disable no-native-reassign, no-global-assign */

export const InsecureLogin = {
  queue: [],
  ran: false,
  ready: function (callback) {
    this.queue.push(callback)
    if (this.ran) this.unwind()
  },
  run: function () {
    this.ran = true
    this.unwind()
  },
  unwind: function () {
    this.queue.forEach(cb => cb())
    this.queue = []
  }
}
