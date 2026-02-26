import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'
import { CollectionHooks } from 'meteor/matb33:collection-hooks'

describe('optional-previous', function () {
  describe('update hook should not prefetch previous, via hook option param', function () {
    it('should not prefetch previous when fetchPrevious is false', async function () {
      const collection = new Mongo.Collection(null)

      let called = false
      collection.after.update(function (userId, doc, fieldNames, modifier, options) {
        if (doc && doc._id === 'test') {
          expect(!!this.previous).toBe(false)
          called = true
        }
      }, { fetchPrevious: false })

      await collection.insertAsync({ _id: 'test', test: 1 })
      await collection.updateAsync({ _id: 'test' }, { $set: { test: 1 } })

      expect(called).toBe(true)
    })
  })

  describe('update hook should not prefetch previous, via collection option param', function () {
    it('should not prefetch previous when collection hookOptions.after.update.fetchPrevious is false', async function () {
      const collection = new Mongo.Collection(null)

      collection.hookOptions.after.update = { fetchPrevious: false }

      let called = false
      collection.after.update(function (userId, doc, fieldNames, modifier, options) {
        if (doc && doc._id === 'test') {
          expect(!!this.previous).toBe(false)
          called = true
        }
      })

      await collection.insertAsync({ _id: 'test', test: 1 })
      await collection.updateAsync({ _id: 'test' }, { $set: { test: 1 } })

      expect(called).toBe(true)
    })
  })

  if (Meteor.isServer) {
    // The following tests run only on the server due to their requirement for
    // running synchronously. Because the 'fetchPrevious' flag is set on a global
    // (and is meant to be used globally), it has side-effects with our other tests.
    // If we could run this test synchronously on the client, we would. That being
    // said, we aren't testing the difference between server and client, as the
    // functionality is the same for either, so testing only the server is
    // acceptable in this case.

    describe('update hook should not prefetch previous, via defaults param variation 1: after.update', function () {
      it('should not prefetch previous when CollectionHooks.defaults.after.update.fetchPrevious is false', function () {
        const collection = new Mongo.Collection(null)

        CollectionHooks.defaults.after.update = { fetchPrevious: false }

        collection.after.update(function (userId, doc, fieldNames, modifier, options) {
          if (options && options.test) {
            expect(!!this.previous).toBe(false)
          }
        })

        CollectionHooks.defaults.after.update = {}

        collection.insert({ _id: 'test', test: 1 })
        collection.update({ _id: 'test' }, { $set: { test: 1 } })
      })
    })

    describe('update hook should not prefetch previous, via defaults param variation 2: after.all', function () {
      it('should not prefetch previous when CollectionHooks.defaults.after.all.fetchPrevious is false', function () {
        const collection = new Mongo.Collection(null)

        CollectionHooks.defaults.after.all = { fetchPrevious: false }

        collection.after.update(function (userId, doc, fieldNames, modifier, options) {
          if (options && options.test) {
            expect(!!this.previous).toBe(false)
          }
        })

        CollectionHooks.defaults.after.all = {}

        collection.insert({ _id: 'test', test: 1 })
        collection.update({ _id: 'test' }, { $set: { test: 1 } })
      })
    })

    describe('update hook should not prefetch previous, via defaults param variation 3: all.update', function () {
      it('should not prefetch previous when CollectionHooks.defaults.all.update.fetchPrevious is false', function () {
        const collection = new Mongo.Collection(null)

        CollectionHooks.defaults.all.update = { fetchPrevious: false }

        collection.after.update(function (userId, doc, fieldNames, modifier, options) {
          if (options && options.test) {
            expect(!!this.previous).toBe(false)
          }
        })

        CollectionHooks.defaults.all.update = {}

        collection.insert({ _id: 'test', test: 1 })
        collection.update({ _id: 'test' }, { $set: { test: 1 } })
      })
    })

    describe('update hook should not prefetch previous, via defaults param variation 4: all.all', function () {
      it('should not prefetch previous when CollectionHooks.defaults.all.all.fetchPrevious is false', function () {
        const collection = new Mongo.Collection(null)

        CollectionHooks.defaults.all.all = { fetchPrevious: false }

        collection.after.update(function (userId, doc, fieldNames, modifier, options) {
          if (options && options.test) {
            expect(!!this.previous).toBe(false)
          }
        })

        CollectionHooks.defaults.all.all = {}

        collection.insert({ _id: 'test', test: 1 })
        collection.update({ _id: 'test' }, { $set: { test: 1 } })
      })
    })
  }
})
