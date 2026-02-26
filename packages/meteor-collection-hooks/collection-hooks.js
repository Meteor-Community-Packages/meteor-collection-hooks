import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { EJSON } from 'meteor/ejson'
import { LocalCollection } from 'meteor/minimongo'
import { CollectionExtensions } from 'meteor/lai:collection-extensions'

// Hooks terminology:
// Hook: User-defined function that runs before/after collection operations
// Wrapper: Code that knows when to call user-defined hooks
// Timing: before/after
const wrappers = {}

// Constants for method configurations
const ASYNC_METHODS = ['insert', 'update', 'upsert', 'remove', 'findOne']
const TIMING_TYPES = ['before', 'after']
const MONGODB_OPERATORS = [
  '$addToSet',
  '$bit',
  '$currentDate',
  '$inc',
  '$max',
  '$min',
  '$pop',
  '$pull',
  '$pullAll',
  '$push',
  '$rename',
  '$set',
  '$unset'
]

// Magic strings used throughout the codebase
const HOOKS_PROPERTY = '_hooks'
const DIRECT_PROPERTY = 'direct'
const ASYNC_CALL_FLAG = 'isCalledFromAsync'

export const CollectionHooks = {
  defaults: {
    before: {
      insert: {},
      update: {},
      remove: {},
      upsert: {},
      find: {},
      findOne: {},
      all: {}
    },
    after: {
      insert: {},
      update: {},
      remove: {},
      find: {},
      findOne: {},
      all: {}
    },
    all: { insert: {}, update: {}, remove: {}, find: {}, findOne: {}, all: {} }
  },
  directEnv: new Meteor.EnvironmentVariable(),
  /**
   * Execute a function while bypassing hooks (direct operation)
   * Note: In Meteor 3+, withValue may return a Promise if func is async
   */
  directOp (func) {
    return this.directEnv.withValue(true, func)
  },
  /**
   * Execute a function with hooks enabled (used to re-enable hooks after directOp)
   */
  hookedOp (func) {
    return this.directEnv.withValue(false, func)
  }
}

/**
 * Creates a hook controller object for managing individual hooks
 * @param {Array} hooksArray - The array containing hooks for this method/timing
 * @param {Object} initialTarget - The initial hook target object
 * @param {string} timing - The timing type ('before' or 'after')
 * @param {string} method - The method name ('insert', 'update', etc.)
 * @returns {Object} Controller with replace and remove methods
 */
function createHookController (hooksArray, initialTarget, timing, method) {
  let currentTarget = initialTarget

  return {
    replace (hook, options) {
      const targetIndex = hooksArray.findIndex((entry) => entry === currentTarget)
      if (targetIndex === -1) {
        throw new Error(`Hook not found in ${timing}.${method} hooks array`)
      }

      const newTarget = {
        fn: hook,
        options: CollectionHooks.initOptions(options, timing, method)
      }

      // Replace the target in the array
      hooksArray.splice(targetIndex, 1, newTarget)

      // Update our internal reference
      currentTarget = newTarget

      return this // Allow method chaining
    },

    remove () {
      const targetIndex = hooksArray.findIndex((entry) => entry === currentTarget)
      if (targetIndex === -1) {
        throw new Error(`Hook not found in ${timing}.${method} hooks array`)
      }

      hooksArray.splice(targetIndex, 1)

      // Mark as removed to prevent further operations
      currentTarget = null

      return true
    }
  }
}

/**
 * Sets up hook registration methods on collection instance
 * Creates methods like collection.before.insert() and collection.after.update()
 */
function setupHookRegistrationMethods (collection) {
  TIMING_TYPES.forEach(function (timing) {
    Object.entries(wrappers).forEach(function ([method, wrapper]) {
      if (method === 'upsert' && timing === 'after') return

      Meteor._ensure(collection, timing, method)
      Meteor._ensure(collection, HOOKS_PROPERTY, method)

      collection[HOOKS_PROPERTY][method][timing] = []
      collection[timing][method] = function (hook, options) {
        const target = {
          fn: hook,
          options: CollectionHooks.initOptions(options, timing, method)
        }

        const hooksArray = collection[HOOKS_PROPERTY][method][timing]
        hooksArray.push(target)

        // Use factory function instead of inline object
        return createHookController(hooksArray, target, timing, method)
      }
    })
  })
}

