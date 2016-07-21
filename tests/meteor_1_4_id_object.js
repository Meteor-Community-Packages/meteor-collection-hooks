/* global Tinytest Meteor _ */

var collection = Meteor.users

if (Meteor.isServer) {
  collection.allow({
    insert: function () { return true },
    update: function () { return true },
    remove: function () { return true }
  })
}

Tinytest.addAsync('meteor_1_4_id_object - after insert hooks should be able to cope with object _id with ops property in Meteor 1.4', function (test, next) {
  var key = Date.now()

  var aspect1 = collection.after.insert(function (nil, doc) {
    if (doc && doc.key && doc.key === key) {
      test.equal(doc._id, this._id)
      test.isFalse(_.isObject(doc._id), '_id property should not be an object')
    }
  })

  collection.insert({key: key}, function (err, id) {
    if (err) throw err

    // clean-up
    collection.remove({_id: id})
    aspect1.remove()

    next()
  })
})
