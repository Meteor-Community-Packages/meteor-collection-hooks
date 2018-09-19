/* global CollectionHooks _ EJSON */
CollectionHooks.defineAdvice('remove', function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  var self = this
  var ctx = {context: self, _super: _super, args: args}
  var callback = args[args.length - 1]
  var async = typeof callback === 'function'
  var docs
  var abort
  var prev = []

  // args[0] : selector
  // args[1] : callback

  if (!suppressAspects) {
    try {
      if (!_.isEmpty(aspects.before) || !_.isEmpty(aspects.after)) {
        docs = CollectionHooks.getDocs.call(self, instance, args[0]).fetch()
      }

      // copy originals for convenience for the 'after' pointcut
      if (!_.isEmpty(aspects.after)) {
        docs.forEach(function (doc) {
          prev.push(EJSON.clone(doc))
        })
      }

      // before
      aspects.before.forEach(function (o) {
        docs.forEach(function (doc) {
          var r = o.aspect.call({transform: getTransform(doc), ...ctx}, userId, doc)
          if (r === false) abort = true
        })
      })

      if (abort) return 0
    } catch (e) {
      if (async) return callback.call(self, e)
      throw e
    }
  }

  function after (err) {
    if (!suppressAspects) {
      aspects.after.forEach(function (o) {
        prev.forEach(function (doc) {
          o.aspect.call({transform: getTransform(doc), err: err, ...ctx}, userId, doc)
        })
      })
    }
  }

  if (async) {
    args[args.length - 1] = function (err) {
      after(err)
      return callback.apply(this, arguments)
    }
    return _super.apply(self, args)
  } else {
    var result = _super.apply(self, args)
    after()
    return result
  }
})
