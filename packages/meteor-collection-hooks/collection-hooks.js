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
  // TODO(v3): withValue returns a promise now
  directOp (func) {
    return this.directEnv.withValue(true, func)
  },
  hookedOp (func) {
    return this.directEnv.withValue(false, func)
  }
}

CollectionHooks.extendCollectionInstance = function extendCollectionInstance (
  self,
  constructor
) {
  // Offer a public API to allow the user to define hooks
  // Example: collection.before.insert(func);
  TIMING_TYPES.forEach(function (timing) {
    Object.entries(wrappers).forEach(function ([method, wrapper]) {
      if (method === 'upsert' && timing === 'after') return

      Meteor._ensure(self, timing, method)
      Meteor._ensure(self, '_hooks', method)

      self._hooks[method][timing] = []
      self[timing][method] = function (hook, options) {
        let target = {
          hook,
          options: CollectionHooks.initOptions(options, timing, method)
        }
        // adding is simply pushing it to the array
        self._hooks[method][timing].push(target)

        return {
          replace (hook, options) {
            // replacing is done by determining the actual index of a given target
            // and replace this with the new one
            const src = self._hooks[method][timing]
            const targetIndex = src.findIndex((entry) => entry === target)
            const newTarget = {
              hook,
              options: CollectionHooks.initOptions(options, timing, method)
            }
            src.splice(targetIndex, 1, newTarget)
            // update the target to get the correct index in future calls
            target = newTarget
          },
          remove () {
            // removing a hook is done by determining the actual index of a given target
            // and removing it form the source array
            const src = self._hooks[method][timing]
            const targetIndex = src.findIndex((entry) => entry === target)
            self._hooks[method][timing].splice(targetIndex, 1)
          }
        }
      }
    })
  })

  // Offer a publicly accessible object to allow the user to define
  // collection-wide hook options.
  // Example: collection.hookOptions.after.update = {fetchPrevious: false};
  self.hookOptions = EJSON.clone(CollectionHooks.defaults)

  // Wrap mutator methods, letting the defined wrapper do the work
  Object.entries(wrappers).forEach(function ([method, wrapper]) {
    // For client side, it wraps around minimongo LocalCollection
    // For server side, it wraps around mongo Collection._collection (i.e. driver directly)
    const collection =
      Meteor.isClient || method === 'upsert' ? self : self._collection

    // Store a reference to the original mutator method
    // const originalMethod = collection[method]

    Meteor._ensure(self, 'direct', method)
    self.direct[method] = function (...args) {
      return CollectionHooks.directOp(function () {
        return constructor.prototype[method].apply(self, args)
      })
    }

    const asyncMethod = method + 'Async'

    // TODO(v3): don't understand why this is necessary. Maybe related to Meteor 2.x and async?
    if (constructor.prototype[asyncMethod]) {
      self.direct[asyncMethod] = function (...args) {
        return CollectionHooks.directOp(function () {
          return constructor.prototype[asyncMethod].apply(self, args)
        })
      }
    }

    function getWrappedMethod (originalMethod) {
      return function wrappedMethod (...args) {
        // TODO(v2): not quite sure why originalMethod in the first updateAsync call points to LocalCollection's wrapped async method which
        // will then again call this wrapped method
        if (
          (method === 'update' && this.update.isCalledFromAsync) ||
          (method === 'remove' && this.remove.isCalledFromAsync) ||
          CollectionHooks.directEnv.get() === true
        ) {
          return originalMethod.apply(collection, args)
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
          self,
          method === 'upsert'
            ? {
                insert: self._hooks.insert || {},
                update: self._hooks.update || {},
                upsert: self._hooks.upsert || {}
              }
            : self._hooks[method] || {},
          function (doc) {
            return typeof self._transform === 'function'
              ? function (d) {
                return self._transform(d || doc)
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

    // TODO(v3): it appears this is necessary
    // In Meteor 2 *Async methods call the non-async methods
    if (ASYNC_METHODS.includes(method)) {
      const originalAsyncMethod = collection[asyncMethod]
      collection[asyncMethod] = getWrappedMethod(originalAsyncMethod)
    } else if (method === 'find') {
      // find is returning a cursor and is a sync method
      const originalMethod = collection[method]
      collection[method] = getWrappedMethod(originalMethod)
    }

    // Don't do this for v3 since we need to keep client methods sync.
    // With v3, it wraps the sync method with async resulting in errors.
    // collection[method] = getWrappedMethod(originalMethod)
  })
}

CollectionHooks.defineWrapper = (method, wrapper) => {
  wrappers[method] = wrapper
}

CollectionHooks.getWrapper = (method) => wrappers[method]

CollectionHooks.initOptions = (options, timing, method) =>
  CollectionHooks.extendOptions(
    CollectionHooks.defaults,
    options,
    timing,
    method
  )

CollectionHooks.extendOptions = (source, options, timing, method) => ({
  ...options,
  ...source.all.all,
  ...source[timing].all,
  ...source.all[method],
  ...source[timing][method]
})

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
  return (useDirect ? collection.direct : collection).find(
    selector,
    findOptions
  )
}

// This function normalizes the selector (converting it to an Object)
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

// This function contains a snippet of code pulled and modified from:
// ~/.meteor/packages/mongo-livedata/collection.js
// It's contained in these utility functions to make updates easier for us in
// case this code changes.
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
  // eslint-disable-next-line no-proto
  } else if (instance.__proto__) {
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
