import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'

// XXX: Code below throws
// TypeError: Cannot read property '#<Object>' of undefined
// No idea why...

// ([null, 'direct_collection_test']).forEach(function (ctype) {
//   Tinytest.add(`direct - hooks should not be fired when using .direct (collection type ${ctype})`, function (test) {
//     // console.log('-------', ctype)

//     const collection = new Mongo.Collection(ctype, {connection: null})
//     let hookCount = 0

//     // The server will make a call to find when findOne is called, which adds 2 extra counts
//     // Update will make calls to find with options forwarded, which adds 4 extra counts
//     const hookCountTarget = Meteor.isServer ? 16 : 14

//     // Full permissions on collection
//     collection.allow({
//       insert: function () { return true },
//       update: function () { return true },
//       remove: function () { return true }
//     })

//     collection.before.insert(function (userId, doc) {
//       if (doc && doc.test) {
//         hookCount++
//         // console.log(ctype, ': before insert', hookCount)
//       }
//     })

//     collection.after.insert(function (userId, doc) {
//       if (doc && doc.test) {
//         hookCount++
//         // console.log(ctype, ': after insert', hookCount)
//       }
//     })

//     collection.before.update(function (userId, doc, fieldNames, modifier, options) {
//       if (options && options.test) {
//         hookCount++
//         // console.log(ctype, ': before update', hookCount)
//       }
//     })

//     collection.after.update(function (userId, doc, fieldNames, modifier, options) {
//       if (options && options.test) {
//         hookCount++
//         // console.log(ctype, ': after update', hookCount)
//       }
//     })

//     collection.before.remove(function (userId, doc) {
//       if (doc && doc._id === 'test') {
//         hookCount++
//         // console.log(ctype, ': before remove', hookCount)
//       }
//     })

//     collection.after.remove(function (userId, doc) {
//       if (doc && doc._id === 'test') {
//         hookCount++
//         // console.log(ctype, ': after remove', hookCount)
//       }
//     })

//     collection.before.find(function (userId, selector, options) {
//       if (options && options.test) {
//         hookCount++
//         // console.log(ctype, ': before find', hookCount)
//       }
//     })

//     collection.after.find(function (userId, selector, options, result) {
//       if (options && options.test) {
//         hookCount++
//         // console.log(ctype, ': after find', hookCount)
//       }
//     })

//     collection.before.findOne(function (userId, selector, options) {
//       if (options && options.test) {
//         hookCount++
//         // console.log(ctype, ': before findOne', hookCount)
//       }
//     })

//     collection.after.findOne(function (userId, selector, options, result) {
//       if (options && options.test) {
//         hookCount++
//         // console.log(ctype, ': after findOne', hookCount)
//       }
//     })

//     collection.insert({_id: 'test', test: 1})
//     collection.update({_id: 'test'}, {$set: {test: 1}}, {test: 1})
//     collection.find({}, {test: 1})
//     collection.findOne({}, {test: 1})
//     collection.remove({_id: 'test'})

//     test.equal(hookCount, hookCountTarget)

//     // These should in no way affect the hookCount, which is essential in proving
//     // that the direct calls are functioning as intended
//     collection.direct.insert({_id: 'test', test: 1})

//     collection.direct.update({_id: 'test'}, {$set: {test: 1}}, {test: 1})

//     const cursor = collection.direct.find({}, {test: 1})
//     const count = cursor.count()
//     test.equal(count, 1)

//     const doc = collection.direct.findOne({}, {test: 1})
//     test.equal(doc.test, 1)

//     collection.direct.remove({_id: 'test'})

//     test.equal(hookCount, hookCountTarget)
//   })
// })

// TODO(v3): failing on client
// [{}, { connection: null }].forEach(function (conntype, i) {
//   [null, 'direct_collection_test_stringid'].forEach(function (ctype) {
//     const cname = ctype && (ctype + i)
//   })
// })

function createTest (cname, conntype) {
  Tinytest.addAsync(`direct - update and remove should allow removing by _id string (${cname}, ${JSON.stringify(conntype)})`, async function (test) {
    const collection = new Mongo.Collection(cname, conntype)

    // Full permissions on collection
    collection.allow({
      insert: function () { return true },
      update: function () { return true },
      remove: function () { return true },
      insertAsync: function () { return true },
      updateAsync: function () { return true },
      removeAsync: function () { return true }
    })

    async function hasCountAndTestValue (count, value) {
      const cursor = await collection.direct.find({ _id: 'testid', test: value })
      test.equal(await cursor.countAsync(), count)
    }

    await collection.direct.removeAsync({ _id: 'testid' })
    await collection.direct.insertAsync({ _id: 'testid', test: 1 })

    await hasCountAndTestValue(1, 1)
    await collection.direct.updateAsync('testid', { $set: { test: 2 } })
    await hasCountAndTestValue(1, 2)
    await collection.direct.removeAsync('testid')
    await hasCountAndTestValue(0, 2)
  })
}

// NOTE: failing on client without resolverType: 'stub'
// See: https://github.com/meteor/meteor/issues/13036
createTest('direct_collection_test_stringid0', {
  resolverType: 'stub'
})

// The rest are working
createTest(null, {})
createTest('direct_collection_test_stringid1', { connection: null })
createTest(null, { connection: null })

if (Meteor.isServer) {
  Tinytest.addAsync('direct - Meteor.users.direct.insert should return _id, not an object', async function (test) {
    await Meteor.users.removeAsync('directinserttestid')

    const result = await Meteor.users.direct.insertAsync({ _id: 'directinserttestid', test: 1 })
    test.isFalse(Object(result) === result)
  })
}
