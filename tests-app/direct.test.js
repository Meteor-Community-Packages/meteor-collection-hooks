import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

describe('direct - hooks should not be fired when using .direct', function () {
  [null, 'direct_collection_test'].forEach(function (ctype) {
    it(`collection type ${ctype}`, function () {
      const collection = new Mongo.Collection(ctype, { connection: null })
      let hookCount = 0

      // Full permissions on collection
      collection.allow({
        insert: function () { return true },
        update: function () { return true },
        remove: function () { return true }
      })

      collection.before.insert(function (userId, doc) {
        if (doc && doc.test) {
          hookCount++
        }
      })

      collection.after.insert(function (userId, doc) {
        if (doc && doc.test) {
          hookCount++
        }
      })

      collection.before.update(function (userId, doc, fieldNames, modifier, options) {
        if (options && options.test) {
          hookCount++
        }
      })

      collection.after.update(function (userId, doc, fieldNames, modifier, options) {
        if (options && options.test) {
          hookCount++
        }
      })

      collection.before.remove(function (userId, doc) {
        if (doc && doc._id === 'test') {
          hookCount++
        }
      })

      collection.after.remove(function (userId, doc) {
        if (doc && doc._id === 'test') {
          hookCount++
        }
      })

      collection.before.find(function (userId, selector, options) {
        if (options && options.test) {
          hookCount++
        }
        return true
      })

      collection.after.find(function (userId, selector, options, result) {
        if (options && options.test) {
          hookCount++
        }
        return true
      })

      collection.before.findOne(function (userId, selector, options) {
        if (options && options.test) {
          hookCount++
        }
      })

      collection.after.findOne(function (userId, selector, options, result) {
        if (options && options.test) {
          hookCount++
        }
      })

      // STEP 1: Record how many hooks fire with normal operations
      const initialHookCount = hookCount
      
      collection.insert({ _id: 'test', test: 1 })
      collection.update({ _id: 'test' }, { $set: { test: 1 } }, { test: 1 })
      collection.find({}, { test: 1 })
      collection.findOne({}, { test: 1 })
      collection.remove({ _id: 'test' })

      const normalOperationsHookCount = hookCount
      
      // STEP 2: Verify hooks were called for normal operations
      expect(normalOperationsHookCount).toBeGreaterThan(initialHookCount)

      // STEP 3: Verify .direct operations don't trigger additional hooks
      collection.direct.insert({ _id: 'test', test: 1 })
      collection.direct.update({ _id: 'test' }, { $set: { test: 1 } }, { test: 1 })

      const cursor = collection.direct.find({}, { test: 1 })
      const count = cursor.count()
      expect(count).toBe(1)

      const doc = collection.direct.findOne({}, { test: 1 })
      expect(doc.test).toBe(1)

      collection.direct.remove({ _id: 'test' })

      // STEP 4: Hook count should be unchanged after .direct operations
      expect(hookCount).toBe(normalOperationsHookCount)
    })
  })
})

describe('direct - update and remove should allow removing by _id string', function () {
  function createTest (cname, conntype) {
    it(`${cname}, ${JSON.stringify(conntype)}`, async function () {
      if (Mongo.getCollection(cname)) return

      const collection = new Mongo.Collection(cname, conntype)
      // Full permissions on collection
      collection.allow({
        insert: function () {
          return true
        },
        update: function () {
          return true
        },
        remove: function () {
          return true
        },
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

      async function hasCountAndTestValue (count, value) {
        const cursor = await collection.direct.find({
          _id: 'testid',
          test: value
        })
        expect(await cursor.countAsync()).toBe(count)
      }

      await collection.direct.removeAsync({ _id: 'testid' })
      await collection.direct.insertAsync({ _id: 'testid', test: 1 })

      await hasCountAndTestValue(1, 1)
      await collection.direct.updateAsync('testid', { $set: { test: 2 } })
      await hasCountAndTestValue(1, 2)
      await collection.direct.removeAsync('testid')
      await hasCountAndTestValue(0, 2)
    })
  }

  // NOTE: failing on client without resolverType: 'stub'
  // See: https://github.com/meteor/meteor/issues/13036
  createTest('direct_collection_test_stringid0', {
    resolverType: 'stub'
  })

  // The rest are working
  createTest(null, {})
  createTest('direct_collection_test_stringid1', { connection: null })
  createTest(null, { connection: null })
})

if (Meteor.isServer) {
  describe('direct - Meteor.users', function () {
    it('Meteor.users.direct.insert should return _id, not an object', async function () {
      await Meteor.users.removeAsync('directinserttestid')

      const result = await Meteor.users.direct.insertAsync({
        _id: 'directinserttestid',
        test: 1
      })
      expect(Object(result) === result).toBe(false)
    })
  })
}