/**
 * Sets up hook options object on collection instance
 * Creates collection.hookOptions with default values
 */
function setupHookOptions (collection) {
  // Offer a publicly accessible object to allow the user to define
  // collection-wide hook options.
  // Example: collection.hookOptions.after.update = {fetchPrevious: false};
  collection.hookOptions = EJSON.clone(CollectionHooks.defaults)
}

/**
 * Sets up direct methods on collection instance
 * Creates methods like collection.direct.insert() that bypass hooks
 */
function setupDirectMethods (collection, constructor) {
  Object.entries(wrappers).forEach(function ([method, wrapper]) {
    Meteor._ensure(collection, DIRECT_PROPERTY, method)
    collection[DIRECT_PROPERTY][method] = function (...args) {
      return CollectionHooks.directOp(function () {
        return constructor.prototype[method].apply(collection, args)
      })
    }

    const asyncMethod = method + 'Async'

    // Meteor 3+ has separate async methods (insertAsync, updateAsync, etc.)
    // We need to wrap these too so collection.direct.insertAsync() bypasses hooks
    if (constructor.prototype[asyncMethod]) {
      collection[DIRECT_PROPERTY][asyncMethod] = function (...args) {
        return CollectionHooks.directOp(function () {
          return constructor.prototype[asyncMethod].apply(collection, args)
        })
      }
    }
  })
}

/**
 * Wraps collection methods with hook functionality
 * This intercepts method calls and ensures hooks are executed
 */
function wrapCollectionMethods (collection, constructor) {
  Object.entries(wrappers).forEach(function ([method, wrapper]) {
    // For client side, it wraps around minimongo LocalCollection
    // For server side, it wraps around mongo Collection._collection (i.e. driver directly)
    const targetCollection =
      Meteor.isClient || method === 'upsert' ? collection : collection._collection

    const asyncMethod = method + 'Async'

    /**
     * Determines if we should bypass hooks and call the original method directly
     * This happens when:
     * - Async methods are being called from their sync counterparts to avoid recursion
     * - Direct operations are explicitly requested via directEnv
     */
    function shouldBypassHooks (method, context) {
      return (method === 'update' && context.update[ASYNC_CALL_FLAG]) ||
             (method === 'remove' && context.remove[ASYNC_CALL_FLAG]) ||
             CollectionHooks.directEnv.get() === true
    }

    function getWrappedMethod (originalMethod) {
      return function wrappedMethod (...args) {
        // Prevent infinite recursion: In Meteor's architecture, async methods may
        // internally call their wrapped versions. The ASYNC_CALL_FLAG and directEnv
        // checks ensure we don't re-enter the hook wrapper when already processing.
        if (shouldBypassHooks(method, this)) {
          return originalMethod.apply(targetCollection, args)
        }

        // NOTE: should we decide to force `update` with `{upsert:true}` to use
        // the `upsert` hooks, this is what will accomplish it. It's important to
        // realize that Meteor won't distinguish between an `update` and an
        // `insert` though, so we'll end up with `after.update` getting called
        // even on an `insert`. That's why we've chosen to disable this for now.
        // if (method === "update" && Object(args[2]) === args[2] && args[2].upsert) {
        //   method = "upsert";
        //   wrapper = CollectionHooks.getWrapper(method);
        // }

        return wrapper.call(
          this,
          CollectionHooks.getUserId(),
          originalMethod,
          collection,
          method === 'upsert'
            ? {
                insert: collection[HOOKS_PROPERTY].insert || {},
                update: collection[HOOKS_PROPERTY].update || {},
                upsert: collection[HOOKS_PROPERTY].upsert || {}
              }
            : collection[HOOKS_PROPERTY][method] || {},
          function (doc) {
            return typeof collection._transform === 'function'
              ? function (d) {
                return collection._transform(d || doc)
              }
              : function (d) {
                return d || doc
              }
          },
          args,
          false
        )
      }
    }

    // Meteor 3+ architecture: Only wrap async methods for insert/update/remove/upsert/findOne
    // In Meteor 2.x, sync methods internally called async versions, but in Meteor 3+
    // we must only wrap the async methods to avoid breaking sync method behavior
    if (ASYNC_METHODS.includes(method)) {
      const originalAsyncMethod = targetCollection[asyncMethod]
      targetCollection[asyncMethod] = getWrappedMethod(originalAsyncMethod)
    } else if (method === 'find') {
      // find() is synchronous and returns a cursor - wrap it directly
      const originalMethod = targetCollection[method]
      targetCollection[method] = getWrappedMethod(originalMethod)
    }
    // Note: We intentionally don't wrap sync methods (insert, update, remove, etc.)
    // in Meteor 3+ as they have different semantics and wrapping them with async
    // code causes errors. Hooks only fire on async methods in Meteor 3+.
  })
}

