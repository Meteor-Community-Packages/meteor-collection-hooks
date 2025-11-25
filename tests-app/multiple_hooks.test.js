import { Mongo } from 'meteor/mongo'
import expect from 'expect'

describe('Multiple Hooks', function () {
  it('should fire all update before and after hooks', async function () {
    const collection = new Mongo.Collection(null)
    const sequence = []

    collection.before.update(function (userId, doc, fieldNames, modifier, options) {
      sequence.push('before1')
    })

    collection.before.update(function (userId, doc, fieldNames, modifier, options) {
      sequence.push('before2')
    })

    collection.after.update(function (userId, doc, fieldNames, modifier, options) {
      sequence.push('after1')
    })

    collection.after.update(function (userId, doc, fieldNames, modifier, options) {
      sequence.push('after2')
    })

    const id = await collection.insertAsync({ start_value: true })
    await collection.updateAsync(id, { $set: { update_value: true } })

    expect(sequence).toEqual(['before1', 'before2', 'after1', 'after2'])
  })
})
