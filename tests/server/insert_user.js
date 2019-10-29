import { Meteor } from 'meteor/meteor'
import { Tinytest } from 'meteor/tinytest'

Tinytest.addAsync('insert - Meteor.users collection document should have extra property added before being inserted and properly provide inserted _id in after hook', function (test, next) {
  const collection = Meteor.users

  const aspect1 = collection.before.insert(function (nil, doc) {
    if (doc && doc.test) {
      doc.before_insert_value = true
    }
  })

  const aspect2 = collection.after.insert(function (nil, doc) {
    if (doc && doc.test) {
      test.equal(doc._id, this._id)
      test.isFalse(Array.isArray(doc._id))
    }
  })

  collection.insert({ start_value: true, test: 1 }, function (err, id) {
    if (err) throw err
    test.notEqual(collection.find({ start_value: true, before_insert_value: true }).count(), 0)
    collection.remove({ _id: id })
    aspect1.remove()
    aspect2.remove()
    next()
  })
})
