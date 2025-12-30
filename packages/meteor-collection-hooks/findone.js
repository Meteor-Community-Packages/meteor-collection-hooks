import { CollectionHooks } from './collection-hooks'

CollectionHooks.defineWrapper('findOne', async function (userId, originalMethod, instance, hooks, getTransform, args, suppressHooks) {
  const ctx = { context: this, originalMethod, args }
  const selector = CollectionHooks.normalizeSelector(instance._getFindSelector(args))
  const options = instance._getFindOptions(args)
  let abort
  // before
  if (!suppressHooks) {
    for (const hookEntry of hooks.before) {
      const r = await hookEntry.fn.call(ctx, userId, selector, options)
      if (r === false) {
        abort = true
        break
      }
    }

    if (abort) return
  }

  async function after (doc) {
    if (!suppressHooks) {
      for (const hookEntry of hooks.after) {
        await hookEntry.fn.call(ctx, userId, selector, options, doc)
      }
    }
  }

  const ret = await originalMethod.call(this, selector, options)
  await after(ret)
  return ret
})
