import { CollectionHooks } from './collection-hooks'

CollectionHooks.defineAdvice('findOne', async function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  const ctx = { context: this, _super, args }
  const selector = CollectionHooks.normalizeSelector(instance._getFindSelector(args))
  const options = instance._getFindOptions(args)
  let abort

  // before
  if (!suppressAspects) {
    for (const o of aspects.before) {
      const r = await o.aspect.call(ctx, userId, selector, options)
      if (r === false) {
        abort = true
        break
      }
    }

    if (abort) return
  }

  async function after (doc) {
    if (!suppressAspects) {
      for (const o of aspects.after) {
        await o.aspect.call(ctx, userId, selector, options, doc)
      }
    }
  }

  const ret = await _super.call(this, selector, options)
  await after(ret)
  return ret
})
