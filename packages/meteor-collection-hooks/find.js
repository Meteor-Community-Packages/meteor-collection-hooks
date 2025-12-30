import { CollectionHooks } from './collection-hooks'

const ASYNC_METHODS = ['countAsync', 'fetchAsync', 'forEachAsync', 'mapAsync']

/**
 * Checks if a function is an async function
 * @param {Function} fn - The function to check
 * @returns {boolean} True if the function is async
 */
const isAsyncFunction = (fn) => fn?.constructor?.name === 'AsyncFunction'

/**
 * With Meteor v3 this behaves differently than with Meteor v2.
 * We cannot use async hooks on find() directly because in Meteor it is a sync method that returns cursor instance.
 *
 * That's why we need to wrap all async methods of cursor instance. We're doing this by creating another cursor
 * within these wrapped methods with selector and options updated by before hooks.
 */
CollectionHooks.defineWrapper('find', function (userId, originalMethod, instance, hooks, getTransform, args, suppressHooks) {
  const selector = CollectionHooks.normalizeSelector(instance._getFindSelector(args))
  const options = instance._getFindOptions(args)

  // Apply synchronous before hooks (async before.find hooks are not allowed)
  hooks.before.forEach(hook => {
    if (isAsyncFunction(hook.hook)) {
      throw new Error('Cannot use async function as before.find hook')
    }
    hook.hook.call(this, userId, selector, options)
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
        for (const hook of hooks.after) {
          if (isAsyncFunction(hook.hook)) {
            await hook.hook.call(this, userId, selector, options, this)
          } else {
            hook.hook.call(this, userId, selector, options, this)
          }
        }

        return result
      }
    }
  })

  return cursor
})
