import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'
import { CollectionHooks } from 'meteor/matb33:collection-hooks'

const collection = new Mongo.Collection('test_collection_for_find_findone_userid')

let beforeFindUserId
let afterFindUserId
let beforeFindOneUserId
let afterFindOneUserId
let beforeFindWithinPublish
let afterFindWithinPublish
let beforeFindOneWithinPublish
let afterFindOneWithinPublish
let serverCleanup

// Don't declare hooks in publish method, as it is problematic
// eslint-disable-next-line array-callback-return
collection.before.find(function (userId, selector, options) {
  if (options && options.test) { // ignore other calls to find (caused by insert/update)
    beforeFindUserId = userId

    if (CollectionHooks.isWithinPublish) {
      beforeFindWithinPublish = CollectionHooks.isWithinPublish()
    }
  }
})

// eslint-disable-next-line array-callback-return
collection.after.find(function (userId, selector, options, result) {
  if (options && options.test) { // ignore other calls to find (caused by insert/update)
    afterFindUserId = userId

    if (CollectionHooks.isWithinPublish) {
      afterFindWithinPublish = CollectionHooks.isWithinPublish()
    }
  }
})

collection.before.findOne(function (userId, selector, options) {
  if (options && options.test) { // ignore other calls to find (caused by insert/update)
    beforeFindOneUserId = userId

    if (CollectionHooks.isWithinPublish) {
      beforeFindOneWithinPublish = CollectionHooks.isWithinPublish()
    }
  }
})

collection.after.findOne(function (userId, selector, options, result) {
  if (options && options.test) { // ignore other calls to find (caused by insert/update)
    afterFindOneUserId = userId

    if (CollectionHooks.isWithinPublish) {
      afterFindOneWithinPublish = CollectionHooks.isWithinPublish()
    }
  }
})

if (Meteor.isServer) {
  let serverTestsAdded = false
  let publishContext = null

  serverCleanup = () => {
    beforeFindOneUserId = null
    afterFindOneUserId = null
    beforeFindOneWithinPublish = false
    afterFindOneWithinPublish = false
    publishContext = null
  }

  describe('general - server side', function () {
    it('isWithinPublish is false outside of publish function', function () {
      expect(CollectionHooks.isWithinPublish()).toBe(false)
    })

    it('this (context) preserved in publish functions', function () {
      // This test runs after the publish function has executed
      expect(publishContext && publishContext.userId).toBe(true)
    })
  })

  describe('find - server side within publish context', function () {
    it('userId available to before find hook when within publish context', function () {
      expect(beforeFindUserId).not.toBe(null)
      expect(beforeFindWithinPublish).toBe(true)
    })

    it('userId available to after find hook when within publish context', function () {
      expect(afterFindUserId).not.toBe(null)
      expect(afterFindWithinPublish).toBe(true)
    })
  })

  describe('findone - server side within publish context', function () {
    it('userId available to before findOne hook when within publish context', function () {
      serverCleanup()
      expect(beforeFindOneUserId).not.toBe(null)
      expect(beforeFindOneWithinPublish).toBe(true)
    })

    it('userId available to after findOne hook when within publish context', function () {
      serverCleanup()
      expect(afterFindOneUserId).not.toBe(null)
      expect(afterFindOneWithinPublish).toBe(true)
    })
  })

  Meteor.publish('test_publish_for_find_findone_userid', async function () {
    // Reset test values on each connection
    publishContext = null

    beforeFindUserId = null
    afterFindUserId = null
    beforeFindOneUserId = null
    afterFindOneUserId = null

    beforeFindWithinPublish = false
    afterFindWithinPublish = false
    beforeFindOneWithinPublish = false
    afterFindOneWithinPublish = false

    // Check publish context
    publishContext = this

    // Trigger hooks
    await collection.findOneAsync({}, { test: 1 })
    await collection.findOneAsync({}, { test: 1 })
  })
}

if (Meteor.isClient) {
  // Mock getUserId to return a fake userId for client-side hooks
  const originalGetUserId = CollectionHooks.getUserId
  CollectionHooks.getUserId = () => 'mock-user-id'

  const cleanup = () => {
    beforeFindUserId = null
    afterFindUserId = null
    beforeFindOneUserId = null
    afterFindOneUserId = null
  }

  describe('find - client side', function () {
    it('userId available to before find hook', function () {
      collection.find({}, { test: 1 })
      expect(beforeFindUserId).not.toBe(null)
      cleanup()
    })

    it('userId available to after find hook', function () {
      collection.find({}, { test: 1 })
      expect(afterFindUserId).not.toBe(null)
      cleanup()
    })
  })

  describe('findone - client side', function () {
    it('userId available to before findOne hook', function () {
      collection.findOne({}, { test: 1 })
      expect(beforeFindOneUserId).not.toBe(null)
      cleanup()
    })

    it('userId available to after findOne hook', function () {
      collection.findOne({}, { test: 1 })
      expect(afterFindOneUserId).not.toBe(null)
      cleanup()
    })
  })

  // Clean up mock after client tests
  after(function () {
    CollectionHooks.getUserId = originalGetUserId
  })

  // Run server tests
  Meteor.subscribe('test_publish_for_find_findone_userid')
}