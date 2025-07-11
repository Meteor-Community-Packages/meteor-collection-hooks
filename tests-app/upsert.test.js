import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

describe('Upsert Hooks', function () {
  it('should fire all hooks the appropriate number of times', async function () {
    const collection = new Mongo.Collection(null)
    const counts = {
      before: {
        insert: 0,
        update: 0,
        remove: 0,
        upsert: 0
      },
      after: {
        insert: 0,
        update: 0,
        remove: 0
      }
    }

    collection.before.insert(function () { counts.before.insert++ })
    collection.before.update(function () { counts.before.update++ })
    collection.before.remove(function () { counts.before.remove++ })
    collection.before.upsert(function () { counts.before.upsert++ })

    collection.after.insert(function () { counts.after.insert++ })
    collection.after.update(function () { counts.after.update++ })
    collection.after.remove(function () { counts.after.remove++ })

    await collection.removeAsync({ test: true })
    const obj = await collection.upsertAsync({ test: true }, { test: true, step: 'insert' })

    await collection.upsertAsync(obj.insertedId, { test: true, step: 'update' })
    expect(counts.before.insert).toBe(0)
    expect(counts.before.update).toBe(0)
    expect(counts.before.remove).toBe(0)
    expect(counts.before.upsert).toBe(2)
    expect(counts.after.insert).toBe(1)
    expect(counts.after.update).toBe(1)
    expect(counts.after.remove).toBe(0)
  })

  it('should allow before.upsert to stop execution', async function () {
    const collection = new Mongo.Collection(null)

    collection.before.upsert(async () => false)

    await collection.removeAsync({ test: true })
    await collection.upsertAsync({ test: true }, { $set: { test: true } })

    expect(await collection.findOneAsync({ test: true })).toBe(undefined)
  })

  it('should have correct prev-doc in after.update hook', async function () {
    const collection = new Mongo.Collection(null)

    collection.after.update(function (userId, doc) {
      expect(this.previous).not.toBe(undefined)
      expect(this.previous.step).toBe('inserted')
      expect(doc.step).toBe('updated')
    })

    await collection.removeAsync({ test: true })
    await collection.insertAsync({ test: true, step: 'inserted' })
    await collection.upsertAsync({ test: true }, { $set: { test: true, step: 'updated' } })
  })

  it('should have the list of manipulated fields in after.update hook', async function () {
    const collection = new Mongo.Collection(null)

    collection.after.update(function (userId, doc, fields) {
      expect(fields).toEqual(['step'])
    })

    await collection.removeAsync({ test: true })
    await collection.insertAsync({ test: true, step: 'inserted' })
    await collection.upsertAsync({ test: true }, { $set: { step: 'updated' } })
  })

  it('should have correct doc in after.insert hook when using $set (issue #156)', async function () {
    const collection = new Mongo.Collection(null)

    collection.after.insert(function (userId, doc) {
      expect(doc).not.toBe(undefined)
      expect(doc._id).not.toBe(undefined)
      expect(doc.test).not.toBe(undefined)
      expect(doc.step).toBe('insert-async')
    })

    await collection.removeAsync({ test: true })
    await collection.upsertAsync({ test: true }, { $set: { test: true, step: 'insert-async' } })
  })
})

if (Meteor.isServer) {
  describe('Upsert Hooks - Server Only', function () {
    it('should fire all hooks the appropriate number of times in synchronous environment', async function () {
      const collection = new Mongo.Collection(null)
      const counts = {
        before: {
          insert: 0,
          update: 0,
          remove: 0,
          upsert: 0
        },
        after: {
          insert: 0,
          update: 0,
          remove: 0
        }
      }

      collection.before.insert(function () { counts.before.insert++ })
      collection.before.update(function () { counts.before.update++ })
      collection.before.remove(function () { counts.before.remove++ })
      collection.before.upsert(function () { counts.before.upsert++ })

      collection.after.insert(function () { counts.after.insert++ })
      collection.after.update(function () { counts.after.update++ })
      collection.after.remove(function () { counts.after.remove++ })

      await collection.removeAsync({ test: true })
      const obj = await collection.upsertAsync({ test: true }, { test: true, step: 'insert' })
      await collection.upsertAsync(obj.insertedId, { test: true, step: 'update' })

      expect(counts.before.insert).toBe(0)
      expect(counts.before.update).toBe(0)
      expect(counts.before.remove).toBe(0)
      expect(counts.before.upsert).toBe(2)
      expect(counts.after.insert).toBe(1)
      expect(counts.after.update).toBe(1)
      expect(counts.after.remove).toBe(0)
    })
  })
}

if (Meteor.isClient) {
  describe('Upsert Hooks - Client Only', function () {
    it('should not call hooks for sync methods', function () {
      const collectionForSync = new Mongo.Collection(null)
      let beforeCalled = false
      collectionForSync.before.upsert(function (userId, selector, options) {
        beforeCalled = true
      })

      const result = collectionForSync.upsert({ test: 1 }, {
        $set: { name: 'abc' }
      })

      expect(result.numberAffected).toBe(1)
      expect(beforeCalled).toBe(false)
    })
  })
}
