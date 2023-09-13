import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'

if (Mongo.Collection.prototype.insertAsync) {
  // Before

  Tinytest.addAsync('async - before - insertAsync', async (test, next) => {
    const collection = new Mongo.Collection(null)

    collection.before.insert((userId, doc) => {
      doc.called = true
    })

    const id = await collection.insertAsync({ test: true })

    test.isTrue((await collection.findOneAsync(id)).called)

    next()
  })

  Tinytest.addAsync('async - direct - insertAsync', async (test, next) => {
    const collection = new Mongo.Collection(null)

    collection.before.insert((userId, doc) => {
      doc.called = true
    })

    const id = await collection.direct.insertAsync({ test: true })

    test.isFalse((await collection.findOneAsync(id)).called)

    next()
  })

  Tinytest.addAsync('async - before - findOneAsync', async (test, next) => {
    const collection = new Mongo.Collection(null)

    let called = false

    collection.before.findOne(() => {
      called = true
    })

    const id = await collection.insertAsync({ test: true })

    await collection.findOneAsync(id)

    test.isTrue(called)

    next()
  })

  Tinytest.addAsync('async - before - findAsync', async (test, next) => {
    const collection = new Mongo.Collection(null)

    let called = false

    // eslint-disable-next-line array-callback-return
    collection.before.find(() => {
      called = true
    })

    const id = await collection.insertAsync({ test: true })

    await collection.find(id).fetchAsync()

    test.isTrue(called)

    next()
  })

  Tinytest.addAsync('async - before - updateAsync', async (test, next) => {
    const collection = new Mongo.Collection(null)

    collection.before.update((userId, doc, fieldNames, modifier) => {
      modifier.$set.called = true
    })

    const id = await collection.insertAsync({ test: true })

    await collection.updateAsync(id, { $set: { test: false } })

    test.isTrue((await collection.findOneAsync(id)).called)

    next()
  })

  Tinytest.addAsync('async - direct - updateAsync', async (test, next) => {
    const collection = new Mongo.Collection(null)

    collection.before.update((userId, doc, fieldNames, modifier) => {
      modifier.$set.called = true
    })

    const id = await collection.insertAsync({ test: true })

    await collection.direct.updateAsync(id, { $set: { test: false } })

    test.isFalse((await collection.findOneAsync(id)).called)

    next()
  })

  Tinytest.addAsync('async - before - removeAsync', async (test, next) => {
    const collection = new Mongo.Collection(null)

    let called = false

    collection.before.remove(() => {
      called = true
    })

    const id = await collection.insertAsync({ test: true })

    await collection.removeAsync(id)

    test.isTrue(called)

    next()
  })

  Tinytest.addAsync('async - direct - removeAsync', async (test, next) => {
    const collection = new Mongo.Collection(null)

    let called = false

    collection.before.remove(() => {
      called = true
    })

    const id = await collection.insertAsync({ test: true })

    await collection.direct.removeAsync(id)

    test.isFalse(called)

    next()
  })

  Tinytest.addAsync('async - before - upsertAsync', async (test, next) => {
    const collection = new Mongo.Collection(null)

    let called = false

    collection.before.upsert(() => {
      called = true
    })

    await collection.upsertAsync({ test: true }, { $set: { name: 'Test' } })

    test.isTrue(called)

    next()
  })

  Tinytest.addAsync('async - direct - upsertAsync', async (test, next) => {
    const collection = new Mongo.Collection(null)

    let called = false

    collection.before.upsert(() => {
      called = true
    })

    await collection.direct.upsertAsync({ test: true }, { $set: { name: 'Test' } })

    test.isFalse(called)

    next()
  })

  // After

  Tinytest.addAsync('async - after - insertAsync', async (test, next) => {
    const collection = new Mongo.Collection(null)

    let called = false

    collection.after.insert(() => {
      called = true
    })

    await collection.insertAsync({ test: true })

    test.isTrue(called)

    next()
  })

  Tinytest.addAsync('async - after - findOneAsync', async (test, next) => {
    const collection = new Mongo.Collection(null)

    let called = false

    collection.after.findOne(() => {
      called = true
    })

    const id = await collection.insertAsync({ test: true })

    await collection.findOneAsync(id)

    test.isTrue(called)

    next()
  })

  Tinytest.addAsync('async - after - findAsync', async (test, next) => {
    const collection = new Mongo.Collection(null)

    let called = false

    // eslint-disable-next-line array-callback-return
    collection.after.find(() => {
      called = true
    })

    const id = await collection.insertAsync({ test: true })

    await collection.find(id).fetchAsync()

    test.isTrue(called)

    next()
  })

  Tinytest.addAsync('async - after - updateAsync', async (test, next) => {
    const collection = new Mongo.Collection(null)

    let called = false

    collection.after.update(() => {
      called = true
    })

    const id = await collection.insertAsync({ test: true })

    await collection.updateAsync(id, { $set: { test: false } })

    test.isTrue(called)

    next()
  })

  Tinytest.addAsync('async - after - removeAsync', async (test, next) => {
    const collection = new Mongo.Collection(null)

    let called = false

    collection.after.remove(() => {
      called = true
    })

    const id = await collection.insertAsync({ test: true })

    await collection.removeAsync(id)

    test.isTrue(called)

    next()
  })
}
