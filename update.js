import { EJSON } from 'meteor/ejson'
import { CollectionHooks } from './collection-hooks'

const isEmpty = a => !Array.isArray(a) || !a.length

CollectionHooks.defineAdvice('update', function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  const ctx = { context: this, _super, args }
  let [selector, mutator, options, callback] = args
  if (typeof options === 'function') {
    callback = options
    options = {}
  }
  const async = typeof callback === 'function'
  let docs
  let docIds
  let fields
  let abort
  const prev = {}

  if (!suppressAspects) {
    try {
      // NOTE: fetching the full documents before when fetchPrevious is false and no before hooks are defined is wildly inefficient.
      const shouldFetchForBefore = !isEmpty(aspects.before)
      const shouldFetchForAfter = !isEmpty(aspects.after)
      let shouldFetchForPrevious = false
      if (shouldFetchForAfter) {
        shouldFetchForPrevious = Object.values(aspects.after).some(o => o.options.fetchPrevious !== false) && CollectionHooks.extendOptions(instance.hookOptions, {}, 'after', 'update').fetchPrevious !== false
      }
      fields = CollectionHooks.getFields(args[1])
      const fetchFields = { }
      if (shouldFetchForPrevious || shouldFetchForBefore) {
        const afterAspectFetchFields = shouldFetchForPrevious ? Object.values(aspects.after).map(o => (o.options || {}).fetchFields || {}) : []
        const beforeAspectFetchFields = shouldFetchForBefore ? Object.values(aspects.before).map(o => (o.options || {}).fetchFields || {}) : []
        const afterGlobal = shouldFetchForPrevious ? (CollectionHooks.extendOptions(instance.hookOptions, {}, 'after', 'update').fetchFields || {}) : {}
        const beforeGlobal = shouldFetchForPrevious ? (CollectionHooks.extendOptions(instance.hookOptions, {}, 'before', 'update').fetchFields || {}) : {}
        Object.assign(fetchFields, afterGlobal, beforeGlobal, ...afterAspectFetchFields, ...beforeAspectFetchFields)
      }
      docs = CollectionHooks.getDocs.call(this, instance, args[0], args[2], fetchFields).fetch()
      docIds = Object.values(docs).map(doc => doc._id)

      // copy originals for convenience for the 'after' pointcut
      if (shouldFetchForAfter) {
        prev.mutator = EJSON.clone(args[1])
        prev.options = EJSON.clone(args[2])
        if (shouldFetchForPrevious) {
          prev.docs = {}
          docs.forEach((doc) => {
            prev.docs[doc._id] = EJSON.clone(doc)
          })
        }
      }

      // before
      aspects.before.forEach(function (o) {
        docs.forEach(function (doc) {
          const r = o.aspect.call({ transform: getTransform(doc), ...ctx }, userId, doc, fields, mutator, options)
          if (r === false) abort = true
        })
      })

      if (abort) return 0
    } catch (e) {
      if (async) return callback.call(this, e)
      throw e
    }
  }

  const after = (affected, err) => {
    if (!suppressAspects) {
      let docs
      let fields
      if (!isEmpty(aspects.after)) {
        fields = CollectionHooks.getFields(args[1])
        const fetchFields = {}
        const aspectFetchFields = Object.values(aspects.after).map(o => (o.options || {}).fetchFields || {})
        const globalFetchFields = CollectionHooks.extendOptions(instance.hookOptions, {}, 'after', 'update').fetchFields
        if (aspectFetchFields || globalFetchFields) {
          Object.assign(fetchFields, globalFetchFields || {}, ...aspectFetchFields.map(a => a.fetchFields))
        }
        docs = CollectionHooks.getDocs.call(this, instance, { _id: { $in: docIds } }, options, fetchFields).fetch()
      }

      aspects.after.forEach((o) => {
        docs.forEach((doc) => {
          o.aspect.call({
            transform: getTransform(doc),
            previous: prev.docs && prev.docs[doc._id],
            affected,
            err,
            ...ctx
          }, userId, doc, fields, prev.mutator, prev.options)
        })
      })
    }
  }

  if (async) {
    const wrappedCallback = function (err, affected, ...args) {
      after(affected, err)
      return callback.call(this, err, affected, ...args)
    }
    return _super.call(this, selector, mutator, options, wrappedCallback)
  } else {
    const affected = _super.call(this, selector, mutator, options, callback)
    after(affected)
    return affected
  }
})
