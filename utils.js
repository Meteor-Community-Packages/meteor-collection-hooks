import { Meteor } from 'meteor/meteor'

const METEOR_VERSION = Meteor.release.split('@')[1]

export const IS_NO_FIBER_METEOR = METEOR_VERSION[0] > '2'
