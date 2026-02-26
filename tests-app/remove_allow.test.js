import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

const collection = new Mongo.Collection('test_remove_allow_collection')

if (Meteor.isServer) {
  // full client-side access
  collection.allow({
    insertAsync () { return true },
    updateAsync () { return true },
    remove (userId, doc) { return doc.allowed },
    removeAsync (userId, doc) { return doc.allowed }
  })

  Meteor.methods({
    test_remove_allow_reset_collection: function () {
      return collection.removeAsync({})
    }
  })

  Meteor.publish('test_remove_allow_publish_collection', function () {
    return collection.find()
  })
}

if (Meteor.isClient) {
  Meteor.subscribe('test_remove_allow_publish_collection')

  describe('Remove Allow Tests', function () {
    it('should only allow removal of documents with allowed: true', async function () {
      collection.before.remove(function (userId, doc) {
        // Ensuring remove gets triggered
        expect(doc.start_value).toBe(true)
      })

      await Meteor.callAsync('test_remove_allow_reset_collection')

      const id1 = await collection.insertAsync({ start_value: true, allowed: true })
      const id2 = await collection.insertAsync({ start_value: true, allowed: false })
      await collection.removeAsync({ _id: id1 })
      expect(collection.findOne({ _id: id1 })).toBe(undefined)
      try {
        // second document should be unremovable as allowed is set to false
        await collection.removeAsync({ _id: id2 })
        expect(collection.findOne({ _id: id2 })).toEqual({ _id: id2, start_value: true, allowed: false })
        // If we reach here, the removal didn't throw an error as expected
        expect(true).toBe(false) // This should not be reached
      } catch (e) {
        // just ignore the error - it is expected
      }
    })
  })
}
