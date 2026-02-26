import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

describe('try-catch', function () {
  // TODO(v2): .insert() won't work with async insert advice
  it('should call error callback on insert hook exception async', async function () {
    const collection = new Mongo.Collection(null)
    const msg = 'insert hook test error'

    collection.before.insert(function (userId, doc) {
      throw new Error(msg)
    })

    try {
      await collection.insertAsync({ test: 1 })
      expect.fail('Should not insert successfully')
    } catch (err) {
      expect(err && err.message).toBe(msg)
    }
  })

  it('should call error callback on update hook exception', async function () {
    const collection = new Mongo.Collection(null)
    const msg = 'update hook test error'

    collection.before.update(function (userId, doc) {
      throw new Error(msg)
    })

    const id = await collection.insertAsync({ test: 1 })

    try {
      await collection.updateAsync(id, { test: 2 })
      expect.fail('Update must throw an error')
    } catch (e) {
      expect(e.message).toBe(msg, 'Should throw correct error message')
    }
    // Callback only works on client
    if (Meteor.isClient) {
      await collection.updateAsync(id, { test: 3 }, {}, function (err) {
        expect(err && err.message).toBe(msg)
      })
    }
  })

  it('should call error callback on remove hook exception', async function () {
    const collection = new Mongo.Collection(null)
    const msg = 'remove hook test error'

    collection.before.remove(function (userId, doc) {
      throw new Error(msg)
    })

    const id = await collection.insert({ test: 1 })
    try {
      await collection.removeAsync(id)
      expect.fail('Delete must throw an error')
    } catch (e) {
      expect(e.message).toBe(msg, 'Should throw correct error message')
    }

    // Callback only works on client
    if (Meteor.isClient) {
      await collection.removeAsync(id, function (err) {
        expect(err && err.message).toBe(msg)
      })
    }
  })
})
