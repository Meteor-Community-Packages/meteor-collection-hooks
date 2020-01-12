import { EJSON } from 'meteor/ejson'
import { CollectionHooks } from './collection-hooks'

const isEmpty = a => !Array.isArray(a) || !a.length

CollectionHooks.defineAdvice('remove', function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  const ctx = { context: this, _super, args }
  const [selector, callback] = args
  const async = typeof callback === 'function'
  let docs
  let abort
  const prev = []

  if (!suppressAspects) {
    try {
      if (!isEmpty(aspects.before) || !isEmpty(aspects.after)) {
        docs = CollectionHooks.getDocs.call(this, instance, selector).fetch()
      }

      // copy originals for convenience for the 'after' pointcut
      if (!isEmpty(aspects.after)) {
        docs.forEach(doc => prev.push(EJSON.clone(doc)))
      }

      // before
      aspects.before.forEach((o) => {
        docs.forEach((doc) => {
          const r = o.aspect.call({ transform: getTransform(doc), ...ctx }, userId, doc)
          if (r === false) abort = true
        })
      })

      if (abort) return 0
    } catch (e) {
      if (async) return callback.call(this, e)
      throw e
    }
  }

  function after (err) {
    if (!suppressAspects) {
      aspects.after.forEach((o) => {
        prev.forEach((doc) => {
          o.aspect.call({ transform: getTransform(doc), err, ...ctx }, userId, doc)
        })
      })
    }
  }

  if (async) {
    const wrappedCallback = function (err, ...args) {
      after(err)
      return callback.call(this, err, ...args)
    }
    return _super.call(this, selector, wrappedCallback)
  } else {
    const result = _super.call(this, selector, callback)
    after()
    return result
  }
})
