import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'
import { InsecureLogin } from './insecure_login'

Tinytest.addAsync('remove - local collection document should affect external variable before being removed', async function (test) {
  const collection = new Mongo.Collection(null)

  async function start (id) {
    let external = 0

    collection.before.remove(function (userId, doc) {
      // There should be a userId if we're running on the client.
      // Since this is a local collection, the server should NOT know
      // about any userId
      if (Meteor.isServer) {
        test.equal(userId, undefined)
      } else {
        test.notEqual(userId, undefined)
      }
      test.equal(doc.start_value, true)
      external = 1
    })

    await collection.removeAsync({ _id: id })

    test.equal(collection.find({ start_value: true }).count(), 0)
    test.equal(external, 1)
  }

  await InsecureLogin.ready(async function () {
    const id = await collection.insertAsync({ start_value: true })
    await start(id)
  })
})

Tinytest.addAsync('remove - local collection should fire after-remove hook and affect external variable', async function (test) {
  const collection = new Mongo.Collection(null)
  let external = 0

  let c = 0
  const n = function () {
    if (++c === 2) {
      test.equal(external, 1)
      // next()
    }
  }

  async function start (id) {
    collection.after.remove(function (userId, doc) {
      // There should be a userId if we're running on the client.
      // Since this is a local collection, the server should NOT know
      // about any userId
      if (Meteor.isServer) {
        test.equal(userId, undefined)
      } else {
        test.notEqual(userId, undefined)
      }

      // The doc should contain a copy of the original doc
      test.equal(doc._id, id)
      external = 1

      n()
    })

    await collection.removeAsync({ _id: id })
    n()
    test.equal(await collection.find({ start_value: true }).countAsync(), 0)
  }

  await InsecureLogin.ready(async function () {
    const id = await collection.insertAsync({ start_value: true })
    await start(id)
  })
})
