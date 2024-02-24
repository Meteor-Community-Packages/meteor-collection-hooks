import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { Tinytest } from 'meteor/tinytest'
import { InsecureLogin } from './insecure_login'

const collection1 = new Mongo.Collection('test_update_collection1')

if (Meteor.isServer) {
  Tinytest.addAsync('update - collection1 document should have extra property added to it before it is updated', async function (test, next) {
    const tmp = {}

    function start () {
      collection1.before.update(function (userId, doc, fieldNames, modifier) {
        // There should be no userId because the update was initiated
        // on the server -- there's no correlation to any specific user
        tmp.userId = userId // HACK: can't test here directly otherwise refreshing test stops execution here
        modifier.$set.before_update_value = true
      })

      collection1.updateAsync({ start_value: true }, { $set: { update_value: true } }, { multi: true }, function (err) {
        if (err) throw err
        test.equal(collection1.find({ start_value: true, update_value: true, before_update_value: true }).count(), 2)
        test.equal(tmp.userId, undefined)
        next()
      })
    }

    await collection1.removeAsync({})

    // Add two documents
    await collection1.insertAsync({ start_value: true }, async function () {
      await collection1.insertAsync({ start_value: true }, function () {
        start()
      })
    })
  })
}

const collection2 = new Mongo.Collection('test_update_collection2')

if (Meteor.isServer) {
  // full client-side access
  collection2.allow({
    insert () { return true },
    insertAsync () { return true },
    update () { return true },
    updateAsync () { return true },
    remove () { return true }
  })

  Meteor.methods({
    test_update_reset_collection2 () {
      return collection2.removeAsync({})
    }
  })

  Meteor.publish('test_update_publish_collection2', () => collection2.find())

  collection2.before.update(function (userId, doc, fieldNames, modifier) {
    modifier.$set.server_value = true
  })
}

if (Meteor.isClient) {
  Meteor.subscribe('test_update_publish_collection2')

  Tinytest.addAsync('update - collection2 document should have client-added and server-added extra properties added to it before it is updated', function (test, next) {
    let c = 0
    const n = () => { if (++c === 2) { next() } }

    function start (err, id) {
      if (err) throw err

      collection2.before.update(function (userId, doc, fieldNames, modifier) {
        // Insert is initiated on the client, a userId must be present
        test.notEqual(userId, undefined)

        test.equal(fieldNames.length, 1)
        test.equal(fieldNames[0], 'update_value')

        modifier.$set.client_value = true
      })

      collection2.after.update(function (userId, doc, fieldNames, modifier) {
        test.equal(doc.update_value, true)
        test.equal(Object.prototype.hasOwnProperty.call(this.previous, 'update_value'), false)
        n()
      })

      // TODO(v3): had to change to updateAsync since update caused a server-side error with allow-deny
      // W20240224-16:43:38.768(1)? (STDERR) Error: findOne +  is not available on the server. Please use findOneAsync() instead.
      // W20240224-16:43:38.768(1)? (STDERR)     at Object.ret.<computed> (packages/mongo/remote_collection_driver.js:52:15)
      // W20240224-16:43:38.769(1)? (STDERR)     at Object.<anonymous> (packages/matb33:collection-hooks/findone.js:27:28)
      // W20240224-16:43:38.769(1)? (STDERR)     at Object.wrappedMethod [as findOne] (packages/matb33:collection-hooks/collection-hooks.js:118:23)
      // W20240224-16:43:38.769(1)? (STDERR)     at ns.Collection.CollectionPrototype._validatedUpdate (packages/allow-deny/allow-deny.js:485:32)
      // W20240224-16:43:38.769(1)? (STDERR)     at MethodInvocation.m.<computed> (packages/allow-deny/allow-deny.js:193:46)
      // W20240224-16:43:38.769(1)? (STDERR)     at maybeAuditArgumentChecks (packages/ddp-server/livedata_server.js:1990:12)
      // W20240224-16:43:38.769(1)? (STDERR)     at DDP._CurrentMethodInvocation.withValue.name (packages/ddp-server/livedata_server.js:829:15)
      // W20240224-16:43:38.769(1)? (STDERR)     at EnvironmentVariableAsync.<anonymous> (packages/meteor.js:1285:23)
      // W20240224-16:43:38.769(1)? (STDERR)     at packages/meteor.js:771:17
      // W20240224-16:43:38.770(1)? (STDERR)     at AsyncLocalStorage.run (node:async_hooks:346:14)
      // W20240224-16:43:38.770(1)? (STDERR)     at Object.Meteor._runAsync (packages/meteor.js:768:28)
      // W20240224-16:43:38.770(1)? (STDERR)     at EnvironmentVariableAsync.withValue (packages/meteor.js:1276:19)
      // W20240224-16:43:38.770(1)? (STDERR)     at getCurrentMethodInvocationResult (packages/ddp-server/livedata_server.js:826:40)
      // W20240224-16:43:38.770(1)? (STDERR)     at EnvironmentVariableAsync.<anonymous> (packages/meteor.js:1285:23)
      // W20240224-16:43:38.770(1)? (STDERR)     at packages/meteor.js:771:17
      // W20240224-16:43:38.770(1)? (STDERR)     at AsyncLocalStorage.run (node:async_hooks:346:14)
      collection2.updateAsync({ _id: id }, { $set: { update_value: true } }).then(function (res, err) {
        if (err) throw err
        test.equal(collection2.find({ start_value: true, client_value: true, server_value: true }).count(), 1)
        n()
      })
    }

    InsecureLogin.ready(function () {
      Meteor.callAsync('test_update_reset_collection2').then(function (nil, result) {
        collection2.insert({ start_value: true }, start)
      })
    })
  })
}
