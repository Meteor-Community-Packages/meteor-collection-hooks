// Relevant AOP terminology:
// Aspect: User code that runs before/after (hook)
// Advice: Wrapper code that knows when to call user code (aspects)
// Pointcut: before/after

var advices = {};
var currentUserId;
var constructor = Meteor.Collection;
var proto = new Meteor.Collection(null);
var directEnv = new Meteor.EnvironmentVariable();
var directOp = function (func) {
  return directEnv.withValue(true, func);
};

function getUserId() {
  var userId;

  if (Meteor.isClient) {
    Deps.nonreactive(function () {
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
        userId = currentUserId;
    }
  }

  return userId;
}

CollectionHooks = {
  defaults: {
    before: { insert: {}, update: {}, remove: {}, find: {}, findOne: {}, all: {}},
    after: { insert: {}, update: {}, remove: {}, find: {}, findOne: {}, all: {}},
    all: { insert: {}, update: {}, remove: {}, find: {}, findOne: {}, all: {}}
  }
};

CollectionHooks.extendCollectionInstance = function (self) {
  // Offer a public API to allow the user to define aspects
  // Example: collection.before.insert(func);
  _.each(["before", "after"], function (pointcut) {
    _.each(advices, function (advice, method) {
      Meteor._ensure(self, pointcut, method);
      Meteor._ensure(self, "_aspects", method);

      self._aspects[method][pointcut] = [];
      self[pointcut][method] = function (aspect, options) {
        var len = self._aspects[method][pointcut].push({
          aspect: aspect,
          options: CollectionHooks.mergeOptions(options, pointcut, method)
        });

        return {
          replace: function (aspect, options) {
            self._aspects[method][pointcut].splice(len - 1, 1, {
              aspect: aspect,
              options: CollectionHooks.mergeOptions(options, pointcut, method)
            });
          },
          remove: function () {
            self._aspects[method][pointcut].splice(len - 1, 1);
          }
        };
      };
    });
  });

  // Wrap mutator methods, letting the defined advice do the work
  _.each(advices, function (advice, method) {
    // Store a reference to the mutator method in a publicly reachable location
    var _super = Meteor.isClient ? self[method] : self._collection[method];

    Meteor._ensure(self, "direct", method);
    self.direct[method] = function () {
      if (directEnv.get() === true) return;
      return directOp(function () {
        return _super.bind(Meteor.isClient ? self : self._collection);
      });
    };

    (Meteor.isClient ? self : self._collection)[method] = function () {
      return advice.call(this,
        getUserId(),
        _super,
        self._aspects[method] || {},
        function (doc) {
          return  _.isFunction(self._transform)
                  ? function (d) { return self._transform(d || doc); }
                  : function (d) { return d || doc; };
        },
        _.toArray(arguments)
      );
    };
  });
};

CollectionHooks.defineAdvice = function (method, advice) {
  advices[method] = advice;
};

CollectionHooks.mergeOptions = function (options, pointcut, method) {
  options = _.extend(options || {}, CollectionHooks.defaults.all.all);
  options = _.extend(options, CollectionHooks.defaults[pointcut].all);
  options = _.extend(options, CollectionHooks.defaults.all[method]);
  options = _.extend(options, CollectionHooks.defaults[pointcut][method]);
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

  if (!constr) constr = Meteor.Collection;

  // __proto__ is not available in < IE11
  // Note: Assigning a prototype dynamically has performance implications
  if (hasSetPrototypeOf) {
    Object.setPrototypeOf(instance, constr.prototype);
  } else if (instance.__proto__) {
    instance.__proto__ = constr.prototype;
  }
};

Meteor.Collection = function () {
  var ret = constructor.apply(this, arguments);
  CollectionHooks.extendCollectionInstance(this);
  return ret;
};

Meteor.Collection.prototype = proto;

for (var prop in constructor) {
  if (constructor.hasOwnProperty(prop)) {
    Meteor.Collection[prop] = constructor[prop];
  }
}

if (Meteor.isServer) {
  var _publish = Meteor.publish;
  Meteor.publish = function (name, func) {
    return _publish.call(this, name, function () {
      currentUserId = this && this.userId;
      var ret = func.apply(this, arguments);
      currentUserId = undefined;
      return ret;
    });
  };
}