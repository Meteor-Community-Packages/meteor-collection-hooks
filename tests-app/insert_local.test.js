import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

describe('Insert Local Collection Tests', function () {
  it('should fire before and after hooks with correct userId for normal collection in local-only contexts', async function () {
    const originalUserId = Meteor.userId
    const originalUser = Meteor.user

    // Mock a test user
    Meteor.userId = () => 'test-user-123'
    Meteor.user = () => ({ _id: 'test-user-123', username: 'test-user' })

    const collection = new Mongo.Collection(null)
    let beforeUserId = 'not set'
    let afterUserId = 'not set'

    collection.before.insert(function (userId, doc) {
      beforeUserId = userId
    })

    collection.after.insert(function (userId, doc) {
      afterUserId = userId
    })

    await collection.insertAsync({ test: true })

    expect(beforeUserId).toBe(Meteor.userId())
    expect(afterUserId).toBe(Meteor.userId())

    Meteor.userId = originalUserId
    Meteor.user = originalUser
  })

  it('should fire before and after hooks with undefined userId for null collections', async function () {
    const collection = new Mongo.Collection(null)
    let beforeUserId = 'not set'
    let afterUserId = 'not set'

    collection.before.insert(function (userId, doc) {
      beforeUserId = userId
    })

    collection.after.insert(function (userId, doc) {
      afterUserId = userId
    })

      await collection.insertAsync({ test: true })

      expect(beforeUserId).toBe(undefined)
      expect(afterUserId).toBe(undefined)
  })
})
