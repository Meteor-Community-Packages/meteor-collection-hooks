import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

describe('Insert Local Collection Tests', function () {
  let originalUserId
  let originalUser

  before(() => {
    originalUserId = Meteor.userId
    originalUser = Meteor.user

    // Mock a test user
    Meteor.userId = () => 'insert-local-user-id'
    Meteor.user = () => ({ _id: 'insert-local-user-id', username: 'test-user' })
  })

  after(() => {
    Meteor.userId = originalUserId
    Meteor.user = originalUser
  })

  it('should fire before and after hooks with correct userId for normal collection in local-only contexts', async function () {
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

    expect(beforeUserId).toBe('insert-local-user-id')
    expect(afterUserId).toBe('insert-local-user-id')
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

    expect(beforeUserId).toBe('insert-local-user-id')
    expect(afterUserId).toBe('insert-local-user-id')
  })

  it('local collection document should have extra property added before being inserted', async function () {
    const collection = new Mongo.Collection(null)
    const tmp = {}
  
    collection.before.insert(function (userId, doc) {
      tmp.typeof_userId = typeof userId
      doc.before_insert_value = true
    })
  
    await collection.insertAsync({ start_value: true })
  
    if (Meteor.isServer) {
      expect(tmp.typeof_userId).toBe('undefined', 'Local collection on server should NOT know about a userId')
    } else {
      expect(tmp.typeof_userId).toBe('string', 'There should be a userId on the client')
    }
    expect(await collection.find({ start_value: true, before_insert_value: true }).countAsync()).toBe(1)
  })

  it('local collection should fire after-insert hook', async function () {
    const collection = new Mongo.Collection(null)
  
    collection.after.insert(function (userId, doc) {
      if (Meteor.isServer) {
        expect(typeof userId).toBe('undefined', 'Local collection on server should NOT know about a userId')
      } else {
        expect(typeof userId).toBe('string', 'There should be a userId on the client')
      }
  
      expect(doc.start_value).not.toBe(undefined, 'doc should have start_value')
      expect(this._id).not.toBe(undefined, 'should provide inserted _id on this')
    })
  
    await collection.insertAsync({ start_value: true })
  })
})