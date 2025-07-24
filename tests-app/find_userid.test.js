import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

const collection = new Mongo.Collection('test_collection_for_find_userid')

let beforeFindUserId
let afterFindUserId

// Don't declare hooks in publish method, as it is problematic
// eslint-disable-next-line array-callback-return
collection.before.find(function (userId, selector, options) {
  if (options && options.test) { // ignore other calls to find (caused by insert/update)
    beforeFindUserId = userId
  }
})

// eslint-disable-next-line array-callback-return
collection.after.find(function (userId, selector, options, result) {
  if (options && options.test) { // ignore other calls to find (caused by insert/update)
    afterFindUserId = userId
  }
})

if (Meteor.isClient) {
  const cleanup = () => {
    beforeFindUserId = null
    afterFindUserId = null
  }

  describe('find - client side', function () {
    // Mock getUserId to return a fake userId for client-side hooks
    let originalUserId
    let originalUser

    before(() => {
      originalUserId = Meteor.userId
      originalUser = Meteor.user

      // Mock a test user
      Meteor.userId = () => 'find-client-side-user-id'
      Meteor.user = () => ({ _id: 'find-client-side-user-id', username: 'test-user' })
    })

    it('userId available to before find hook', async function () {
      // In Meteor 3, before.find hooks fire immediately when cursor is created
      // but after.find hooks only fire on async cursor methods
      await collection.find({}, { test: 1 }).fetchAsync()
      expect(beforeFindUserId).not.toBe(null)
      cleanup()
    })

    it('userId available to after find hook', async function () {
      // In Meteor 3, after.find hooks only fire on async cursor methods like fetchAsync()
      await collection.find({}, { test: 1 }).fetchAsync()
      expect(afterFindUserId).not.toBe(null)
      cleanup()
    })

    // Clean up mock after client tests
    after(function () {
      Meteor.userId = originalUserId
      Meteor.user = originalUser
    })
  })
}
