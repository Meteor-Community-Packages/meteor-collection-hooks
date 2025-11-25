import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

const collection = new Mongo.Collection('test_update_allow_collection')

if (Meteor.isServer) {
  // full client-side access
  collection.allow({
    insert () { return true },
    insertAsync () { return true },
    update (userId, doc, fieldNames, modifier) { return modifier.$set.allowed },
    updateAsync (userId, doc, fieldNames, modifier) {
      return modifier.$set.allowed
    },
    remove () { return true }
  })

  Meteor.methods({
    test_update_allow_reset_collection: function () {
      return collection.removeAsync({})
    }
  })

  Meteor.publish('test_update_allow_publish_collection', function () {
    return collection.find()
  })

  collection.before.update(function (userId, doc, fieldNames, modifier) {
    modifier.$set.server_value = true
  })
}

if (Meteor.isClient) {
  Meteor.subscribe('test_update_allow_publish_collection')

  describe('update - allow rules', function () {
    it('only one of two collection documents should be allowed to be updated, and should carry the extra server and client properties', async function () {
      collection.before.update(async function (userId, doc, fieldNames, modifier) {
        modifier.$set.client_value = true
      })

      await Meteor.callAsync('test_update_allow_reset_collection')

      const id1 = await collection.insertAsync({ start_value: true })
      const id2 = await collection.insertAsync({ start_value: true })

      await collection.updateAsync({ _id: id1 }, { $set: { update_value: true, allowed: true } })
      try {
        await collection.updateAsync({ _id: id2 }, { $set: { update_value: true, allowed: false } })
        expect.fail('should not be allowed to update')
      } catch (e) {
        expect(collection.find({ start_value: true, update_value: true, client_value: true, server_value: true }).count()).toBe(1)
      }
    })
  })
}
