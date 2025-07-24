import { EJSON } from 'meteor/ejson'
import { CollectionHooks } from './collection-hooks'

const isEmpty = a => !Array.isArray(a) || !a.length

CollectionHooks.defineWrapper('upsert', async function (userId, originalMethod, instance, hookGroup, getTransform, args, suppressHooks) {
  args[0] = CollectionHooks.normalizeSelector(instance._getFindSelector(args))

  const ctx = { context: this, originalMethod, args }
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

  if (!suppressHooks) {
    if (!isEmpty(hookGroup.upsert.before) || !isEmpty(hookGroup.update.after)) {
      const cursor = await CollectionHooks.getDocs.call(this, instance, selector, options)
      docs = await cursor.fetch()
      docIds = docs.map(doc => doc._id)
    }

    // copy originals for convenience for the 'after' pointcut
    if (!isEmpty(hookGroup.update.after)) {
      if (hookGroup.update.after.some(o => o.options.fetchPrevious !== false) &&
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
    for (const fn of hookGroup.upsert.before) {
      const r = await fn.hook.call(ctx, userId, selector, mutator, options)
      if (r === false) abort = true
    }

    if (abort) return { numberAffected: 0 }
  }

  const afterUpdate = async (affected, err) => {
    if (!suppressHooks && !isEmpty(hookGroup.update.after)) {
      const fields = CollectionHooks.getFields(mutator)
      const docs = await CollectionHooks.getDocs.call(this, instance, { _id: { $in: docIds } }, options).fetchAsync()

      for (const o of hookGroup.update.after) {
        for (const doc of docs) {
          await o.hook.call({
            transform: getTransform(doc),
            previous: prev.docs && prev.docs[doc._id],
            affected,
            err,
            ...ctx
          }, userId, doc, fields, prev.mutator, prev.options)
        }
      }
    }
  }

  const afterInsert = async (_id, err) => {
    if (!suppressHooks && !isEmpty(hookGroup.insert.after)) {
      const docs = await CollectionHooks.getDocs.call(this, instance, { _id }, selector, {}).fetchAsync() // 3rd argument passes empty object which causes magic logic to imply limit:1
      const doc = docs[0]
      const lctx = { transform: getTransform(doc), _id, err, ...ctx }

      for (const o of hookGroup.insert.after) {
        await o.hook.call(lctx, userId, doc)
      }
    }
  }

  if (async) {
    const wrappedCallback = async function (err, ret) {
      const { insertedId, numberAffected } = (ret ?? {})
      if (err || insertedId) {
        // Send any errors to afterInsert
        await afterInsert(insertedId, err)
      } else {
        await afterUpdate(numberAffected, err) // Note that err can never reach here
      }

      return CollectionHooks.hookedOp(function () {
        return callback.call(this, err, ret)
      })
    }

    return CollectionHooks.directOp(() => originalMethod.call(this, selector, mutator, options, wrappedCallback))
  } else {
    const ret = await CollectionHooks.directOp(() => originalMethod.call(this, selector, mutator, options, callback))
    const { insertedId, numberAffected } = (ret ?? {})

    if (insertedId) {
      await afterInsert(insertedId)
    } else {
      await afterUpdate(numberAffected)
    }

    return ret
  }
})
