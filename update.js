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
      if (!isEmpty(aspects.before) || !isEmpty(aspects.after)) {
        fields = CollectionHooks.getFields(mutator)
        docs = CollectionHooks.getDocs.call(this, instance, selector, options).fetch()
        docIds = docs.map(doc => doc._id)
      }

      // copy originals for convenience for the 'after' pointcut
      if (!isEmpty(aspects.after)) {
        prev.mutator = EJSON.clone(mutator)
        prev.options = EJSON.clone(options)
        if (
          aspects.after.some(o => o.options.fetchPrevious !== false) &&
          CollectionHooks.extendOptions(instance.hookOptions, {}, 'after', 'update').fetchPrevious !== false
        ) {
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
    if (!suppressAspects && !isEmpty(aspects.after)) {
      const fields = CollectionHooks.getFields(mutator)
      const docs = CollectionHooks.getDocs.call(this, instance, { _id: { $in: docIds } }, options).fetch()

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
