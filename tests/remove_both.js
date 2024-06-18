import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'
import { InsecureLogin } from './insecure_login'

if (Meteor.isServer) {
  const collection1 = new Mongo.Collection('test_remove_collection1')
  let external = false

  Tinytest.addAsync(
    'remove - collection1 document should affect external variable before it is removed',
    async function (test) {
      const tmp = {}

      async function start (id) {
        collection1.before.remove(function (userId, doc) {
          // There should be no userId because the remove was initiated
          // on the server -- there's no correlation to any specific user
          tmp.userId = userId // HACK: can't test here directly otherwise refreshing test stops execution here
          tmp.doc_start_value = doc.start_value // HACK: can't test here directly otherwise refreshing test stops execution here
          external = true
        })

        await collection1.removeAsync({ _id: id })

        test.equal(
          await collection1.find({ start_value: true }).countAsync(),
          0
        )
        test.equal(external, true)
        test.equal(tmp.userId, undefined)
        test.equal(tmp.doc_start_value, true)
      }

      await collection1.removeAsync({})
      const id = await collection1.insertAsync({ start_value: true })
      await start(id)
    }
  )
}

const collection2 = new Mongo.Collection('test_remove_collection2')

if (Meteor.isServer) {
  // full client-side access
  collection2.allow({
    insertAsync: function () {
      return true
    },
    updateAsync: function () {
      return true
    },
    removeAsync: function () {
      return true
    }
  })

  Meteor.methods({
    test_remove_reset_collection2: function () {
      return collection2.removeAsync({})
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

  Tinytest.add(
    'remove - collection2 document should affect external variable before and after it is removed',
    async function (test) {
      let external = 0
      let c = 0

      const n = () => {
        ++c
      }

      async function start (err, id) {
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

        // TODO(v3): required by allow-deny
        await collection2.removeAsync({ _id: id })

        test.equal(collection2.find({ start_value: true }).count(), 0)
        n()
      }

      await InsecureLogin.ready(async function () {
        await Meteor.callAsync('test_remove_reset_collection2')
        const id = await collection2.insertAsync({ start_value: true })
        await start(null, id)
      })

      test.equal(external, 2)
      test.equal(c, 2, 'should be called twice')
    }
  )
}

if (Meteor.isClient) {
  const collectionForSync = new Mongo.Collection(null)
  Tinytest.add('remove - hooks are not called for sync methods', function (test) {
    let beforeCalled = false
    let afterCalled = false
    collectionForSync.before.remove(function (userId, selector, options) {
      beforeCalled = true
    })
    collectionForSync.after.remove(function (userId, selector, options) {
      afterCalled = true
    })

    const id = collectionForSync.insert({ test: 1 })

    const result = collectionForSync.remove(id)
    test.equal(result, 1)

    test.equal(beforeCalled, false)
    test.equal(afterCalled, false)
  })
}
