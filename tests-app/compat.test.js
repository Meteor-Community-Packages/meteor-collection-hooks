import { Mongo } from 'meteor/mongo'
import expect from 'expect'

/* eslint-disable no-new */

describe('Compatibility Tests', function () {
  it('should be compatible with Mongo.Collection', async function () {
    const collection = new Mongo.Collection(null)

    let called = false
    collection.before.insert(function (userId, doc) {
      called = true
    })

    await collection.insertAsync({ test: true })

    expect(called).toBe(true)
  })
})
