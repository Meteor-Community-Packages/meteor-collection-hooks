import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'
import { InsecureLogin } from './insecure_login'

const collection = new Mongo.Collection('test_hooks_in_loop')
const times = 30

if (Meteor.isServer) {
  let s1 = 0

  // full client-side access
  collection.allow({
    insert: function () { return true },
    update: function () { return true },
    remove: function () { return true }
  })

  Meteor.methods({
    test_hooks_in_loop_reset_collection: function () {
      s1 = 0
      collection.remove({})
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

  Tinytest.addAsync('issue #67 - hooks should get called when mutation method called in a tight loop', function (test, next) {
    let c1 = 0
    let c2 = 0

    collection.before.update(function (userId, doc, fieldNames, modifier) {
      c1++
      modifier.$set.client_counter = c1
    })

    InsecureLogin.ready(function () {
      Meteor.call('test_hooks_in_loop_reset_collection', function (nil, result) {
        function start (id) {
          for (let i = 0; i < times; i++) {
            collection.update({ _id: id }, { $set: { times: times } }, function (nil) {
              c2++
              check()
            })
          }
        }

        function check () {
          if (c2 === times) {
            test.equal(collection.find({ times: times, client_counter: times, server_counter: times }).count(), 1)
            next()
          }
        }

        collection.insert({ times: 0, client_counter: 0, server_counter: 0 }, function (nil, id) {
          start(id)
        })
      })
    })
  })
}
