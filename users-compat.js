import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { CollectionHooks } from './collection-hooks'

if (Meteor.users) {
  // If Meteor.users has been instantiated, attempt to re-assign its prototype:
  CollectionHooks.reassignPrototype(Meteor.users)

  // Next, give it the hook aspects:
  CollectionHooks.extendCollectionInstance(Meteor.users, Mongo.Collection)
}
