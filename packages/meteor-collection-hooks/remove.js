import { EJSON } from 'meteor/ejson'
import { CollectionHooks } from './collection-hooks'

const isEmpty = (a) => !Array.isArray(a) || !a.length

CollectionHooks.defineWrapper(
  'remove',
  async function (
    userId,
    originalMethod,
    instance,
    hooks,
    getTransform,
    args,
    suppressHooks
  ) {
    const ctx = { context: this, originalMethod, args }
    const [selector, callback] = args
    const async = typeof callback === 'function'
    let docs
    let abort
    const prev = []

    if (!suppressHooks) {
      try {
        if (!isEmpty(hooks.before) || !isEmpty(hooks.after)) {
          const cursor = await CollectionHooks.getDocs.call(
            this,
            instance,
            selector
          )
          docs = await cursor.fetch()
        }

        // copy originals for convenience for the 'after' pointcut
        if (!isEmpty(hooks.after)) {
          docs.forEach((doc) => prev.push(EJSON.clone(doc)))
        }

        // before
        for (const o of hooks.before) {
          for (const doc of docs) {
            const r = await o.hook.call(
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
      if (!suppressHooks) {
        for (const o of hooks.after) {
          for (const doc of prev) {
            await o.hook.call(
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
      return originalMethod.call(this, selector, wrappedCallback)
    } else {
      const result = await originalMethod.call(this, selector, callback)
      await after()
      return result
    }
  }
)
