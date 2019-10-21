import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'

const collection = Meteor.users
const collection1 = new Mongo.Collection('test_insert_mongoid_collection1', { idGeneration: 'MONGO' })

if (Meteor.isServer) {
  collection.allow({
    insert: function () { return true },
    update: function () { return true },
    remove: function () { return true }
  })
  collection1.allow({
    insert: function () { return true },
    remove: function () { return true }
  })
}

Tinytest.addAsync('meteor_1_4_id_object - after insert hooks should be able to cope with object _id with ops property in Meteor 1.4', function (test, next) {
  const key = Date.now()

  const aspect1 = collection.after.insert(function (nil, doc) {
    if (doc && doc.key && doc.key === key) {
      test.equal(doc._id, this._id)
      test.isFalse(Object(doc._id) === doc._id, '_id property should not be an object')
    }
  })

  collection.insert({ key: key }, function (err, id) {
    if (err) throw err

    // clean-up
    collection.remove({ _id: id })
    aspect1.remove()

    next()
  })
})

Tinytest.addAsync('meteor_1_4_id_object - after insert hooks should be able to cope with Mongo.ObjectID _id with _str property in Meteor 1.4', function (test, next) {
  const key = Date.now()

  const aspect1 = collection1.after.insert(function (nil, doc) {
    if (doc && doc.key && doc.key === key) {
      let foundDoc = null
      try {
        foundDoc = collection1.direct.findOne({ _id: doc._id })
      } catch (exception) {}
      test.isNotNull(foundDoc)
    }
  })

  collection1.insert({ key: key }, function (err, id) {
    if (err) throw err

    // clean-up
    collection1.remove({ _id: id })
    aspect1.remove()

    next()
  })
})
