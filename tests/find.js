import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'
import { InsecureLogin } from './insecure_login'

Tinytest.addAsync('find - selector should be {} when called without arguments', async function (test) {
  const collection = new Mongo.Collection(null)

  let findSelector = null
  collection.before.find(async function (userId, selector, options) {
    findSelector = selector
  })

  // hooks won't be triggered on find() alone, we must call fetchAsync()
  await collection.find().fetchAsync()

  test.equal(findSelector, {})
})

Tinytest.addAsync('find - selector should have extra property', async function (test) {
  const collection = new Mongo.Collection(null)

  collection.before.find(async function (userId, selector, options) {
    if (options && options.test) {
      delete selector.bogus_value
      selector.before_find = true
    }
  })

  await InsecureLogin.ready(async function () {
    await collection.insertAsync({ start_value: true, before_find: true })
    test.equal(await collection.find({ start_value: true, bogus_value: true }, { test: 1 }).countAsync(), 1)
  })
})

Tinytest.addAsync('find - tmp variable should have property added after the find', async function (test) {
  const collection = new Mongo.Collection(null)
  const tmp = {}

  collection.after.find(async function (userId, selector, options) {
    if (options && options.test) {
      tmp.after_find = true
    }
  })

  await InsecureLogin.ready(async function () {
    await collection.insertAsync({ start_value: true })
    await collection.find({ start_value: true }, { test: 1 }).fetchAsync()

    test.equal(tmp.after_find, true)
  })
})
