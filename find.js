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
  // const ctx = { context: this, _super, args }
  const selector = CollectionHooks.normalizeSelector(instance._getFindSelector(args))
  const options = instance._getFindOptions(args)

  const cursor = _super.call(this, selector, options)

  // Wrap async cursor methods
  ASYNC_METHODS.forEach((method) => {
    if (cursor[method]) {
      const originalMethod = cursor[method];
      cursor[method] = async function (...args) {
        let abort = false;
        for (const hook of hooks.before) {
          const result = await hook.hook.call(this, userId, selector, options);
          if (result === false) {
            abort = true;
          }
        }

        // Modify the existing cursor instead of creating a new one
        this.selector = abort ? undefined : selector;
        this.options = options;

        const result = await originalMethod.apply(this, args);

        for (const hook of hooks.after) {
          await hook.hook.call(this, userId, selector, options, this);
        }

        return result;
      };
    }
  })

  return cursor
})
