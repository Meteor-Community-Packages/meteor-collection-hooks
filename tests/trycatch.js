import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'
import { InsecureLogin } from './insecure_login'

Tinytest.addAsync('try-catch - should call error callback on insert hook exception', function (test, next) {
  const collection = new Mongo.Collection(null)
  const msg = 'insert hook test error'

  collection.before.insert(function (userId, doc) {
    throw new Error(msg)
  })

  InsecureLogin.ready(function () {
    test.throws(function () {
      collection.insert({ test: 1 })
    }, msg)

    collection.insert({ test: 1 }, function (err, id) {
      test.equal(err && err.message, msg)
      next()
    })
  })
})

Tinytest.addAsync('try-catch - should call error callback on update hook exception', function (test, next) {
  const collection = new Mongo.Collection(null)
  const msg = 'update hook test error'

  collection.before.update(function (userId, doc) {
    throw new Error(msg)
  })

  InsecureLogin.ready(function () {
    collection.insert({ test: 1 }, function (nil, id) {
      test.throws(function () {
        collection.update(id, { test: 2 })
      }, msg)

      collection.update(id, { test: 3 }, function (err) {
        test.equal(err && err.message, msg)
        next()
      })
    })
  })
})

Tinytest.addAsync('try-catch - should call error callback on remove hook exception', function (test, next) {
  const collection = new Mongo.Collection(null)
  const msg = 'remove hook test error'

  collection.before.remove(function (userId, doc) {
    throw new Error(msg)
  })

  InsecureLogin.ready(function () {
    collection.insert({ test: 1 }, function (nil, id) {
      test.throws(function () {
        collection.remove(id)
      }, msg)

      collection.remove(id, function (err) {
        test.equal(err && err.message, msg)
        next()
      })
    })
  })
})
