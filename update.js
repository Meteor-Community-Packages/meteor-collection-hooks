/* global CollectionHooks _ EJSON */
var isFunction = require('lodash/isFunction')
var isEmpty = require('lodash/isEmpty')

CollectionHooks.defineAdvice('update', function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  var self = this
  var ctx = {context: self, _super: _super, args: args}
  var callback = args[args.length - 1]
  var async = isFunction(callback)
  var docs
  var docIds
  var fields
  var abort
  var prev = {}

  // args[0] : selector
  // args[1] : mutator
  // args[2] : options (optional)
  // args[3] : callback

  if (isFunction(args[2])) {
    callback = args[2]
    args[2] = {}
  }

  if (!suppressAspects) {
    try {
      if (!isEmpty(aspects.before) || !isEmpty(aspects.after)) {
        fields = CollectionHooks.getFields(args[1])
        docs = CollectionHooks.getDocs.call(self, instance, args[0], args[2]).fetch()
        docIds = docs.map(function (doc) { return doc._id })
      }

      // copy originals for convenience for the 'after' pointcut
      if (!isEmpty(aspects.after)) {
        prev.mutator = EJSON.clone(args[1])
        prev.options = EJSON.clone(args[2])
        if (
          aspects.after.some(function (o) { return o.options.fetchPrevious !== false }) &&
          CollectionHooks.extendOptions(instance.hookOptions, {}, 'after', 'update').fetchPrevious !== false
        ) {
          prev.docs = {}
          docs.forEach(function (doc) {
            prev.docs[doc._id] = EJSON.clone(doc)
          })
        }
      }

      // before
      aspects.before.forEach(function (o) {
        docs.forEach(function (doc) {
          var r = o.aspect.call({transform: getTransform(doc), ...ctx}, userId, doc, fields, args[1], args[2])
          if (r === false) abort = true
        })
      })

      if (abort) return 0
    } catch (e) {
      if (async) return callback.call(self, e)
      throw e
    }
  }

  function after (affected, err) {
    if (!suppressAspects) {
      if (!isEmpty(aspects.after)) {
        var fields = CollectionHooks.getFields(args[1])
        var docs = CollectionHooks.getDocs.call(self, instance, {_id: {$in: docIds}}, args[2]).fetch()
      }

      aspects.after.forEach(function (o) {
        docs.forEach(function (doc) {
          o.aspect.call({
            transform: getTransform(doc),
            previous: prev.docs && prev.docs[doc._id],
            affected: affected,
            err: err,
            ...ctx
          }, userId, doc, fields, prev.mutator, prev.options)
        })
      })
    }
  }

  if (async) {
    args[args.length - 1] = function (err, affected) {
      after(affected, err)
      return callback.apply(this, arguments)
    }
    return _super.apply(this, args)
  } else {
    var affected = _super.apply(self, args)
    after(affected)
    return affected
  }
})