/**
 * Extends a collection instance with hook functionality
 * This is called automatically for each new Mongo.Collection via lai:collection-extensions
 *
 * @param {Mongo.Collection} self - The collection instance to extend
 * @param {Function} constructor - The collection constructor (usually Mongo.Collection)
 */
CollectionHooks.extendCollectionInstance = function extendCollectionInstance (
  self,
  constructor
) {
  // Set up hook registration methods (before.insert, after.update, etc.)
  setupHookRegistrationMethods(self)

  // Set up hook options object
  setupHookOptions(self)

  // Set up direct methods that bypass hooks
  setupDirectMethods(self, constructor)

  // Wrap mutator methods with hook functionality
  wrapCollectionMethods(self, constructor)
}

/**
 * Registers a wrapper function for a collection method
 * Wrappers intercept collection operations and execute before/after hooks
 *
 * @param {string} method - The method name ('insert', 'update', 'remove', etc.)
 * @param {Function} wrapper - The wrapper function that handles hook execution
 */
CollectionHooks.defineWrapper = (method, wrapper) => {
  wrappers[method] = wrapper
}

/**
 * Gets the wrapper function for a collection method
 *
 * @param {string} method - The method name
 * @returns {Function} The wrapper function
 */
CollectionHooks.getWrapper = (method) => wrappers[method]

/**
 * Initializes hook options by merging with defaults
 *
 * @param {Object} options - User provided options
 * @param {string} timing - The timing type ('before' or 'after')
 * @param {string} method - The method name
 * @returns {Object} Merged options object
 */
CollectionHooks.initOptions = (options, timing, method) =>
  CollectionHooks.extendOptions(
    CollectionHooks.defaults,
    options,
    timing,
    method
  )

/**
 * Merges hook options with a clear precedence hierarchy
 *
 * Precedence order (highest to lowest priority):
 * 1. Method+timing specific (e.g., source.before.insert)
 * 2. Method-specific across all timings (e.g., source.all.insert)
 * 3. Timing-specific across all methods (e.g., source.before.all)
 * 4. Global defaults (source.all.all)
 * 5. User provided options (lowest priority - gets overridden)
 *
 * @param {Object} source - The source object containing default options
 * @param {Object} options - User provided options
 * @param {string} timing - The timing type ('before' or 'after')
 * @param {string} method - The method name ('insert', 'update', etc.)
 * @returns {Object} Merged options object
 */
CollectionHooks.extendOptions = (source, options, timing, method) => ({
  ...options, // 5. User options (lowest priority)
  ...source.all.all, // 4. Global defaults
  ...source[timing].all, // 3. Timing-specific defaults
  ...source.all[method], // 2. Method-specific defaults
  ...source[timing][method] // 1. Method+timing specific (highest priority)
})

/**
 * Fetches documents matching the selector for use in hooks
 * Used internally by update/remove/upsert hooks to get affected documents
 *
 * @param {Mongo.Collection} collection - The collection to query
 * @param {Object|string} selector - The MongoDB selector
 * @param {Object} options - Query options (multi, etc.)
 * @param {Object} fetchFields - Fields to fetch (projection)
 * @param {Object} config - Configuration options
 * @param {boolean} config.useDirect - If true, uses collection.direct to bypass hooks
 * @returns {Mongo.Cursor} A cursor for the matching documents
 */
