import { EJSON } from 'meteor/ejson'
import { Mongo } from 'meteor/mongo'
import { CollectionHooks } from './collection-hooks'

CollectionHooks.defineWrapper('insert', async function (userId, originalMethod, instance, hooks, getTransform, args, suppressHooks) {
  const ctx = { context: this, originalMethod, args }
  let doc = args[0]
  let callback
  if (typeof args[args.length - 1] === 'function') {
    callback = args[args.length - 1]
  }

  const hasCallback = typeof callback === 'function'
  let abort
  let ret

  // before
  if (!suppressHooks) {
    try {
      for (const hookEntry of hooks.before) {
        const r = await hookEntry.fn.call({ transform: getTransform(doc), ...ctx }, userId, doc)
        if (r === false) {
          abort = true
          break
        }
      }

      if (abort) return
    } catch (e) {
      if (hasCallback) return callback.call(this, e)
      throw e
    }
  }

  const after = async (id, err) => {
    if (id) {
      // MongoDB driver compatibility: Handle different return formats for inserted IDs
      // - MongoDB 3.x driver returns { ops: [{ _id: ... }] } from insertOne
      // - MongoDB 4.x+ driver returns { insertedId: ... }
      // - Mongo.ObjectID has a _str property for string representation
      if (typeof id === 'object' && id.ops) {
        if (doc._id._str) {
          // Collection uses Mongo.ObjectID - reconstruct the ObjectID instance
          id = new Mongo.ObjectID(doc._id._str.toString())
        } else {
          // Extract _id from the ops array (MongoDB 3.x driver format)
          id = id.ops && id.ops[0] && id.ops[0]._id
        }
      }
      doc = EJSON.clone(doc)
      doc._id = id
    }
    if (!suppressHooks) {
      const lctx = { transform: getTransform(doc), _id: id, err, ...ctx }

      for (const hookEntry of hooks.after) {
        await hookEntry.fn.call(lctx, userId, doc)
      }
    }
    return id
  }

  if (hasCallback) {
    const wrappedCallback = async function (err, obj, ...args) {
      await after((obj && obj[0] && obj[0]._id) || obj, err)
      return callback.call(this, err, obj, ...args)
    }
    return originalMethod.call(this, doc, wrappedCallback)
  } else {
    ret = await originalMethod.call(this, doc, callback)

    return (await after((ret && ret.insertedId) || (ret && ret[0] && ret[0]._id) || ret))
  }
})
