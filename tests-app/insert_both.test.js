import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

describe('Insert Both Tests', function () {
  it('should fire before and after hooks on server and client for normal collection', async function () {
    const isServer = Meteor.isServer
    const collection = new Mongo.Collection(null)
    let beforeUserId = 'not set'
    let afterUserId = 'not set'

    collection.before.insert(function (userId, doc) {
      beforeUserId = userId
      expect(isServer).toBe(Meteor.isServer)
    })

    collection.after.insert(function (userId, doc) {
      afterUserId = userId
      expect(isServer).toBe(Meteor.isServer)
    })

    await collection.insertAsync({ test: true })
    expect(beforeUserId).toBe(undefined)
    expect(afterUserId).toBe(undefined)
  })
})
