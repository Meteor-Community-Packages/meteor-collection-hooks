// Relevant AOP terminology:
// Aspect: User code that runs before/after (hook)
// Advice: Wrapper code that knows when to call user code (aspects)
// Pointcut: before/after

var advices = {};
var Tracker = Package.tracker && Package.tracker.Tracker || Package.deps.Deps;
var publishUserId = Meteor.isServer && new Meteor.EnvironmentVariable();

var directEnv = new Meteor.EnvironmentVariable();
var directOp = function (func) {
  return directEnv.withValue(true, func);
};

CollectionHooks = {
  defaults: {
    before: { insert: {}, update: {}, remove: {}, find: {}, findOne: {}, all: {}},
    after: { insert: {}, update: {}, remove: {}, find: {}, findOne: {}, all: {}},
    all: { insert: {}, update: {}, remove: {}, find: {}, findOne: {}, all: {}}
  }
};

CollectionHooks.getUserId = function () {
  var userId;

  if (Meteor.isClient) {
    Tracker.nonreactive(function () {
      userId = Meteor.userId && Meteor.userId();
    });
  }

  if (Meteor.isServer) {
    try {
      // Will throw an error unless within method call.
      // Attempt to recover gracefully by catching:
      userId = Meteor.userId && Meteor.userId();
    } catch (e) {}

    if (!userId) {
      // Get the userId if we are in a publish function.
      userId = publishUserId.get();
    }
  }

  return userId;
};

CollectionHooks.extendCollectionInstance = function (self, constructor) {
  var collection = Meteor.isClient ? self : self._collection;

  // Offer a public API to allow the user to define aspects
  // Example: collection.before.insert(func);
  _.each(["before", "after"], function (pointcut) {
    _.each(advices, function (advice, method) {
      Meteor._ensure(self, pointcut, method);
      Meteor._ensure(self, "_hookAspects", method);

      self._hookAspects[method][pointcut] = [];
      self[pointcut][method] = function (aspect, options) {
        var len = self._hookAspects[method][pointcut].push({
          aspect: aspect,
          options: CollectionHooks.initOptions(options, pointcut, method)
        });

        return {
          replace: function (aspect, options) {
            self._hookAspects[method][pointcut].splice(len - 1, 1, {
              aspect: aspect,
              options: CollectionHooks.initOptions(options, pointcut, method)
            });
          },
          remove: function () {
            self._hookAspects[method][pointcut].splice(len - 1, 1);
          }
        };
      };
    });
  });

  // Offer a publicly accessible object to allow the user to define
  // collection-wide hook options.
  // Example: collection.hookOptions.after.update = {fetchPrevious: false};
  self.hookOptions = EJSON.clone(CollectionHooks.defaults);

  // Wrap mutator methods, letting the defined advice do the work
  _.each(advices, function (advice, method) {
    // Store a reference to the mutator method in a publicly reachable location
    var _super = collection[method];

    Meteor._ensure(self, "direct", method);
    self.direct[method] = function () {
      var args = arguments;
      return directOp(function () {
        return constructor.prototype[method].apply(self, args);
      });
    };

    collection[method] = function () {
      if (directEnv.get() === true) {
        return _super.apply(collection, arguments);
      }

      return advice.call(this,
        CollectionHooks.getUserId(),
        _super,
        self,
        self._hookAspects[method] || {},
        function (doc) {
          return  _.isFunction(self._transform)
                  ? function (d) { return self._transform(d || doc); }
                  : function (d) { return d || doc; };
        },
        _.toArray(arguments),
        false
      );
    };
  });
};

CollectionHooks.defineAdvice = function (method, advice) {
  advices[method] = advice;
};

CollectionHooks.initOptions = function (options, pointcut, method) {
  return CollectionHooks.extendOptions(CollectionHooks.defaults, options, pointcut, method);
};

CollectionHooks.extendOptions = function (source, options, pointcut, method) {
  options = _.extend(options || {}, source.all.all);
  options = _.extend(options, source[pointcut].all);
  options = _.extend(options, source.all[method]);
  options = _.extend(options, source[pointcut][method]);
  return options;
};

CollectionHooks.getDocs = function (collection, selector, options) {
  var self = this;

  var findOptions = {transform: null, reactive: false}; // added reactive: false

  /*
  // No "fetch" support at this time.
  if (!self._validators.fetchAllFields) {
    findOptions.fields = {};
    _.each(self._validators.fetch, function(fieldName) {
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
      findOptions.limit = 1;
    }
  }

  // Unlike validators, we iterate over multiple docs, so use
  // find instead of findOne:
  return collection.find(selector, findOptions);
};

CollectionHooks.reassignPrototype = function (instance, constr) {
  var hasSetPrototypeOf = typeof Object.setPrototypeOf === "function";

  if (!constr) constr = typeof Mongo !== "undefined" ? Mongo.Collection : Meteor.Collection;

  // __proto__ is not available in < IE11
  // Note: Assigning a prototype dynamically has performance implications
  if (hasSetPrototypeOf) {
    Object.setPrototypeOf(instance, constr.prototype);
  } else if (instance.__proto__) {
    instance.__proto__ = constr.prototype;
  }
};

CollectionHooks.wrapCollection = function (ns, as) {
  if (!as._CollectionConstructor) as._CollectionConstructor = as.Collection;
  if (!as._CollectionPrototype) as._CollectionPrototype = new as.Collection(null);

  var constructor = as._CollectionConstructor;
  var proto = as._CollectionPrototype;

  ns.Collection = function () {
    var ret = constructor.apply(this, arguments);
    CollectionHooks.extendCollectionInstance(this, constructor);
    return ret;
  };

  ns.Collection.prototype = proto;

  for (var prop in constructor) {
    if (constructor.hasOwnProperty(prop)) {
      ns.Collection[prop] = constructor[prop];
    }
  }
};

if (typeof Mongo !== "undefined") {
  CollectionHooks.wrapCollection(Meteor, Mongo);
  CollectionHooks.wrapCollection(Mongo, Mongo);
} else {
  CollectionHooks.wrapCollection(Meteor, Meteor);
}

if (Meteor.isServer) {
  var _publish = Meteor.publish;
  Meteor.publish = function (name, func) {
    return _publish.call(this, name, function () {
      // This function is called repeatedly in publications
      var ctx = this, args = arguments;
      return publishUserId.withValue(ctx && ctx.userId, function () {
        return func.apply(ctx, args);
      });
    });
  };

  // Make the above available for packages with hooks that want to determine
  // whether they are running inside a publish function or not.
  CollectionHooks.isWithinPublish = function () {
    return publishUserId.get() !== undefined;
  };
}