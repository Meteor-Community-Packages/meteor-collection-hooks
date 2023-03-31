import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'

Tinytest.addAsync('issue #296 - after update hook always finds all updated', function (test, next) {
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

  const id = collection.insert({ test: true })

  collection.update(id, { $set: { removedAt: new Date() } }, () => {
    test.equal(beforeCalled, true)
    test.equal(afterCalled, true)
    next()
  })
})

Tinytest.addAsync('issue #296 - after insert hook always finds all inserted', function (test, next) {
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

  collection.insert({ removedAt: new Date() }, () => {
    test.equal(beforeCalled, true)
    test.equal(afterCalled, true)
    next()
  })
})
