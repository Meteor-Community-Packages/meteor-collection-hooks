import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

describe('FindOne Hooks', function () {
  it('should have selector as {} when called without arguments', async function () {
    const collection = new Mongo.Collection(null)

    let called = false
    collection.before.findOne(async function (userId, selector, options) {
      expect(selector).toEqual({})
      called = true
    })

    await collection.findOneAsync()
    expect(called).toBe(true)
  })

  it('should allow selector modification to have extra property', async function () {
    const collection = new Mongo.Collection(null)

    collection.before.findOne(async function (userId, selector, options) {
      if (options && options.test) {
        delete selector.bogus_value
        selector.before_findone = true
      }
    })

    await collection.insertAsync({ start_value: true, before_findone: true })
    expect(await collection.findOneAsync({ start_value: true, bogus_value: true }, { test: 1 })).not.toBe(undefined)
  })

  it('should call after.findOne hook and modify tmp variable', async function () {
    const collection = new Mongo.Collection(null)
    const tmp = {}

    collection.after.findOne(async function (userId, selector, options) {
      if (options && options.test) {
        tmp.after_findone = true
      }
    })

    await collection.insertAsync({ start_value: true })

    await collection.findOneAsync({ start_value: true }, { test: 1 })
    expect(tmp.after_findone).toBe(true)
  })
})

if (Meteor.isClient) {
  describe('FindOne Hooks - Client Only', function () {
    it('should not call hooks for sync methods', function () {
      const collection = new Mongo.Collection('collection_for_findone_sync_call')
      let beforeCalled = false
      let afterCalled = false
      collection.before.findOne(function (userId, selector, options) {
        beforeCalled = true
      })
      collection.after.findOne(function (userId, selector, options) {
        afterCalled = true
      })

      collection.findOne({ test: 1 })

      expect(beforeCalled).toBe(false)
      expect(afterCalled).toBe(false)
    })
  })
}
