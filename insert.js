/* global CollectionHooks _ EJSON Mongo */
var isFunction = require('lodash/isFunction')
var isObject = require('lodash/isObject')

CollectionHooks.defineAdvice('insert', function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  var self = this
  var ctx = {context: self, _super: _super, args: args}
  var callback = args[args.length - 1]
  var async = isFunction(callback)
  var abort, ret

  // args[0] : doc
  // args[1] : callback

  // before
  if (!suppressAspects) {
    try {
      aspects.before.forEach(function (o) {
        var r = o.aspect.call({transform: getTransform(args[0]), ...ctx}, userId, args[0])
        if (r === false) abort = true
      })

      if (abort) return
    } catch (e) {
      if (async) return callback.call(self, e)
      throw e
    }
  }

  function after (id, err) {
    var doc = args[0]
    if (id) {
      // In some cases (namely Meteor.users on Meteor 1.4+), the _id property
      // is a raw mongo _id object. We need to extract the _id from this object
      if (isObject(id) && id.ops) {
        // If _str then collection is using Mongo.ObjectID as ids
        if (doc._id._str) {
          id = new Mongo.ObjectID(doc._id._str.toString())
        } else {
          id = id.ops && id.ops[0] && id.ops[0]._id
        }
      }
      doc = EJSON.clone(args[0])
      doc._id = id
    }
    if (!suppressAspects) {
      var lctx = {transform: getTransform(doc), _id: id, err: err, ...ctx}
      aspects.after.forEach(function (o) {
        o.aspect.call(lctx, userId, doc)
      })
    }
    return id
  }

  if (async) {
    args[args.length - 1] = function (err, obj) {
      after((obj && obj[0] && obj[0]._id) || obj, err)
      return callback.apply(this, arguments)
    }
    return _super.apply(self, args)
  } else {
    ret = _super.apply(self, args)
    return after((ret && ret[0] && ret[0]._id) || ret)
  }
})
