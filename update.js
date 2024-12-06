import { EJSON } from 'meteor/ejson'
import { CollectionHooks } from './collection-hooks'

const isEmpty = (a) => !Array.isArray(a) || !a.length

CollectionHooks.defineWrapper(
  'update',
  async function (
    userId,
    _super,
    instance,
    hooks,
    getTransform,
    args,
    suppressHooks
  ) {
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

    if (!suppressHooks) {
      try {
        const shouldFetchForBefore = !isEmpty(hooks.before)
        const shouldFetchForAfter = !isEmpty(hooks.after)
        let shouldFetchForPrevious = false
        if (shouldFetchForAfter) {
          shouldFetchForPrevious =
            Object.values(hooks.after).some(
              (o) => o.options.fetchPrevious !== false
            ) &&
            CollectionHooks.extendOptions(
              instance.hookOptions,
              {},
              'after',
              'update'
            ).fetchPrevious !== false
        }
        fields = CollectionHooks.getFields(args[1])
        const fetchFields = {}
        if (shouldFetchForPrevious || shouldFetchForBefore) {
          const afterHookFetchFields = shouldFetchForPrevious
            ? Object.values(hooks.after).map(
              (o) => (o.options || {}).fetchFields || {}
            )
            : []
          const beforeHookFetchFields = shouldFetchForBefore
            ? Object.values(hooks.before).map(
              (o) => (o.options || {}).fetchFields || {}
            )
            : []
          const afterGlobal = shouldFetchForPrevious
            ? CollectionHooks.extendOptions(
              instance.hookOptions,
              {},
              'after',
              'update'
            ).fetchFields || {}
            : {}
          const beforeGlobal = shouldFetchForPrevious
            ? CollectionHooks.extendOptions(
              instance.hookOptions,
              {},
              'before',
              'update'
            ).fetchFields || {}
            : {}
          Object.assign(
            fetchFields,
            afterGlobal,
            beforeGlobal,
            ...afterHookFetchFields,
            ...beforeHookFetchFields
          )
        }
        const cursor = await CollectionHooks.getDocs.call(
          this,
          instance,
          args[0],
          args[2],
          fetchFields
        )
        docs = await cursor.fetch()
        docIds = Object.values(docs).map((doc) => doc._id)

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
        for (const o of hooks.before) {
          for (const doc of docs) {
            const r = await o.hook.call(
              { transform: getTransform(doc), ...ctx },
              userId,
              doc,
              fields,
              mutator,
              options
            )
            if (r === false) abort = true
          }
        }

        if (abort) return 0
      } catch (e) {
        if (async) return callback.call(this, e)
        throw e
      }
    }

    const after = async (affected, err) => {
      if (!suppressHooks) {
        let docs
        let fields
        if (!isEmpty(hooks.after)) {
          fields = CollectionHooks.getFields(args[1])
          const fetchFields = {}
          const hookFetchFields = Object.values(hooks.after).map(
            (o) => (o.options || {}).fetchFields || {}
          )
          const globalFetchFields = CollectionHooks.extendOptions(
            instance.hookOptions,
            {},
            'after',
            'update'
          ).fetchFields
          if (hookFetchFields || globalFetchFields) {
            Object.assign(
              fetchFields,
              globalFetchFields || {},
              ...hookFetchFields.map((a) => a.fetchFields)
            )
          }

          const cursor = await CollectionHooks.getDocs.call(
            this,
            instance,
            { _id: { $in: docIds } },
            options,
            fetchFields,
            { useDirect: true }
          )

          docs = await cursor.fetch()
        }

        for (const o of hooks.after) {
          for (const doc of docs) {
            await o.hook.call(
              {
                transform: getTransform(doc),
                previous: prev.docs && prev.docs[doc._id],
                affected,
                err,
                ...ctx
              },
              userId,
              doc,
              fields,
              prev.mutator,
              prev.options
            )
          }
        }
      }
    }

    if (async) {
      const wrappedCallback = async function (err, affected, ...args) {
        await after(affected, err)
        return callback.call(this, err, affected, ...args)
      }
      return _super.call(this, selector, mutator, options, wrappedCallback)
    } else {
      const affected = await _super.call(
        this,
        selector,
        mutator,
        options,
        callback
      )

      await after(affected)
      return affected
    }
  }
)
