import { Mongo } from 'meteor/mongo'
import expect from 'expect'

describe('Remove Local Tests', function () {
  it('should properly handle before and after remove hooks for local collections', async function () {
    const collection = new Mongo.Collection(null)

    let beforeUserId = 'not set'
    let afterUserId = 'not set'
    let removedDoc = null

    collection.before.remove(function (userId, doc) {
      beforeUserId = userId
      removedDoc = doc
    })

    collection.after.remove(function (userId, doc) {
      afterUserId = userId
    })

    const id = await collection.insertAsync({ test: true, value: 'test-data' })
    await collection.removeAsync(id)

    expect(beforeUserId).toBe(undefined)
    expect(afterUserId).toBe(undefined)
    expect(removedDoc).not.toBe(null)
    expect(removedDoc.test).toBe(true)
    expect(removedDoc.value).toBe('test-data')  
})

  it('should allow before.remove to prevent removal', async function () {
    const collection = new Mongo.Collection(null)

    collection.before.remove(function (userId, doc) {
      return false // prevent removal
    })

    const id = await collection.insertAsync({ test: true })
    await collection.removeAsync(id)

    const doc = await collection.findOneAsync(id)
    expect(doc).not.toBe(undefined)
    expect(doc.test).toBe(true)
  })
})
