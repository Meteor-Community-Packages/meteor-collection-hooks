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

  const async = typeof callback === 'function'
  let abort
  let ret

  // before
  if (!suppressHooks) {
    try {
      for (const o of hooks.before) {
        const r = await o.hook.call({ transform: getTransform(doc), ...ctx }, userId, doc)
        if (r === false) {
          abort = true
          break
        }
      }

      if (abort) return
    } catch (e) {
      if (async) return callback.call(this, e)
      throw e
    }
  }

  const after = async (id, err) => {
    if (id) {
      // In some cases (namely Meteor.users on Meteor 1.4+), the _id property
      // is a raw mongo _id object. We need to extract the _id from this object
      if (typeof id === 'object' && id.ops) {
        // If _str then collection is using Mongo.ObjectID as ids
        if (doc._id._str) {
          id = new Mongo.ObjectID(doc._id._str.toString())
        } else {
          id = id.ops && id.ops[0] && id.ops[0]._id
        }
      }
      doc = EJSON.clone(doc)
      doc._id = id
    }
    if (!suppressHooks) {
      const lctx = { transform: getTransform(doc), _id: id, err, ...ctx }

      for (const o of hooks.after) {
        await o.hook.call(lctx, userId, doc)
      }
    }
    return id
  }

  if (async) {
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
