import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'
import { InsecureLogin } from './insecure_login'

Tinytest.addAsync('try-catch - should call error callback on insert hook exception async', function (test, next) {
  const collection = new Mongo.Collection(null)
  const msg = 'insert hook test error'

  collection.before.insert(function (userId, doc) {
    throw new Error(msg)
  })

  InsecureLogin.ready(async function () {
    test.throws(function () {
      // TODO(v3): maybe a weird API that would throw outside of promise
      collection.insertAsync({ test: 1 })
    }, msg)
    next()
  })
})

if (Meteor.isClient) {
  Tinytest.addAsync('try-catch - should call error callback on insert hook exception sync (client)', function (test, next) {
    const collection = new Mongo.Collection(null)
    const msg = 'insert hook test error'

    collection.before.insert(function (userId, doc) {
      throw new Error(msg)
    })

    InsecureLogin.ready(async function () {
      test.throws(function () {
        collection.insert({ test: 1 })
      }, msg)
      next()
    })
  })
}

Tinytest.addAsync('try-catch - should call error callback on update hook exception async', async function (test) {
  const collection = new Mongo.Collection(null)
  const msg = 'update hook test error'

  collection.before.update(function (userId, doc) {
    throw new Error(msg)
  })

  await InsecureLogin.ready(async function () {
    const id = await collection.insertAsync({ test: 1 })

    await collection.updateAsync(id, { test: 2 }).catch((err) => {
      test.equal(err && err.message, msg)
    })

    console.log('done')
  })
})

// TODO(v3): not working, changed update advice to async function
// if (Meteor.isClient) {
//   Tinytest.onlyAsync('try-catch - should call error callback on update hook exception sync (client)', function (test, next) {
//     const collection = new Mongo.Collection(null)
//     const msg = 'update hook test error'

//     collection.before.update(function (userId, doc) {
//       throw new Error(msg)
//     })

//     InsecureLogin.ready(function () {
//       collection.insert({ test: 1 }, function (nil, id) {
//         console.log('inserted', id)
//         test.throws(function () {
//           const res = collection.update(id, { test: 2 })
//           console.log('res', res)
//         }, msg)

//         collection.update(id, { test: 3 }, function (err) {
//           test.equal(err && err.message, msg)
//           next()
//         })
//       })
//     })
//   })
// }

Tinytest.addAsync('try-catch - should call error callback on remove hook exception async', function (test, next) {
  const collection = new Mongo.Collection(null)
  const msg = 'remove hook test error'

  collection.before.remove(function (userId, doc) {
    throw new Error(msg)
  })

  InsecureLogin.ready(async function () {
    await collection.insertAsync({ test: 1 })

    await collection.removeAsync({ test: 1 }).catch((err) => {
      test.equal(err && err.message, msg)
    })

    next()
  })
})

// TODO(v3): remove advice is async
// if (Meteor.isClient) {
//   Tinytest.onlyAsync('try-catch - should call error callback on remove hook exception sync (client)', function (test, next) {
//     const collection = new Mongo.Collection(null)
//     const msg = 'remove hook test error'

//     collection.before.remove(function (userId, doc) {
//       throw new Error(msg)
//     })

//     InsecureLogin.ready(function () {
//       collection.insert({ test: 1 }, function (nil, id) {
//         test.throws(function () {
//           collection.remove(id)
//         }, msg)

//         collection.remove(id, function (err) {
//           test.equal(err && err.message, msg)
//           next()
//         })
//       })
//     })
//   })
// }
