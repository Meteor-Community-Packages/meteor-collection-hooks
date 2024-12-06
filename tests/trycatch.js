import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'
import { InsecureLogin } from './insecure_login'

// TODO(v2): .insert() won't work with async insert advice
Tinytest.addAsync('try-catch - should call error callback on insert hook exception async', async function (test) {
  const collection = new Mongo.Collection(null)
  const msg = 'insert hook test error'

  collection.before.insert(function (userId, doc) {
    throw new Error(msg)
  })

  await InsecureLogin.ready(async function () {
    try {
      await collection.insertAsync({ test: 1 })
      test.fail('Should not insert successfully')
    } catch (err) {
      test.equal(err && err.message, msg)
    }
  })
})

Tinytest.addAsync('try-catch - should call error callback on update hook exception', async function (test) {
  const collection = new Mongo.Collection(null)
  const msg = 'update hook test error'

  collection.before.update(function (userId, doc) {
    throw new Error(msg)
  })

  await InsecureLogin.ready(async function () {
    const id = await collection.insertAsync({ test: 1 })

    try {
      await collection.updateAsync(id, { test: 2 })
      test.fail('Update must throw an error')
    } catch (e) {
      test.equal(e.message, msg, 'Should throw correct error message')
    }
    // Callback only works on client
    if (Meteor.isClient) {
      await collection.updateAsync(id, { test: 3 }, {}, function (err) {
        test.equal(err && err.message, msg)
      })
    }
  })
})

Tinytest.addAsync('try-catch - should call error callback on remove hook exception', async function (test) {
  const collection = new Mongo.Collection(null)
  const msg = 'remove hook test error'

  collection.before.remove(function (userId, doc) {
    throw new Error(msg)
  })

  await InsecureLogin.ready(async function () {
    const id = await collection.insert({ test: 1 })
    try {
      await collection.removeAsync(id)
      test.fail('Delete must throw an error')
    } catch (e) {
      test.equal(e.message, msg, 'Should throw correct error message')
    }

    // Callback only works on client
    if (Meteor.isClient) {
      await collection.removeAsync(id, function (err) {
        test.equal(err && err.message, msg)
      })
    }
  })
})
