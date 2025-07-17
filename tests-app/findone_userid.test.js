import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

const collection = new Mongo.Collection('test_collection_for_findone_userid')

let beforeFindOneUserId
let afterFindOneUserId

collection.before.findOne(function (userId, selector, options) {
  if (options && options.test) { // ignore other calls to find (caused by insert/update)
    beforeFindOneUserId = userId
  }
})

collection.after.findOne(function (userId, selector, options, result) {
  if (options && options.test) { // ignore other calls to find (caused by insert/update)
    afterFindOneUserId = userId
  }
})

if (Meteor.isClient) {
  const cleanup = () => {
    beforeFindOneUserId = null
    afterFindOneUserId = null
  }

  describe('findOne - client side', function () {
    // Mock getUserId to return a fake userId for client-side hooks
    let originalUserId
    let originalUser

    before(() => {
      originalUserId = Meteor.userId
      originalUser = Meteor.user

      // Mock a test user
      Meteor.userId = () => 'findone-client-side-user-id'
      Meteor.user = () => ({ _id: 'findone-client-side-user-id', username: 'test-user' })
      
      // Run server tests
      Meteor.subscribe('test_publish_for_findone_userid')
    })

    it('userId available to before findOne hook', function () {
      collection.findOne({}, { test: 1 })
      console.log('beforeFindOneUserId', beforeFindOneUserId)
      expect(beforeFindOneUserId).not.toBe(null)
      cleanup()
    })

    it('userId available to after findOne hook', function () {
      collection.findOne({}, { test: 1 })
      expect(afterFindOneUserId).not.toBe(null)
      cleanup()
    })

    // Clean up mock after client tests
    after(function () {
      Meteor.userId = originalUserId
      Meteor.user = originalUser
    })
  })
}
