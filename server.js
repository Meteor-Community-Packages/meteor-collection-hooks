import { Meteor } from 'meteor/meteor'
import { CollectionHooks } from './collection-hooks'

import './advices'

const publishUserId = new Meteor.EnvironmentVariable()

CollectionHooks.getUserId = function getUserId () {
  let userId

  try {
    // Will throw an error unless within method call.
    // Attempt to recover gracefully by catching:
    userId = Meteor.userId && Meteor.userId()
  } catch (e) {}

  if (userId == null) {
    // Get the userId if we are in a publish function.
    userId = publishUserId.get()
  }

  if (userId == null) {
    userId = CollectionHooks.defaultUserId
  }

  return userId
}

const _publish = Meteor.publish
Meteor.publish = function (name, handler, options) {
  return _publish.call(this, name, function (...args) {
    // This function is called repeatedly in publications
    return publishUserId.withValue(this && this.userId, () => handler.apply(this, args))
  }, options)
}

// Make the above available for packages with hooks that want to determine
// whether they are running inside a publish function or not.
CollectionHooks.isWithinPublish = () => publishUserId.get() !== undefined

export {
  CollectionHooks
}
