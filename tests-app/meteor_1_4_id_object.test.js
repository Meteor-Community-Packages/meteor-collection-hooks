import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

describe('Meteor 1.4 ID Object Tests', function () {
  it('should handle ID objects properly in hooks', async function () {
    const collection = new Mongo.Collection(null)

    const beforeIds = []
    const afterIds = []

    collection.before.remove(function (userId, doc) {
      beforeIds.push(doc._id)
    })

    collection.after.remove(function (userId, doc) {
      afterIds.push(doc._id)
    })

    const id1 = await collection.insertAsync({ test: true })
    const id2 = await collection.insertAsync({ test: true })

    // Test with single ID
    await collection.removeAsync(id1)

    // Test with multiple IDs
    await collection.removeAsync({ _id: { $in: [id2] } })

    expect(beforeIds.length).toBe(2)
    expect(afterIds.length).toBe(2)

    if (Meteor.isServer) {
      expect(beforeIds[0]).toEqual(id1)
      expect(afterIds[0]).toEqual(id1)
      expect(beforeIds[1]).toEqual(id2)
      expect(afterIds[1]).toEqual(id2)
    } else {
      // On client, might be different behavior
      expect(beforeIds[0]).toBe(id1)
      expect(afterIds[0]).toBe(id1)
      expect(beforeIds[1]).toBe(id2)
      expect(afterIds[1]).toBe(id2)
    }
  })
})
