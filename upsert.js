/* global CollectionHooks _ EJSON */
CollectionHooks.defineAdvice('upsert', function (userId, _super, instance, aspectGroup, getTransform, args, suppressAspects) {
  var self = this
  var ctx = {context: self, _super: _super, args: args}
  var callback = args[args.length - 1]
  var async = typeof callback === 'function'
  var docs
  var docIds
  var abort
  var prev = {}

  // args[0] : selector
  // args[1] : mutator
  // args[2] : options (optional)
  // args[3] : callback

  if (typeof args[2] === 'function') {
    callback = args[2]
    args[2] = {}
  }

  if (!suppressAspects) {
    if (!_.isEmpty(aspectGroup.upsert.before)) {
      docs = CollectionHooks.getDocs.call(self, instance, args[0], args[2]).fetch()
      docIds = docs.map(function (doc) { return doc._id })
    }

    // copy originals for convenience for the 'after' pointcut
    if (!_.isEmpty(aspectGroup.update.after)) {
      if (aspectGroup.update.after.some(function (o) { return o.options.fetchPrevious !== false }) &&
          CollectionHooks.extendOptions(instance.hookOptions, {}, 'after', 'update').fetchPrevious !== false) {
        prev.mutator = EJSON.clone(args[1])
        prev.options = EJSON.clone(args[2])
        prev.docs = {}
        docs.forEach(function (doc) {
          prev.docs[doc._id] = EJSON.clone(doc)
        })
      }
    }

    // before
    aspectGroup.upsert.before.forEach(function (o) {
      var r = o.aspect.call(ctx, userId, args[0], args[1], args[2])
      if (r === false) abort = true
    })

    if (abort) return { numberAffected: 0 }
  }

  function afterUpdate (affected, err) {
    if (!suppressAspects) {
      if (!_.isEmpty(aspectGroup.update.after)) {
        var fields = CollectionHooks.getFields(args[1])
        var docs = CollectionHooks.getDocs.call(self, instance, {_id: {$in: docIds}}, args[2]).fetch()
      }

      aspectGroup.update.after.forEach(function (o) {
        docs.forEach(function (doc) {
          o.aspect.call({
            transform: getTransform(doc),
            previous: prev.docs && prev.docs[doc._id],
            affected: affected,
            err: err,
            ...ctx}, userId, doc, fields, prev.mutator, prev.options)
        })
      })
    }
  }

  function afterInsert (id, err) {
    if (!suppressAspects) {
      if (!_.isEmpty(aspectGroup.insert.after)) {
        var doc = CollectionHooks.getDocs.call(self, instance, {_id: id}, args[0], {}).fetch()[0] // 3rd argument passes empty object which causes magic logic to imply limit:1
        var lctx = {transform: getTransform(doc), _id: id, err: err, ...ctx}
      }

      aspectGroup.insert.after.forEach(function (o) {
        o.aspect.call(lctx, userId, doc)
      })
    }
  }

  if (async) {
    args[args.length - 1] = function (err, ret) {
      if (err || (ret && ret.insertedId)) {
        // Send any errors to afterInsert
        afterInsert(ret.insertedId, err)
      } else {
        afterUpdate(ret && ret.numberAffected, err) // Note that err can never reach here
      }

      return CollectionHooks.hookedOp(function () {
        return callback.call(this, err, ret)
      })
    }

    return CollectionHooks.directOp(function () {
      return _super.apply(self, args)
    })
  } else {
    var ret = CollectionHooks.directOp(function () {
      return _super.apply(self, args)
    })

    if (ret && ret.insertedId) {
      afterInsert(ret.insertedId)
    } else {
      afterUpdate(ret && ret.numberAffected)
    }

    return ret
  }
})
