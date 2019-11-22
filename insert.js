import { EJSON } from 'meteor/ejson'
import { Mongo } from 'meteor/mongo'
import { CollectionHooks } from './collection-hooks'

CollectionHooks.defineAdvice('insert', function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  const ctx = { context: this, _super, args }
  let [doc, callback] = args
  const async = typeof callback === 'function'
  let abort
  let ret

  // before
  if (!suppressAspects) {
    try {
      aspects.before.forEach((o) => {
        const r = o.aspect.call({ transform: getTransform(doc), ...ctx }, userId, doc)
        if (r === false) abort = true
      })

      if (abort) return
    } catch (e) {
      if (async) return callback.call(this, e)
      throw e
    }
  }

  const after = (id, err) => {
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
    if (!suppressAspects) {
      const lctx = { transform: getTransform(doc), _id: id, err, ...ctx }
      aspects.after.forEach((o) => {
        o.aspect.call(lctx, userId, doc)
      })
    }
    return id
  }

  if (async) {
    const wrappedCallback = function (err, obj, ...args) {
      after((obj && obj[0] && obj[0]._id) || obj, err)
      return callback.call(this, err, obj, ...args)
    }
    return _super.call(this, doc, wrappedCallback)
  } else {
    ret = _super.call(this, doc, callback)
    return after((ret && ret[0] && ret[0]._id) || ret)
  }
})
