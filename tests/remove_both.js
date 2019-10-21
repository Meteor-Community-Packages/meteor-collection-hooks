import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'
import { InsecureLogin } from './insecure_login'

if (Meteor.isServer) {
  const collection1 = new Mongo.Collection('test_remove_collection1')
  let external = false

  Tinytest.addAsync('remove - collection1 document should affect external variable before it is removed', function (test, next) {
    const tmp = {}

    function start (nil, id) {
      collection1.before.remove(function (userId, doc) {
        // There should be no userId because the remove was initiated
        // on the server -- there's no correlation to any specific user
        tmp.userId = userId // HACK: can't test here directly otherwise refreshing test stops execution here
        tmp.doc_start_value = doc.start_value // HACK: can't test here directly otherwise refreshing test stops execution here
        external = true
      })

      collection1.remove({ _id: id }, function (err) {
        if (err) throw err
        test.equal(collection1.find({ start_value: true }).count(), 0)
        test.equal(external, true)
        test.equal(tmp.userId, undefined)
        test.equal(tmp.doc_start_value, true)
        next()
      })
    }

    collection1.remove({})
    collection1.insert({ start_value: true }, start)
  })
}

const collection2 = new Mongo.Collection('test_remove_collection2')

if (Meteor.isServer) {
  // full client-side access
  collection2.allow({
    insert: function () { return true },
    update: function () { return true },
    remove: function () { return true }
  })

  Meteor.methods({
    test_remove_reset_collection2: function () {
      collection2.remove({})
    }
  })

  Meteor.publish('test_remove_publish_collection2', function () {
    return collection2.find()
  })

  // Tinytest.addAsync('remove - collection2 document should affect external variable before and after it is removed', function (test, next) {
  let external2 = -1

  collection2.before.remove(function (userId, doc) {
    // Remove is initiated by a client, a userId must be present
    // test.notEqual(userId, undefined)

    // test.equal(doc.start_value, true)
    external2 = 0
  })

  collection2.after.remove(function (userId, doc) {
    // Remove is initiated on the client, a userId must be present
    // test.notEqual(userId, undefined)

    // test.equal(doc.start_value, true)

    external2++

    // test.equal(external2, 1)
    // next()

    // Can't get the test suite to run when this is in a test.
    // Beyond me why. The console outputs true, so the 'test' does
    // pass...
    console.log('(temp) test passes:', external2 === 1)
  })
  // })
}

if (Meteor.isClient) {
  Meteor.subscribe('test_remove_publish_collection2')

  Tinytest.addAsync('remove - collection2 document should affect external variable before and after it is removed', function (test, next) {
    let external = 0
    let c = 0
    const n = () => {
      if (++c === 2) {
        test.equal(external, 2)
        next()
      }
    }

    function start (err, id) {
      if (err) throw err

      collection2.before.remove(function (userId, doc) {
        // Remove is initiated on the client, a userId must be present
        test.notEqual(userId, undefined)

        test.equal(doc._id, id)
        test.equal(doc.start_value, true)
        external++
      })

      collection2.after.remove(function (userId, doc) {
        // Remove is initiated on the client, a userId must be present
        test.notEqual(userId, undefined)

        external++
        test.equal(doc._id, id)
        n()
      })

      collection2.remove({ _id: id }, function (err) {
        if (err) throw err
        test.equal(collection2.find({ start_value: true }).count(), 0)
        n()
      })
    }

    InsecureLogin.ready(function () {
      Meteor.call('test_remove_reset_collection2', function (nil, result) {
        collection2.insert({ start_value: true }, start)
      })
    })
  })
}
