import { EJSON } from 'meteor/ejson'
import { CollectionHooks } from './collection-hooks'

const isEmpty = a => !Array.isArray(a) || !a.length

CollectionHooks.defineAdvice('upsert', function (userId, _super, instance, aspectGroup, getTransform, args, suppressAspects) {
  args[0] = CollectionHooks.normalizeSelector(instance._getFindSelector(args))

  const ctx = { context: this, _super, args }
  let [selector, mutator, options, callback] = args
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  const async = typeof callback === 'function'
  let docs
  let docIds
  let abort
  const prev = {}

  if (!suppressAspects) {
    if (!isEmpty(aspectGroup.upsert.before) || !isEmpty(aspectGroup.update.after)) {
      docs = CollectionHooks.getDocs.call(this, instance, selector, options).fetch()
      docIds = docs.map(doc => doc._id)
    }

    // copy originals for convenience for the 'after' pointcut
    if (!isEmpty(aspectGroup.update.after)) {
      if (aspectGroup.update.after.some(o => o.options.fetchPrevious !== false) &&
        CollectionHooks.extendOptions(instance.hookOptions, {}, 'after', 'update').fetchPrevious !== false) {
        prev.mutator = EJSON.clone(mutator)
        prev.options = EJSON.clone(options)

        prev.docs = {}
        docs.forEach((doc) => {
          prev.docs[doc._id] = EJSON.clone(doc)
        })
      }
    }

    // before
    aspectGroup.upsert.before.forEach((o) => {
      const r = o.aspect.call(ctx, userId, selector, mutator, options)
      if (r === false) abort = true
    })

    if (abort) return { numberAffected: 0 }
  }

  const afterUpdate = (affected, err) => {
    if (!suppressAspects && !isEmpty(aspectGroup.update.after)) {
      const fields = CollectionHooks.getFields(mutator)
      const docs = CollectionHooks.getDocs.call(this, instance, { _id: { $in: docIds } }, options).fetch()

      aspectGroup.update.after.forEach((o) => {
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

  const afterInsert = (_id, err) => {
    if (!suppressAspects && !isEmpty(aspectGroup.insert.after)) {
      const doc = CollectionHooks.getDocs.call(this, instance, { _id }, selector, {}).fetch()[0] // 3rd argument passes empty object which causes magic logic to imply limit:1
      const lctx = { transform: getTransform(doc), _id, err, ...ctx }

      aspectGroup.insert.after.forEach((o) => {
        o.aspect.call(lctx, userId, doc)
      })
    }
  }

  if (async) {
    const wrappedCallback = function (err, ret) {
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

    return CollectionHooks.directOp(() => _super.call(this, selector, mutator, options, wrappedCallback))
  } else {
    const ret = CollectionHooks.directOp(() => _super.call(this, selector, mutator, options, callback))

    if (ret && ret.insertedId) {
      afterInsert(ret.insertedId)
    } else {
      afterUpdate(ret && ret.numberAffected)
    }

    return ret
  }
})
