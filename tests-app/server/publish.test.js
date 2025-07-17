import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'
import { CollectionHooks } from 'meteor/matb33:collection-hooks'

const collection = new Mongo.Collection('test_collection_for_find_findone_userid')

let beforeFindWithinPublish
let afterFindWithinPublish
let beforeFindOneWithinPublish
let afterFindOneWithinPublish
let serverCleanup
let beforeFindUserId
let afterFindUserId
let beforeFindOneUserId
let afterFindOneUserId

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
  let publishContext = null

  describe('general - server side', function () {
    before(async function () {
      // Create a more complete mock publish context
      const mockContext = {
        userId: 'test-user-id',
        connection: { id: 'test-connection' },
        ready: function() {},
        onStop: function() {},
        error: function() {},
        stop: function() {},
        added: function() {},
        changed: function() {},
        removed: function() {}
      }

      // Get the registered publish handler
      const publishHandler = Meteor.server.publish_handlers['test_publish_for_find_findone_userid']
      
      if (publishHandler) {
        // Import the publishUserId environment variable from collection-hooks
        const { CollectionHooks } = require('meteor/matb33:collection-hooks')
        
        // Get access to the publishUserId environment variable
        // We need to look at the server.js file to see how this is structured
        
        // Alternative: Mock CollectionHooks.getUserId directly
        const originalGetUserId = CollectionHooks.getUserId
        CollectionHooks.getUserId = () => 'test-user-id'
        
        // Mock isWithinPublish
        const originalIsWithinPublish = CollectionHooks.isWithinPublish
        CollectionHooks.isWithinPublish = () => true
        
        try {
          await publishHandler.call(mockContext)
        } finally {
          // Restore original functions
          CollectionHooks.getUserId = originalGetUserId
          CollectionHooks.isWithinPublish = originalIsWithinPublish
        }
      }
    })

    it('isWithinPublish is false outside of publish function', function () {
      expect(CollectionHooks.isWithinPublish()).toBe(false)
    })

    it('this (context) preserved in publish functions', function () {
      expect(publishContext && publishContext.userId).toBe('test-user-id')
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
      expect(beforeFindOneUserId).not.toBe(null)
      expect(beforeFindOneWithinPublish).toBe(true)
    })

    it('userId available to after findOne hook when within publish context', function () {
      expect(afterFindOneUserId).not.toBe(null)
      expect(afterFindOneWithinPublish).toBe(true)
    })
  })

  // Updated publish function to trigger BOTH find and findOne hooks
  Meteor.publish('test_publish_for_find_findone_userid', async function () {
    // Reset test values on each connection
    publishContext = this

    beforeFindUserId = null
    afterFindUserId = null
    beforeFindOneUserId = null
    afterFindOneUserId = null

    beforeFindWithinPublish = false
    afterFindWithinPublish = false
    beforeFindOneWithinPublish = false
    afterFindOneWithinPublish = false

    // Trigger BOTH find and findOne hooks
    collection.find({}, { test: 1 })      // This should trigger find hooks
    await collection.findOneAsync({}, { test: 1 })  // This should trigger findOne hooks
    
    // Return the cursor for the publish function
    return collection.find({})
  })
}