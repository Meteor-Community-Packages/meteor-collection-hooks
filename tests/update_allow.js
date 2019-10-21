import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'
import { InsecureLogin } from './insecure_login'

const collection = new Mongo.Collection('test_update_allow_collection')

if (Meteor.isServer) {
  // full client-side access
  collection.allow({
    insert () { return true },
    update (userId, doc, fieldNames, modifier) { return modifier.$set.allowed },
    remove () { return true }
  })

  Meteor.methods({
    test_update_allow_reset_collection: function () {
      collection.remove({})
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

  Tinytest.addAsync('update - only one of two collection documents should be allowed to be updated, and should carry the extra server and client properties', function (test, next) {
    collection.before.update(function (userId, doc, fieldNames, modifier) {
      modifier.$set.client_value = true
    })

    InsecureLogin.ready(function () {
      Meteor.call('test_update_allow_reset_collection', function (nil, result) {
        function start (id1, id2) {
          collection.update({ _id: id1 }, { $set: { update_value: true, allowed: true } }, function (err1) {
            collection.update({ _id: id2 }, { $set: { update_value: true, allowed: false } }, function (err2) {
              test.equal(collection.find({ start_value: true, update_value: true, client_value: true, server_value: true }).count(), 1)
              next()
            })
          })
        }

        // Insert two documents
        collection.insert({ start_value: true }, function (err1, id1) {
          collection.insert({ start_value: true }, function (err2, id2) {
            start(id1, id2)
          })
        })
      })
    })
  })
}
