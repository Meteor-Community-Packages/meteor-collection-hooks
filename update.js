/* global CollectionHooks _ EJSON */

CollectionHooks.defineAdvice('update', function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  var self = this
  var ctx = { context: self, _super: _super, args: args }
  var callback = _.last(args)
  var async = _.isFunction(callback)
  var docs
  var docIds
  var fields
  var abort
  var prev = {}

  // args[0] : selector
  // args[1] : mutator
  // args[2] : options (optional)
  // args[3] : callback

  if (_.isFunction(args[2])) {
    callback = args[2]
    args[2] = {}
  }

  if (!suppressAspects) {
    try {
      // NOTE: fetching the full documents before when fetchPrevious is false and no before hooks are defined is wildly inefficient.
      const shouldFetchForBefore = !_.isEmpty(aspects.before);
      const shouldFetchForAfter = !_.isEmpty(aspects.after);
      let shouldFetchForPrevious = false;
      if (shouldFetchForAfter) {
        shouldFetchForPrevious = _.some(aspects.after, function (o) { return o.options.fetchPrevious !== false }) && CollectionHooks.extendOptions(instance.hookOptions, {}, 'after', 'update').fetchPrevious !== false
      }
      fields = CollectionHooks.getFields(args[1]);
      const fetchFields = { _id: true };
      if (shouldFetchForPrevious || shouldFetchForBefore) {
        const afterAspectFetchFields = shouldFetchForPrevious ? _.filter(aspects.after, function (o) { return o.options.fetchFields }) : [];
        const beforeAspectFetchFields = shouldFetchForBefore ? _.filter(aspects.after, function (o) { return o.options.fetchFields }) : [];
        const afterGlobal = shouldFetchForPrevious ? (CollectionHooks.extendOptions(instance.hookOptions, {}, 'after', 'update').fetchFields || {}) : {};
        const beforeGlobal = shouldFetchForPrevious ? (CollectionHooks.extendOptions(instance.hookOptions, {}, 'before', 'update').fetchFields || {}) : {};
        _.extend(fetchFields, afterGlobal, beforeGlobal, ...afterAspectFetchFields, ...beforeAspectFetchFields);
      }
      docs = CollectionHooks.getDocs.call(self, instance, args[0], args[2], fetchFields).fetch()
      docIds = _.map(docs, function (doc) { return doc._id });

      // copy originals for convenience for the 'after' pointcut
      if (shouldFetchForAfter) {
        prev.mutator = EJSON.clone(args[1])
        prev.options = EJSON.clone(args[2])
        if (shouldFetchForPrevious) {
          prev.docs = {}
          _.each(docs, function (doc) {
            prev.docs[doc._id] = EJSON.clone(doc)
          })
        }
      }

      // before
      _.each(aspects.before, function (o) {
        _.each(docs, function (doc) {
          var r = o.aspect.call(_.extend({ transform: getTransform(doc) }, ctx), userId, doc, fields, args[1], args[2])
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
      if (!_.isEmpty(aspects.after)) {
        var fields = CollectionHooks.getFields(args[1])
        const fetchFields = {};
        const aspectFetchFields = _.filter(aspects.after, function (o) { return o.options.fetchFields });
        const globalFetchFields = CollectionHooks.extendOptions(instance.hookOptions, {}, 'after', 'update').fetchFields;
        if (aspectFetchFields || globalFetchFields) {
          _.extend(fetchFields, globalFetchFields || {}, ...aspectFetchFields.map(a => a.fetchFields));
        }
        var docs = CollectionHooks.getDocs.call(self, instance, {_id: {$in: docIds}}, args[2], fetchFields).fetch()
      }

      _.each(aspects.after, function (o) {
        _.each(docs, function (doc) {
          o.aspect.call(_.extend({
            transform: getTransform(doc),
            previous: prev.docs && prev.docs[doc._id],
            affected: affected,
            err: err
          }, ctx), userId, doc, fields, prev.mutator, prev.options)
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
