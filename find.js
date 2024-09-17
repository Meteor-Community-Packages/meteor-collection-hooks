import { CollectionHooks } from './collection-hooks'

const ASYNC_METHODS = ['countAsync', 'fetchAsync', 'forEachAsync', 'mapAsync']

/**
 * With Meteor v3 this behaves differently than with Meteor v2.
 * We cannot use async hooks on find() directly because in Meteor it is a sync method that returns cursor instance.
 *
 * That's why we need to wrap all async methods of cursor instance. We're doing this by creating another cursor
 * within these wrapped methods with selector and options updated by before hooks.
 */
CollectionHooks.defineWrapper('find', function (userId, _super, instance, hooks, getTransform, args, suppressHooks) {
  const selector = CollectionHooks.normalizeSelector(instance._getFindSelector(args))
  const options = instance._getFindOptions(args)

  // Apply synchronous before hooks
  hooks.before.forEach(hook => {
    if (!hook.hook.constructor.name.includes('Async')) {
      hook.hook.call(this, userId, selector, options)
    }
  })

  const cursor = _super.call(this, selector, options)

  // Wrap async cursor methods
  ASYNC_METHODS.forEach((method) => {
    if (cursor[method]) {
      const originalMethod = cursor[method]
      cursor[method] = async function (...args) {
        // Apply asynchronous before hooks
        for (const hook of hooks.before) {
          if (hook.hook.constructor.name.includes('Async')) {
            await hook.hook.call(this, userId, selector, options)
          }
        }

        const result = await originalMethod.apply(this, args)

        // Apply after hooks
        for (const hook of hooks.after) {
          if (hook.hook.constructor.name.includes('Async')) {
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