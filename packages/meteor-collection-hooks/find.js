import { CollectionHooks } from './collection-hooks'

const ASYNC_METHODS = ['countAsync', 'fetchAsync', 'forEachAsync', 'mapAsync']

/**
 * With Meteor v3 this behaves differently than with Meteor v2.
 * We cannot use async hooks on find() directly because in Meteor it is a sync method that returns cursor instance.
 *
 * Modified to preserve v2 behavior: after.find hooks fire immediately when find() is called,
 * while also maintaining async method wrapping for backward compatibility.
 */
CollectionHooks.defineWrapper('find', function (userId, _super, instance, hooks, getTransform, args, suppressHooks) {
  const selector = CollectionHooks.normalizeSelector(instance._getFindSelector(args))
  const options = instance._getFindOptions(args)

  // Apply synchronous before hooks
  hooks.before.forEach(hook => {
    if (!hook.hook.constructor.name.includes('Async')) {
      hook.hook.call(this, userId, selector, options)
    } else {
      throw new Error('Cannot use async function as before.find hook')
    }
  })

  const cursor = _super.call(this, selector, options)

  // PRESERVE V2 BEHAVIOR: Apply synchronous after hooks immediately
  hooks.after.forEach(hook => {
    if (!hook.hook.constructor.name.includes('Async')) {
      hook.hook.call(this, userId, selector, options, cursor)
    }
  })

  // Track which hooks have been called to avoid double execution
  const immediateHooksExecuted = new Set()
  hooks.after.forEach((hook, index) => {
    if (!hook.hook.constructor.name.includes('Async')) {
      immediateHooksExecuted.add(index)
    }
  })

  // Wrap async cursor methods (for backward compatibility and async hooks)
  ASYNC_METHODS.forEach((method) => {
    if (cursor[method]) {
      const originalMethod = cursor[method]
      cursor[method] = async function (...args) {
        // Do not try to apply asynchronous before hooks here because they act on the cursor which is already defined
        const result = await originalMethod.apply(this, args)

        // Apply after hooks (skip already executed synchronous hooks)
        for (const [index, hook] of hooks.after.entries()) {
          if (hook.hook.constructor.name.includes('Async')) {
            await hook.hook.call(this, userId, selector, options, this)
          } else if (!immediateHooksExecuted.has(index)) {
            // Only call sync hooks that weren't already executed immediately
            hook.hook.call(this, userId, selector, options, this)
          }
        }

        return result
      }
    }
  })

  return cursor
})
