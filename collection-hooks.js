import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { EJSON } from 'meteor/ejson'
import { LocalCollection } from 'meteor/minimongo'

// Relevant AOP terminology:
// Aspect: User code that runs before/after (hook)
// Advice: Wrapper code that knows when to call user code (aspects)
// Pointcut: before/after
const advices = {}

export const CollectionHooks = {
  defaults: {
    before: { insert: {}, update: {}, remove: {}, upsert: {}, find: {}, findOne: {}, all: {} },
    after: { insert: {}, update: {}, remove: {}, find: {}, findOne: {}, all: {} },
    all: { insert: {}, update: {}, remove: {}, find: {}, findOne: {}, all: {} }
  },
  directEnv: new Meteor.EnvironmentVariable(),
  directOp (func) {
    return this.directEnv.withValue(true, func)
  },
  hookedOp (func) {
    return this.directEnv.withValue(false, func)
  }
}

CollectionHooks.extendCollectionInstance = function extendCollectionInstance (self, constructor) {
  // Offer a public API to allow the user to define aspects
  // Example: collection.before.insert(func);
  ['before', 'after'].forEach(function (pointcut) {
    Object.entries(advices).forEach(function ([method, advice]) {
      if (advice === 'upsert' && pointcut === 'after') return

      Meteor._ensure(self, pointcut, method)
      Meteor._ensure(self, '_hookAspects', method)

      self._hookAspects[method][pointcut] = []
      self[pointcut][method] = function (aspect, options) {
        const len = self._hookAspects[method][pointcut].push({
          aspect,
          options: CollectionHooks.initOptions(options, pointcut, method)
        })

        return {
          replace (aspect, options) {
            self._hookAspects[method][pointcut].splice(len - 1, 1, {
              aspect,
              options: CollectionHooks.initOptions(options, pointcut, method)
            })
          },
          remove () {
            self._hookAspects[method][pointcut].splice(len - 1, 1)
          }
        }
      }
    })
  })

  // Offer a publicly accessible object to allow the user to define
  // collection-wide hook options.
  // Example: collection.hookOptions.after.update = {fetchPrevious: false};
  self.hookOptions = EJSON.clone(CollectionHooks.defaults)

  // Wrap mutator methods, letting the defined advice do the work
  Object.entries(advices).forEach(function ([method, advice]) {
    const collection = Meteor.isClient || method === 'upsert' ? self : self._collection

    // Store a reference to the original mutator method
    const _super = collection[method]

    Meteor._ensure(self, 'direct', method)
    self.direct[method] = function (...args) {
      return CollectionHooks.directOp(function () {
        return constructor.prototype[method].apply(self, args)
      })
    }

    collection[method] = function (...args) {
      if (CollectionHooks.directEnv.get() === true) {
        return _super.apply(collection, args)
      }

      // NOTE: should we decide to force `update` with `{upsert:true}` to use
      // the `upsert` hooks, this is what will accomplish it. It's important to
      // realize that Meteor won't distinguish between an `update` and an
      // `insert` though, so we'll end up with `after.update` getting called
      // even on an `insert`. That's why we've chosen to disable this for now.
      // if (method === "update" && Object(args[2]) === args[2] && args[2].upsert) {
      //   method = "upsert";
      //   advice = CollectionHooks.getAdvice(method);
      // }

      return advice.call(this,
        CollectionHooks.getUserId(),
        _super,
        self,
        method === 'upsert' ? {
          insert: self._hookAspects.insert || {},
          update: self._hookAspects.update || {},
          upsert: self._hookAspects.upsert || {}
        } : self._hookAspects[method] || {},
        function (doc) {
          return (
            typeof self._transform === 'function'
              ? function (d) { return self._transform(d || doc) }
              : function (d) { return d || doc }
          )
        },
        args,
        false
      )
    }
  })
}

CollectionHooks.defineAdvice = (method, advice) => {
  advices[method] = advice
}

CollectionHooks.getAdvice = method => advices[method]

CollectionHooks.initOptions = (options, pointcut, method) =>
  CollectionHooks.extendOptions(CollectionHooks.defaults, options, pointcut, method)

CollectionHooks.extendOptions = (source, options, pointcut, method) =>
  ({ ...options, ...source.all.all, ...source[pointcut].all, ...source.all[method], ...source[pointcut][method] })

CollectionHooks.getDocs = function getDocs (collection, selector, options) {
  const findOptions = { transform: null, reactive: false } // added reactive: false

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
  return collection.find(selector, findOptions)
}

// This function normalizes the selector (converting it to an Object)
CollectionHooks.normalizeSelector = function (selector) {
  if (typeof selector === 'string' || (selector && selector.constructor === Mongo.ObjectID)) {
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
  const operators = [
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

CollectionHooks.reassignPrototype = function reassignPrototype (instance, constr) {
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

CollectionHooks.wrapCollection = function wrapCollection (ns, as) {
  if (!as._CollectionConstructor) as._CollectionConstructor = as.Collection
  if (!as._CollectionPrototype) as._CollectionPrototype = new as.Collection(null)

  const constructor = ns._NewCollectionContructor || as._CollectionConstructor
  const proto = as._CollectionPrototype

  ns.Collection = function (...args) {
    const ret = constructor.apply(this, args)
    CollectionHooks.extendCollectionInstance(this, constructor)
    return ret
  }
  // Retain a reference to the new constructor to allow further wrapping.
  ns._NewCollectionContructor = ns.Collection

  ns.Collection.prototype = proto
  ns.Collection.prototype.constructor = ns.Collection

  for (const prop of Object.keys(constructor)) {
    ns.Collection[prop] = constructor[prop]
  }

  // Meteor overrides the apply method which is copied from the constructor in the loop above. Replace it with the
  // default method which we need if we were to further wrap ns.Collection.
  ns.Collection.apply = Function.prototype.apply
}

CollectionHooks.modify = LocalCollection._modify

if (typeof Mongo !== 'undefined') {
  CollectionHooks.wrapCollection(Meteor, Mongo)
  CollectionHooks.wrapCollection(Mongo, Mongo)
} else {
  CollectionHooks.wrapCollection(Meteor, Meteor)
}
