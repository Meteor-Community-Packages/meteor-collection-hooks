import { Tracker } from 'meteor/tracker'
import { CollectionHooks } from './collection-hooks'

/**
 * FindOne hook wrapper for collection.findOneAsync() operations.
 *
 * Tracker Reactivity Support (Fix for GitHub Issue #323)
 * -------------------------------------------------------
 * This wrapper preserves Meteor Tracker reactivity by capturing the current
 * computation before any await and using Tracker.withComputation() to maintain
 * the reactive context when calling the original method.
 *
 * Without this fix, code like this would lose reactivity:
 *   Tracker.autorun(() => {
 *     const user = Meteor.users.findOne(userId); // Would not re-run on changes
 *   });
 *
 * The fix ensures that the original findOne call is wrapped with the captured
 * computation, allowing Tracker to properly track dependencies.
 */
CollectionHooks.defineWrapper('findOne', async function (userId, originalMethod, instance, hooks, getTransform, args, suppressHooks) {
  const ctx = { context: this, originalMethod, args }
  const selector = CollectionHooks.normalizeSelector(instance._getFindSelector(args))
  const options = instance._getFindOptions(args)
  let abort

  // Capture the current Tracker computation BEFORE any await
  // This is essential for preserving reactivity in Meteor 3+
  // On the server, Tracker.currentComputation is always null, so this is a no-op
  const computation = Tracker.currentComputation

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

  // Use Tracker.withComputation to preserve reactivity if we're in a reactive context
  // This ensures that findOne calls inside Tracker.autorun properly track dependencies
  let ret
  if (computation) {
    ret = await Tracker.withComputation(computation, () =>
      originalMethod.call(this, selector, options)
    )
  } else {
    ret = await originalMethod.call(this, selector, options)
  }

  await after(ret)
  return ret
})
