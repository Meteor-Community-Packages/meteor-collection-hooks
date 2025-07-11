import { Mongo } from 'meteor/mongo'
import expect from 'expect'

describe('find hooks and after hooks interaction', function () {
  describe('issue #296', function () {
    it('after update hook always finds all updated', async function () {
      const collection = new Mongo.Collection(null)

      collection.before.find((userId, selector) => {
        selector.removedAt = { $exists: false }

        return true
      })

      let beforeCalled = false
      collection.before.update(() => {
        beforeCalled = true
      })

      let afterCalled = false
      collection.after.update(() => {
        afterCalled = true
      })

      const id = await collection.insertAsync({ test: true })

      await collection.updateAsync(id, { $set: { removedAt: new Date() } })

      expect(beforeCalled).toBe(true)
      expect(afterCalled).toBe(true)
    })

    it('after insert hook always finds all inserted', async function () {
      const collection = new Mongo.Collection(null)

      collection.before.find((userId, selector) => {
        selector.removedAt = { $exists: false }

        return true
      })

      let beforeCalled = false
      collection.before.insert(() => {
        beforeCalled = true
      })

      let afterCalled = false
      collection.after.insert(() => {
        afterCalled = true
      })

      await collection.insertAsync({ removedAt: new Date() })

      expect(beforeCalled).toBe(true)
      expect(afterCalled).toBe(true)
    })
  })

  describe('find hook behavior', function () {
    it('after insert hook always finds all inserted', async function () {
      const collection = new Mongo.Collection(null)

      collection.before.find((userId, selector) => {
        selector.removedAt = { $exists: false }
        return true
      })

      collection.before.findOne((userId, selector) => {
        selector.removedAt = { $exists: false }
        return true
      })

      let beforeCalled = false
      collection.before.insert(() => {
        beforeCalled = true
      })

      let afterCalled = false
      collection.after.insert(() => {
        afterCalled = true
      })

      await collection.insertAsync({ removedAt: new Date() })

      expect(beforeCalled).toBe(true, 'before insert hook should be called')
      expect(afterCalled).toBe(true, 'after insert hook should be called')

      const findResult = await collection.find({}).fetchAsync()
      expect(findResult.length).toBe(0, 'No documents should be found due to find hook')

      const findOneResult = await collection.findOneAsync({})
      expect(findOneResult).toBe(undefined, 'Document should not be found due to find hook')
    })
  })
})
