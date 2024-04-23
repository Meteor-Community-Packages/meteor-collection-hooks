import { EJSON } from 'meteor/ejson'
import { CollectionHooks } from './collection-hooks'

const isEmpty = (a) => !Array.isArray(a) || !a.length

CollectionHooks.defineAdvice(
  'remove',
  async function (
    userId,
    _super,
    instance,
    aspects,
    getTransform,
    args,
    suppressAspects
  ) {
    const ctx = { context: this, _super, args }
    const [selector, callback] = args
    const async = typeof callback === 'function'
    let docs
    let abort
    const prev = []

    if (!suppressAspects) {
      try {
        if (!isEmpty(aspects.before) || !isEmpty(aspects.after)) {
          const cursor = await CollectionHooks.getDocs.call(
            this,
            instance,
            selector
          )
          docs = await cursor.fetch()
        }

        // copy originals for convenience for the 'after' pointcut
        if (!isEmpty(aspects.after)) {
          docs.forEach((doc) => prev.push(EJSON.clone(doc)))
        }

        // before
        for (const o of aspects.before) {
          for (const doc of docs) {
            const r = await o.aspect.call(
              { transform: getTransform(doc), ...ctx },
              userId,
              doc
            )
            if (r === false) {
              abort = true
              break
            }
          }

          if (abort) {
            break
          }
        }

        if (abort) return 0
      } catch (e) {
        if (async) return callback.call(this, e)
        throw e
      }
    }

    async function after (err) {
      if (!suppressAspects) {
        for (const o of aspects.after) {
          for (const doc of prev) {
            await o.aspect.call(
              { transform: getTransform(doc), err, ...ctx },
              userId,
              doc
            )
          }
        }
      }
    }

    if (async) {
      const wrappedCallback = async function (err, ...args) {
        await after(err)
        return callback.call(this, err, ...args)
      }
      return _super.call(this, selector, wrappedCallback)
    } else {
      const result = await _super.call(this, selector, callback)
      await after()
      return result
    }
  }
)
