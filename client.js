import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { CollectionHooks} from './collection-hooks.js'

CollectionHooks.getUserId = function getUserId () {
  let userId

  Tracker.nonreactive(() => {
     userId = Meteor.userId && Meteor.userId()
  })
  
  if (userId == null) {
    userId = CollectionHooks.defaultUserId
  }

  return userId
}

import './advices';

export {
  CollectionHooks
};