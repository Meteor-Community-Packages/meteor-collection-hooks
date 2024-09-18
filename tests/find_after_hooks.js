import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'

Tinytest.addAsync('issue #296 - after update hook always finds all updated', async function (test, next) {
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

  test.equal(beforeCalled, true)
  test.equal(afterCalled, true)
})

Tinytest.addAsync('issue #296 - after insert hook always finds all inserted', async function (test, next) {
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

  test.equal(beforeCalled, true)
  test.equal(afterCalled, true)
})

Tinytest.addAsync('async find hook - after insert hook always finds all inserted', async function (test, next) {
  const collection = new Mongo.Collection(null)

  collection.before.find(async (userId, selector) => {
    await new Promise(resolve => setTimeout(resolve, 10)) // Simulate async operation
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

  // Wait for a short time to ensure async find hook has completed
  await new Promise(resolve => setTimeout(resolve, 20))

  test.equal(beforeCalled, true)
  test.equal(afterCalled, true)

  // Verify that the find hook is working
  const result = await collection.findOneAsync({})
  test.isUndefined(result, 'Document should not be found due to async find hook')

  next()
})
