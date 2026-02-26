import { CollectionHooks } from './collection-hooks'

const ASYNC_METHODS = ['countAsync', 'fetchAsync', 'forEachAsync', 'mapAsync']

/**
 * Checks if a function is an async function
 * @param {Function} fn - The function to check
 * @returns {boolean} True if the function is async
 */
const isAsyncFunction = (fn) => fn?.constructor?.name === 'AsyncFunction'

/**
 * Find hook wrapper for collection.find() operations.
 *
 * IMPORTANT: Async Limitation for before.find hooks
 * -------------------------------------------------
 * before.find hooks CANNOT be async functions. This is a fundamental limitation:
 *
 * 1. find() must return a cursor synchronously - this is how MongoDB cursors work
 * 2. If before.find were async, we'd have to await it before returning the cursor
 * 3. This would make find() return a Promise instead of a cursor, breaking all code
 *    that expects: collection.find().fetch(), collection.find().forEach(), etc.
 *
 * after.find hooks CAN be async because they fire on cursor async methods
 * (fetchAsync, countAsync, etc.) which already return Promises.
 *
 * With Meteor v3 this behaves differently than with Meteor v2.
 * We cannot use async hooks on find() directly because in Meteor it is a sync method
 * that returns cursor instance. That's why we wrap async cursor methods and fire
 * after hooks when those methods are called.
 */
CollectionHooks.defineWrapper('find', function (userId, originalMethod, instance, hooks, getTransform, args, suppressHooks) {
  const selector = CollectionHooks.normalizeSelector(instance._getFindSelector(args))
  const options = instance._getFindOptions(args)

  // Apply synchronous before hooks (async before.find hooks are not allowed)
  hooks.before.forEach(hookEntry => {
    if (isAsyncFunction(hookEntry.fn)) {
      throw new Error('Cannot use async function as before.find hook')
    }
    hookEntry.fn.call(this, userId, selector, options)
  })

  const cursor = originalMethod.call(this, selector, options)

  // Wrap async cursor methods
  ASYNC_METHODS.forEach((method) => {
    if (cursor[method]) {
      const originalMethod = cursor[method]
      cursor[method] = async function (...args) {
        // Do not try to apply asynchronous before hooks here because they act on the cursor which is already defined
        const result = await originalMethod.apply(this, args)

        // Apply after hooks (supports both sync and async)
        for (const hookEntry of hooks.after) {
          if (isAsyncFunction(hookEntry.fn)) {
            await hookEntry.fn.call(this, userId, selector, options, this)
          } else {
            hookEntry.fn.call(this, userId, selector, options, this)
          }
        }

        return result
      }
    }
  })

  return cursor
})
