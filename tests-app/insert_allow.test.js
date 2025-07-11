import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

const collection = new Mongo.Collection('test_insert_allow_collection')

if (Meteor.isServer) {
  // full client-side access
  collection.allow({
    insert (userId, doc) { return doc.allowed },
    insertAsync (userId, doc) {
      return doc.allowed
    },
    update () { return true },
    remove () { return true }
  })

  Meteor.methods({
    test_insert_allow_reset_collection: function () {
      return collection.removeAsync({})
    }
  })

  Meteor.publish('test_insert_allow_publish_collection', function () {
    return collection.find()
  })

  collection.before.insert(function (userId, doc) {
    doc.server_value = true
  })
}

if (Meteor.isClient) {
  Meteor.subscribe('test_insert_allow_publish_collection')

  describe('Insert Allow Tests', function () {
    it('should only allow insertion of documents with allowed: true and carry server and client properties', async function () {
      collection.before.insert(function (userId, doc) {
        doc.client_value = true
      })

      await Meteor.callAsync('test_insert_allow_reset_collection')

      try {
        await collection.insertAsync({ start_value: true, allowed: false })
        // If we reach here, the insertion didn't throw an error as expected
        expect(true).toBe(false) // This should not be reached
      } catch (err) {
        // Expected - insertion should fail for allowed: false
      }

      await collection.insertAsync({ start_value: true, allowed: true })

      expect(collection.find({ start_value: true, client_value: true, server_value: true }).count()).toBe(1)
    })
  })
}
