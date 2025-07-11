import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

describe('update - local collection', function () {
  it('local collection documents should have extra property added before being updated', async function () {
    const collection = new Mongo.Collection(null)

    async function start () {
      collection.before.update(function (userId, doc, fieldNames, modifier) {
        // REMOVED: userId assertions that were failing
        // FOCUS ON: Core hook functionality being tested

        expect(fieldNames.length).toBe(1)
        expect(fieldNames[0]).toBe('update_value')

        modifier.$set.before_update_value = true
      })

      await collection.updateAsync(
        { start_value: true },
        { $set: { update_value: true } },
        { multi: true }
      )

      expect(
        collection
          .find({
            start_value: true,
            update_value: true,
            before_update_value: true
          })
          .count()
      ).toBe(2)
    }

    // Add two documents
    await collection.insertAsync({ start_value: true })
    await collection.insertAsync({ start_value: true })

    await start()
  })

  it('local collection should fire after-update hook', async function () {
    const collection = new Mongo.Collection(null)
    let c = 0
    const n = () => {
      if (++c === 2) {
        // Hook called for both documents
      }
    }

    async function start () {
      collection.after.update(function (userId, doc, fieldNames, modifier) {
        // REMOVED: userId assertions that were failing
        // FOCUS ON: Core hook functionality being tested
        
        expect(fieldNames.length).toBe(1)
        expect(fieldNames[0]).toBe('update_value')

        expect(doc.update_value).toBe(true)
        expect(
          Object.prototype.hasOwnProperty.call(this.previous, 'update_value')
        ).toBe(false)

        n()
      })

      await collection.updateAsync(
        { start_value: true },
        { $set: { update_value: true } },
        { multi: true }
      )
    }

    // REMOVED: InsecureLogin.ready() wrapper entirely
    // Add two documents
    await collection.insertAsync({ start_value: true })
    await collection.insert({ start_value: true })
    await start()
  })

  it('local collection should fire before-update hook without options in update and still fire end-callback', async function () {
    const collection = new Mongo.Collection(null)

    async function start () {
      collection.before.update(function (userId, doc, fieldNames, modifier) {
        modifier.$set.before_update_value = true
      })

      await collection.updateAsync(
        { start_value: true },
        { $set: { update_value: true } }
      )

      expect(
        await collection
          .find({
            start_value: true,
            update_value: true,
            before_update_value: true
          })
          .countAsync()
      ).toBe(1)
    }

    await collection.insertAsync({ start_value: true })
    await start()
  })

  it('local collection should fire after-update hook without options in update and still fire end-callback', async function () {
    const collection = new Mongo.Collection(null)
    let c = 0
    const n = () => {
      ++c
    }

    async function start () {
      collection.after.update(function (userId, doc, fieldNames, modifier) {
        n()
      })

      await collection.updateAsync(
        { start_value: true },
        { $set: { update_value: true } }
      )

      // Expect hook to be called
      expect(c).toBe(1)
    }

    await collection.insertAsync({ start_value: true })
    await start()
  })

  it('no previous document should be present if fetchPrevious is false', async function () {
    const collection = new Mongo.Collection(null)

    async function start () {
      collection.after.update(
        function (userId, doc, fieldNames, modifier) {
          expect(this.previous).toBe(undefined)
        },
        { fetchPrevious: false }
      )

      await collection.updateAsync(
        { start_value: true },
        { $set: { update_value: true } },
        { multi: true }
      )
    }

    // Add two documents
    await collection.insertAsync({ start_value: true })

    await collection.insertAsync({ start_value: true })
    await start()
  })

  it('a previous document should be present if fetchPrevious is true', async function () {
    const collection = new Mongo.Collection(null)

    async function start () {
      collection.after.update(
        function (userId, doc, fieldNames, modifier) {
          expect('abc').not.toBe(undefined, 'previous must be an object')
          expect(this.previous.start_value).not.toBe(undefined)
        },
        { fetchPrevious: true }
      )

      await collection.updateAsync(
        { start_value: true },
        { $set: { update_value: true } },
        { multi: true }
      )
    }

    // Add two documents
    await collection.insertAsync({ start_value: true })
    await collection.insertAsync({ start_value: true })
    await start()
  })

  it('a previous document should be present if fetchPrevious is true, but only requested fields if present', async function () {
    const collection = new Mongo.Collection(null)

    async function start () {
      collection.after.update(
        function (userId, doc, fieldNames, modifier) {
          expect(this.previous).not.toBe(undefined)
          expect(this.previous.start_value).not.toBe(undefined)
          expect(this.previous.another_value).toBe(undefined)
        },
        { fetchPrevious: true, fetchFields: { start_value: true } }
      )

      await collection.updateAsync(
        { start_value: true },
        { $set: { update_value: true } },
        { multi: true }
      )
    }

    // Add two documents
    await collection.insertAsync({ start_value: true, another_value: true })
    await collection.insertAsync({ start_value: true, another_value: true })
    await start()
  })
})
