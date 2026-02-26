import { Mongo } from 'meteor/mongo'
import { IS_NO_FIBER_METEOR } from '../utils'

// Meteor v2 vs v3 compatibility

// Collection.allow() doesn't allow *Async keys, although they're required to use in Meteor 3
if (!IS_NO_FIBER_METEOR) {
  const originalAllow = Mongo.Collection.prototype.allow
  Mongo.Collection.prototype.allow = function (options) {
    for (const key in options) {
      if (key.endsWith('Async')) {
        const value = options[key]
        delete options[key]

        // If there's no regular method (i.e. insert, update, remove), add the same handler
        // as *Async counterpart has defined
        if (!options[key.slice(0, -5)]) {
          options[key.slice(0, -5)] = value
        }
      }
    }

    return originalAllow.call(this, options)
  }
}
