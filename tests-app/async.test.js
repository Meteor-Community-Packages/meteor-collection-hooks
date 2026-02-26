import { Mongo } from 'meteor/mongo'
import expect from 'expect'

if (Mongo.Collection.prototype.insertAsync) {
  describe('Async Collection Hooks', function () {
    describe('before hooks', function () {
      it('should call before.insert hook for insertAsync', async function () {
        const collection = new Mongo.Collection(null)

        collection.before.insert((userId, doc) => {
          doc.called = true
        })

        const id = await collection.insertAsync({ test: true })

        expect((await collection.findOneAsync(id)).called).toBe(true)
      })

      it('should not call before.insert hook for direct.insertAsync', async function () {
        const collection = new Mongo.Collection(null)

        collection.before.insert((userId, doc) => {
          doc.called = true
        })

        const id = await collection.direct.insertAsync({ test: true })

        expect((await collection.findOneAsync(id)).called).toBe(undefined)
      })

      it('should call before.findOne hook for findOneAsync', async function () {
        const collection = new Mongo.Collection(null)

        let called = false

        collection.before.findOne(() => {
          called = true
        })

        const id = await collection.insertAsync({ test: true })

        await collection.findOneAsync(id)

        expect(called).toBe(true)
      })

      // NOTE: v3 does not support async find hooks
      // it('should call before.find hook for findAsync', async function () {
      //   const collection = new Mongo.Collection(null)

      //   let called = false

      //   collection.before.find(() => {
      //     called = true
      //   })

      //   const id = await collection.insertAsync({ test: true })

      //   await collection.find(id).fetchAsync()

      //   expect(called).toBe(true)
      // })

      it('should call before.update hook for updateAsync', async function () {
        const collection = new Mongo.Collection(null)

        collection.before.update((userId, doc, fieldNames, modifier) => {
          modifier.$set.called = true
        })

        const id = await collection.insertAsync({ test: true })

        await collection.updateAsync(id, { $set: { test: false } })

        expect((await collection.findOneAsync(id)).called).toBe(true)
      })

      it('should not call before.update hook for direct.updateAsync', async function () {
        const collection = new Mongo.Collection(null)

        collection.before.update((userId, doc, fieldNames, modifier) => {
          modifier.$set.called = true
        })

        const id = await collection.insertAsync({ test: true })

        await collection.direct.updateAsync(id, { $set: { test: false } })

        expect((await collection.findOneAsync(id)).called).toBe(undefined)
      })

      it('should call before.remove hook for removeAsync', async function () {
        const collection = new Mongo.Collection(null)

        let called = false

        collection.before.remove(() => {
          called = true
        })

        const id = await collection.insertAsync({ test: true })

        await collection.removeAsync(id)

        expect(called).toBe(true)
      })

      it('should not call before.remove hook for direct.removeAsync', async function () {
        const collection = new Mongo.Collection(null)

        let called = false

        collection.before.remove(() => {
          called = true
        })

        const id = await collection.insertAsync({ test: true })

        await collection.direct.removeAsync(id)

        expect(called).toBe(false)
      })

      it('should call before.upsert hook for upsertAsync', async function () {
        const collection = new Mongo.Collection(null)

        let called = false

        collection.before.upsert(() => {
          called = true
        })

        await collection.upsertAsync({ test: true }, { $set: { name: 'Test' } })

        expect(called).toBe(true)
      })

      it('should not call before.upsert hook for direct.upsertAsync', async function () {
        const collection = new Mongo.Collection(null)

        let called = false

        collection.before.upsert(() => {
          called = true
        })

        await collection.direct.upsertAsync({ test: true }, { $set: { name: 'Test' } })

        expect(called).toBe(false)
      })
    })

    describe('after hooks', function () {
      it('should call after.insert hook for insertAsync', async function () {
        const collection = new Mongo.Collection(null)

        let called = false

        collection.after.insert(() => {
          called = true
        })

        await collection.insertAsync({ test: true })

        expect(called).toBe(true)
      })

      it('should call after.findOne hook for findOneAsync', async function () {
        const collection = new Mongo.Collection(null)

        let called = false

        collection.after.findOne(() => {
          called = true
        })

        const id = await collection.insertAsync({ test: true })

        await collection.findOneAsync(id)

        expect(called).toBe(true)
      })

      // NOTE: v3 does not support async find hooks
      // it('should call after.find hook for findAsync', async function () {
      //   const collection = new Mongo.Collection(null)

      //   let called = false

      //   collection.after.find(() => {
      //     called = true
      //   })

      //   const id = await collection.insertAsync({ test: true })

      //   await collection.find(id).fetchAsync()

      //   expect(called).toBe(true)
      // })

      it('should call after.update hook for updateAsync', async function () {
        const collection = new Mongo.Collection(null)

        let called = false

        collection.after.update(() => {
          called = true
        })

        const id = await collection.insertAsync({ test: true })

        await collection.updateAsync(id, { $set: { test: false } })

        expect(called).toBe(true)
      })

      it('should call after.remove hook for removeAsync', async function () {
        const collection = new Mongo.Collection(null)

        let called = false

        collection.after.remove(() => {
          called = true
        })

        const id = await collection.insertAsync({ test: true })

        await collection.removeAsync(id)

        expect(called).toBe(true)
      })
    })
  })
}
