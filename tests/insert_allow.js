import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'
import { InsecureLogin } from './insecure_login'

const collection = new Mongo.Collection('test_insert_allow_collection')

if (Meteor.isServer) {
  // full client-side access
  collection.allow({
    insert (userId, doc) { return doc.allowed },
    update () { return true },
    remove () { return true }
  })

  Meteor.methods({
    test_insert_allow_reset_collection: function () {
      collection.remove({})
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

  Tinytest.addAsync('insert - only one of two collection documents should be allowed to be inserted, and should carry the extra server and client properties', function (test, next) {
    collection.before.insert(function (userId, doc) {
      doc.client_value = true
    })

    InsecureLogin.ready(function () {
      Meteor.call('test_insert_allow_reset_collection', function (nil, result) {
        collection.insert({ start_value: true, allowed: false }, function (err1, id1) {
          collection.insert({ start_value: true, allowed: true }, function (err2, id2) {
            test.equal(collection.find({ start_value: true, client_value: true, server_value: true }).count(), 1)
            next()
          })
        })
      })
    })
  })
}
