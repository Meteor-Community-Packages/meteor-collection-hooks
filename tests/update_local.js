import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'
import { InsecureLogin } from './insecure_login'

Tinytest.addAsync('update - local collection documents should have extra property added before being updated', function (test, next) {
  var collection = new Mongo.Collection(null)

  function start () {
    collection.before.update(function (userId, doc, fieldNames, modifier) {
      // There should be a userId if we're running on the client.
      // Since this is a local collection, the server should NOT know
      // about any userId
      if (Meteor.isServer) {
        test.equal(userId, undefined)
      } else {
        test.notEqual(userId, undefined)
      }

      test.equal(fieldNames.length, 1)
      test.equal(fieldNames[0], 'update_value')

      modifier.$set.before_update_value = true
    })

    collection.update({ start_value: true }, { $set: { update_value: true } }, { multi: true }, function (err) {
      if (err) throw err
      test.equal(collection.find({ start_value: true, update_value: true, before_update_value: true }).count(), 2)
      next()
    })
  }

  InsecureLogin.ready(function () {
    // Add two documents
    collection.insert({ start_value: true }, function () {
      collection.insert({ start_value: true }, function () {
        start()
      })
    })
  })
})

Tinytest.addAsync('update - local collection should fire after-update hook', function (test, next) {
  const collection = new Mongo.Collection(null)
  let c = 0
  const n = () => { if (++c === 2) { next() } }

  function start () {
    collection.after.update(function (userId, doc, fieldNames, modifier) {
      // There should be a userId if we're running on the client.
      // Since this is a local collection, the server should NOT know
      // about any userId
      if (Meteor.isServer) {
        test.equal(userId, undefined)
      } else {
        test.notEqual(userId, undefined)
      }

      test.equal(fieldNames.length, 1)
      test.equal(fieldNames[0], 'update_value')

      test.equal(doc.update_value, true)
      test.equal(Object.prototype.hasOwnProperty.call(this.previous, 'update_value'), false)

      n()
    })

    collection.update({ start_value: true }, { $set: { update_value: true } }, { multi: true })
  }

  InsecureLogin.ready(function () {
    // Add two documents
    collection.insert({ start_value: true }, function () {
      collection.insert({ start_value: true }, function () {
        start()
      })
    })
  })
})

Tinytest.addAsync('update - local collection should fire before-update hook without options in update and still fire end-callback', function (test, next) {
  const collection = new Mongo.Collection(null)

  function start () {
    collection.before.update(function (userId, doc, fieldNames, modifier) {
      modifier.$set.before_update_value = true
    })

    collection.update({ start_value: true }, { $set: { update_value: true } }, function (err) {
      if (err) throw err
      test.equal(collection.find({ start_value: true, update_value: true, before_update_value: true }).count(), 1)
      next()
    })
  }

  InsecureLogin.ready(function () {
    collection.insert({ start_value: true }, start)
  })
})

Tinytest.addAsync('update - local collection should fire after-update hook without options in update and still fire end-callback', function (test, next) {
  const collection = new Mongo.Collection(null)
  let c = 0
  const n = () => { if (++c === 2) { next() } }

  function start () {
    collection.after.update(function (userId, doc, fieldNames, modifier) {
      n()
    })

    collection.update({ start_value: true }, { $set: { update_value: true } }, function (err) {
      if (err) throw err
      n()
    })
  }

  InsecureLogin.ready(function () {
    collection.insert({ start_value: true }, start)
  })
})

Tinytest.addAsync('update - no previous document should be present if fetchPrevious is false', function (test, next) {
  var collection = new Mongo.Collection(null)

  function start () {
    collection.after.update(
      function (userId, doc, fieldNames, modifier) {
        test.equal(this.previous, undefined)
      },
      { fetchPrevious: false }
    )

    collection.update({ start_value: true }, { $set: { update_value: true } }, { multi: true }, function (err) {
      next()
    })
  }

  InsecureLogin.ready(function () {
    // Add two documents
    collection.insert({ start_value: true }, function () {
      collection.insert({ start_value: true }, function () {
        start()
      })
    })
  })
})

Tinytest.addAsync('update - a previous document should be present if fetchPrevious is true', function (test, next) {
  var collection = new Mongo.Collection(null)

  function start () {
    collection.after.update(
      function (userId, doc, fieldNames, modifier) {
        test.notEqual(this.previous, undefined)
        test.notEqual(this.previous.start_value, undefined)
      },
      { fetchPrevious: true }
    )

    collection.update({ start_value: true }, { $set: { update_value: true } }, { multi: true }, function (err) {
      next()
    })
  }

  InsecureLogin.ready(function () {
    // Add two documents
    collection.insert({ start_value: true }, function () {
      collection.insert({ start_value: true }, function () {
        start()
      })
    })
  })
})

Tinytest.addAsync('update - a previous document should be present if fetchPrevious is true, but only requested fields if present', function (test, next) {
  var collection = new Mongo.Collection(null)

  function start () {
    collection.after.update(
      function (userId, doc, fieldNames, modifier) {
        test.notEqual(this.previous, undefined)
        test.notEqual(this.previous.start_value, undefined)
        test.equal(this.previous.another_value, undefined)
      },
      { fetchPrevious: true, fetchFields: { start_value: true } }
    )

    collection.update({ start_value: true }, { $set: { update_value: true } }, { multi: true }, function (err) {
      next()
    })
  }

  InsecureLogin.ready(function () {
    // Add two documents
    collection.insert({ start_value: true, another_value: true }, function () {
      collection.insert({ start_value: true, another_value: true }, function () {
        start()
      })
    })
  })
})
