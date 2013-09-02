// Relevant AOP terminology:
// Aspect: User code that runs before/after (hook)
// Advice: Wrapper code that knows when to calls user code (aspects)
// Pointcut: before/after

var advices = {};
var constructor = Meteor.Collection;

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

    // TODO: figure out if this is safe to re-implement
    //if (!userId) {
    //    userId = Meteor.__collection_hooks_publish_userId;
    //}
  }

  return userId;
}

CollectionHooks = {};

Meteor.Collection = function () {
  var self = this;
  var ret = constructor.apply(self, arguments);

  // Offer a public API to allow the user to define aspects
  // Example: collection.before.insert(func);
  _.each(["before", "after"], function (pointcut) {
    _.each(advices, function (advice, method) {
      Meteor._ensure(self, pointcut, method);
      Meteor._ensure(self, "_aspects", method);

      self._aspects[method][pointcut] = [];
      self[pointcut][method] = function (aspect) {
        self._aspects[method][pointcut].push(aspect);
      };
    });
  });

  // Wrap mutator methods, letting the defined advice do the work
  _.each(advices, function (advice, method) {
    var _super = Meteor.isClient ? self[method] : self._collection[method];

    (Meteor.isClient ? self : self._collection)[method] = function () {
      return advice.call(this,
        getUserId(),
        _super,
        self._aspects[method] || {},
        function (doc) {
          return  _.isFunction(self._transform)
                  ? function () { return self._transform(doc); }
                  : function () { return doc; };
        },
        _.toArray(arguments)
      );
    };
  });

  return ret;
};

Meteor.Collection.prototype = Object.create(constructor.prototype);

for (var func in constructor) {
  if (constructor.hasOwnProperty(func)) {
    Meteor.Collection[func] = constructor[func];
  }
}

CollectionHooks.defineAdvice = function (method, advice) {
  advices[method] = advice;
};

CollectionHooks.beforeTrailingCallback = function (args, func) {
  if (!_.isFunction(_.last(args))) return args;

  var last = args.length - 1;
  var callback = args[last];

  args[last] = function () {
    func.apply(this, arguments);
    return callback.apply(this, arguments);
  };

  return args;
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