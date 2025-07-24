import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

if (Meteor.isClient) {
  describe('findone - client side', function () {
    const originalMeteorUserId = Meteor.userId

    before(function () {
      Meteor.userId = () => 'findone-client-side-user-id'
    })

    after(function () {
      Meteor.userId = originalMeteorUserId
    })

    it('userId available to before findOne hook', async function () {
      const collection = new Mongo.Collection('test_collection_for_findone_userid')
      let beforeFindOneUserId = null

      collection.before.findOne(function (userId, selector, options) {
        if (options && options.test) {
          beforeFindOneUserId = userId
        }
      })

      await collection.findOneAsync({}, { test: 1 })
      expect(beforeFindOneUserId).toBe('findone-client-side-user-id')
    })

    it('userId available to after findOne hook', async function () {
      const collection = new Mongo.Collection('test_collection_for_findone_userid_2')
      let afterFindOneUserId = null

      collection.after.findOne(function (userId, selector, options, doc) {
        if (options && options.test) {
          afterFindOneUserId = userId
        }
      })

      await collection.findOneAsync({}, { test: 1 })
      expect(afterFindOneUserId).toBe('findone-client-side-user-id')
    })
  })
}
