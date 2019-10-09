import { CollectionHooks } from './collection-hooks'

CollectionHooks.defineAdvice('find', function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  const ctx = { context: this, _super, args }
  const selector = CollectionHooks.normalizeSelector(instance._getFindSelector(args))
  const options = instance._getFindOptions(args)
  let abort
  // before
  if (!suppressAspects) {
    aspects.before.forEach((o) => {
      const r = o.aspect.call(ctx, userId, selector, options)
      if (r === false) abort = true
    })

    if (abort) return instance.find(undefined)
  }

  const after = (cursor) => {
    if (!suppressAspects) {
      aspects.after.forEach((o) => {
        o.aspect.call(ctx, userId, selector, options, cursor)
      })
    }
  }

  const ret = _super.call(this, selector, options)
  after(ret)

  return ret
})
