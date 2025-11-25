import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

const collection = new Mongo.Collection('test_hooks_in_loop')
const times = 30

if (Meteor.isServer) {
  let s1 = 0

  // full client-side access
  collection.allow({
    insertAsync: function () { return true },
    updateAsync: function () { return true },
    remove: function () { return true }
  })

  Meteor.methods({
    test_hooks_in_loop_reset_collection: function () {
      s1 = 0
      return collection.removeAsync({})
    }
  })

  Meteor.publish('test_hooks_in_loop_publish_collection', function () {
    return collection.find()
  })

  collection.before.update(function (userId, doc, fieldNames, modifier) {
    s1++
    modifier.$set.server_counter = s1
  })
}

if (Meteor.isClient) {
  Meteor.subscribe('test_hooks_in_loop_publish_collection')

  describe('hooks in loop', function () {
    it('issue #67 - hooks should get called when mutation method called in a tight loop', async function () {
      let c1 = 0

      collection.before.update(function (userId, doc, fieldNames, modifier) {
        c1++
        modifier.$set.client_counter = c1
      })

      await Meteor.callAsync('test_hooks_in_loop_reset_collection')

      const id = await collection.insertAsync({ times: 0, client_counter: 0, server_counter: 0 })

      for (let i = 0; i < times; i++) {
        await collection.updateAsync({ _id: id }, { $set: { times } })
      }

      expect(collection.find({ times, client_counter: times, server_counter: times }).count()).toBe(1)
    })
  })
}
