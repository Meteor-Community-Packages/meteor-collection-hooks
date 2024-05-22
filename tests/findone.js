import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'
import { InsecureLogin } from './insecure_login'

Tinytest.addAsync('findone - selector should be {} when called without arguments', async function (test) {
  const collection = new Mongo.Collection(null)

  let called = false
  collection.before.findOne(async function (userId, selector, options) {
    test.equal(selector, {})
    called = true
  })

  await collection.findOneAsync()
  test.equal(called, true)
})

Tinytest.addAsync('findone - selector should have extra property', async function (test) {
  const collection = new Mongo.Collection(null)

  collection.before.findOne(async function (userId, selector, options) {
    if (options && options.test) {
      delete selector.bogus_value
      selector.before_findone = true
    }
  })

  await InsecureLogin.ready(async function () {
    await collection.insertAsync({ start_value: true, before_findone: true })
    test.notEqual(await collection.findOneAsync({ start_value: true, bogus_value: true }, { test: 1 }), undefined)
  })
})

Tinytest.addAsync('findone - tmp variable should have property added after the find', async function (test) {
  const collection = new Mongo.Collection(null)
  const tmp = {}

  collection.after.findOne(async function (userId, selector, options) {
    if (options && options.test) {
      tmp.after_findone = true
    }
  })

  await InsecureLogin.ready(async function () {
    await collection.insertAsync({ start_value: true })

    await collection.findOneAsync({ start_value: true }, { test: 1 })
    test.equal(tmp.after_findone, true)
  })
})
