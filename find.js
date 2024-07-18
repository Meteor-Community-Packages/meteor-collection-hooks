import { CollectionHooks } from './collection-hooks'

const ASYNC_METHODS = ['countAsync', 'fetchAsync', 'forEachAsync', 'mapAsync']

/**
 * With Meteor v3 this behaves differently than with Meteor v2.
 * We cannot use async hooks on find() directly because in Meteor it is a sync method that returns cursor instance.
 *
 * That's why we need to wrap all async methods of cursor instance. We're doing this by creating another cursor
 * within these wrapped methods with selector and options updated by before hooks.
 */
CollectionHooks.defineAdvice('find', function (userId, _super, instance, aspects, getTransform, args, suppressAspects) {
  // const ctx = { context: this, _super, args }
  const selector = CollectionHooks.normalizeSelector(instance._getFindSelector(args))
  const options = instance._getFindOptions(args)

  const cursor = _super.call(this, selector, options)

  // Wrap async cursor methods
  ASYNC_METHODS.forEach((method) => {
    if (cursor[method]) {
      cursor[method] = async (...args) => {
        let abort = false
        for (const aspect of aspects.before) {
          const result = await aspect.aspect.call(this, userId, selector, options)
          if (result === false) {
            abort = true
          }
        }

        // Take #1 - monkey patch existing cursor
        // Now that before hooks have run, update the cursor selector & options
        // Special case for "undefined" selector, which means none of the documents
        // This is a full c/p from Meteor's  minimongo/cursor.js, it probably doesn't make too much sense and is too
        // error-prone to maintain as each Meteor change would require

        // cursor.sorter = null
        // cursor.matcher = new Minimongo.Matcher(Mongo.Collection._rewriteSelector(abort ? undefined : selector))
        // if (Minimongo.LocalCollection._selectorIsIdPerhapsAsObject(selector)) {
        //   // eslint-disable-next-line no-prototype-builtins
        //   cursor._selectorId = Object.prototype.hasOwnProperty(selector, '_id') ? selector._id : selector
        // } else {
        //   cursor._selectorId = undefined
        //   if (cursor.matcher.hasGeoQuery() || options.sort) {
        //     cursor.sorter = new Minimongo.Sorter(options.sort || [])
        //   }
        // }
        // cursor.skip = options.skip || 0
        // cursor.limit = options.limit
        // cursor.fields = options.projection || options.fields
        // cursor._projectionFn = Minimongo.LocalCollection._compileProjection(cursor.fields || {})
        // cursor._transform = Minimongo.LocalCollection.wrapTransform(options.transform)
        // if (typeof Tracker !== 'undefined') {
        //   cursor.reactive = options.reactive === undefined ? true : options.reactive
        // }

        // Take #2 - create new cursor
        const newCursor = _super.call(this, abort ? undefined : selector, options)

        const result = await newCursor[method](...args)

        for (const aspect of aspects.after) {
          await aspect.aspect.call(this, userId, selector, options, cursor)
        }

        return result
      }
    }
  })

  return cursor
})
