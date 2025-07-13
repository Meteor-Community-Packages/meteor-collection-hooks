import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

if (Meteor.isServer) {
  const collection1 = new Mongo.Collection('test_insert_collection1')

  describe('insert - server side', function () {
    it('collection1 document should have extra property added to it before it is inserted', async function () {
      const tmp = {}

      await collection1.removeAsync({})

      collection1.before.insert(async function (userId, doc) {
        // There should be no userId because the insert was initiated
        // on the server -- there's no correlation to any specific user
        tmp.userId = userId // HACK: can't test here directly otherwise refreshing test stops execution here
        doc.before_insert_value = true
      })

      await collection1.insertAsync({ start_value: true })

      expect(
        await collection1
          .find({ start_value: true, before_insert_value: true })
          .countAsync()
      ).toBe(1)
      expect(tmp.userId).toBe(undefined)
    })
  })
}

const collection2 = new Mongo.Collection('test_insert_collection2')

if (Meteor.isServer) {
  // full client-side access
  collection2.allow({
    insert () {
      return true
    },
    insertAsync () {
      return true
    },
    update () {
      return true
    },
    remove () {
      return true
    }
  })

  Meteor.methods({
    test_insert_reset_collection2: function () {
      return collection2.removeAsync({})
    }
  })

  Meteor.publish('test_insert_publish_collection2', function () {
    return collection2.find()
  })

  collection2.before.insert(function (userId, doc) {
    // console.log('test_insert_collection2 BEFORE INSERT', userId, doc)
    doc.server_value = true
  })
}

if (Meteor.isClient) {

  Meteor.subscribe('test_insert_publish_collection2')

  describe('insert - client side', function () {

    let originalUserId
    let originalUser
    
    before(() => {
      
      originalUserId = Meteor.userId
      originalUser = Meteor.user

      // Mock a test user
      Meteor.userId = () => 'insert-both-user-id'
      Meteor.user = () => ({ _id: 'insert-both-user-id', username: 'test-user' })
    })

    it('collection2 document on client should have client-added and server-added extra properties added to it before it is inserted', async function () {
      collection2.before.insert(function (userId, doc) {
        console.log('test_insert_collection2 BEFORE INSERT', userId, doc)
        expect(userId).toBe('insert-both-user-id') // Verify our mock is working
        expect(collection2.find({ start_value: true }).count()).toBe(0)
        doc.client_value = true
      })

      collection2.after.insert(function (userId, doc) {
        // console.log('test_insert_collection2 AFTER INSERT', userId, doc)
        expect(this._id).not.toBe(undefined)
      })

      await Meteor.callAsync('test_insert_reset_collection2')
      // console.log('test_insert_collection2 INSERT')
      await collection2.insertAsync({ start_value: true })

      expect(
        collection2
          .find({
            start_value: true,
            client_value: true,
            server_value: true
          })
          .count()
      ).toBe(1)
    })
  
    it('hooks are not called for sync methods', function () {
      const collectionForSync = new Mongo.Collection(null)
      let beforeCalled = false
      let afterCalled = false
      
      collectionForSync.before.insert(function (userId, selector, options) {
        beforeCalled = true
      })
      
      collectionForSync.after.insert(function (userId, selector, options) {
        afterCalled = true
      })

      const res = collectionForSync.insert({ test: 1 })
      expect(typeof res).toBe('string')
      expect(beforeCalled).toBe(false)
      expect(afterCalled).toBe(false)
    })
  
    after(() => {
      Meteor.userId = originalUserId
      Meteor.user = originalUser
    })
  })
}