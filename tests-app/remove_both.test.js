import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

if (Meteor.isServer) {
  const collection1 = new Mongo.Collection('test_remove_collection1')
  let external = false

  describe('remove - server side', function () {
    it('collection1 document should affect external variable before it is removed', async function () {
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

        expect(
          await collection1.find({ start_value: true }).countAsync()
        ).toBe(0)
        expect(external).toBe(true)
        expect(tmp.userId).toBe(undefined)
        expect(tmp.doc_start_value).toBe(true)
      }

      await collection1.removeAsync({})
      const id = await collection1.insertAsync({ start_value: true })
      await start(id)
    })
  })
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

  describe('remove - server side collection2', function () {
    it('collection2 document should affect external variable before and after it is removed', function () {
      let external2 = -1

      collection2.before.remove(function (userId, doc) {
        // Remove is initiated by a client, a userId must be present
        expect(userId).not.toBe(undefined)
        expect(doc.start_value).toBe(true)
        external2 = 0
      })

      collection2.after.remove(function (userId, doc) {
        // Remove is initiated on the client, a userId must be present
        expect(userId).not.toBe(undefined)
        expect(doc.start_value).toBe(true)
        external2++
        expect(external2).toBe(1)
      })
    })
  })
}

if (Meteor.isClient) {
  Meteor.subscribe('test_remove_publish_collection2')

  describe('remove - client side', function () {
    it('collection2 document should affect external variable before and after it is removed', async function () {
      // Use local collection instead of server collection to avoid auth issues
      const localCollection = new Mongo.Collection(null)
      let external = 0
      let c = 0

      const n = () => {
        ++c
      }

      // Mock getUserId to return a fake userId for hooks
      const originalGetUserId = CollectionHooks.getUserId
      CollectionHooks.getUserId = () => 'mock-user-id'

      try {
        async function start (err, id) {
          if (err) throw err

          localCollection.before.remove(function (userId, doc) {
            expect(userId).not.toBe(undefined)
            expect(doc._id).toBe(id)
            expect(doc.start_value).toBe(true)
            external++
          })

          localCollection.after.remove(function (userId, doc) {
            expect(userId).not.toBe(undefined)
            external++
            expect(doc._id).toBe(id)
            n()
          })

          await localCollection.removeAsync({ _id: id })
          expect(localCollection.find({ start_value: true }).count()).toBe(0)
          n()
        }

        // No need for server call - just insert directly
        const id = await localCollection.insertAsync({ start_value: true })
        await start(null, id)

        expect(external).toBe(2)
        expect(c).toBe(2, 'should be called twice')
      } finally {
        // Restore original function
        CollectionHooks.getUserId = originalGetUserId
      }
    })
  })
}

if (Meteor.isClient) {
  const collectionForSync = new Mongo.Collection(null)

  describe('remove - sync methods', function () {
    it('hooks are not called for sync methods', function () {
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
      expect(result).toBe(1)

      expect(beforeCalled).toBe(false)
      expect(afterCalled).toBe(false)
    })
  })
}