CollectionHooks.getDocs = function getDocs (
  collection,
  selector,
  options,
  fetchFields = {},
  { useDirect = false } = {}
) {
  const findOptions = { transform: null, reactive: false }

  if (Object.keys(fetchFields).length > 0) {
    findOptions.fields = fetchFields
  }

  /*
  // No "fetch" support at this time.
  if (!this._validators.fetchAllFields) {
    findOptions.fields = {};
    this._validators.fetch.forEach(function(fieldName) {
      findOptions.fields[fieldName] = 1;
    });
  }
  */

  // Bit of a magic condition here... only "update" passes options, so this is
  // only relevant to when update calls getDocs:
  if (options) {
    // This was added because in our case, we are potentially iterating over
    // multiple docs. If multi isn't enabled, force a limit (almost like
    // findOne), as the default for update without multi enabled is to affect
    // only the first matched document:
    if (!options.multi) {
      findOptions.limit = 1
    }
    const { multi, upsert, ...rest } = options
    Object.assign(findOptions, rest)
  }

  // Unlike validators, we iterate over multiple docs, so use
  // find instead of findOne:
  return (useDirect ? collection[DIRECT_PROPERTY] : collection).find(
    selector,
    findOptions
  )
}

/**
 * Normalizes a selector to always be an object
 * Converts string IDs and Mongo.ObjectID to { _id: value } format
 *
 * @param {Object|string|Mongo.ObjectID} selector - The selector to normalize
 * @returns {Object} The normalized selector object
 */
CollectionHooks.normalizeSelector = function (selector) {
  if (
    typeof selector === 'string' ||
    (selector && selector.constructor === Mongo.ObjectID)
  ) {
    return {
      _id: selector
    }
  } else {
    return selector
  }
}

/**
 * Extracts the list of fields being modified by an update mutator
 * Handles both MongoDB operators ($set, $inc, etc.) and replacement documents
 *
 * Based on code from meteor/mongo-livedata/collection.js
 *
 * @param {Object} mutator - The update mutator object
 * @returns {string[]} Array of top-level field names being modified
 */
CollectionHooks.getFields = function getFields (mutator) {
  // compute modified fields
  const fields = []
  // ====ADDED START=======================
  const operators = MONGODB_OPERATORS
  // ====ADDED END=========================

  Object.entries(mutator).forEach(function ([op, params]) {
    // ====ADDED START=======================
    if (operators.includes(op)) {
      // ====ADDED END=========================
      Object.keys(params).forEach(function (field) {
        // treat dotted fields as if they are replacing their
        // top-level part
        if (field.indexOf('.') !== -1) {
          field = field.substring(0, field.indexOf('.'))
        }

        // record the field we are trying to change
        if (!fields.includes(field)) {
          fields.push(field)
        }
      })
      // ====ADDED START=======================
    } else {
      fields.push(op)
    }
    // ====ADDED END=========================
  })

  return fields
}

/**
 * Reassigns the prototype of a collection instance
 * Used for custom collection classes that need hook functionality
 *
 * @param {Object} instance - The collection instance
 * @param {Function} [constr=Mongo.Collection] - The constructor whose prototype to use
 */
CollectionHooks.reassignPrototype = function reassignPrototype (
  instance,
  constr
) {
  const hasSetPrototypeOf = typeof Object.setPrototypeOf === 'function'
  constr = constr || Mongo.Collection

  // __proto__ is not available in < IE11
  // Note: Assigning a prototype dynamically has performance implications
  if (hasSetPrototypeOf) {
    Object.setPrototypeOf(instance, constr.prototype)
  } else if (instance.__proto__) { // eslint-disable-line no-proto
    instance.__proto__ = constr.prototype // eslint-disable-line no-proto
  }
}

// Use lai:collection-extensions for clean collection constructor extension
CollectionExtensions.addExtension(function (collection, options) {
  // This function is called whenever new Mongo.Collection() is created
  // 'collection' is the collection instance (passed as first parameter)
  // 'options' are the options passed to the constructor

  // Skip extension if collection instance is null (can happen with special collections)
  if (!collection) {
    return
  }

  CollectionHooks.extendCollectionInstance(collection, Mongo.Collection)
})

CollectionHooks.modify = LocalCollection._modify
