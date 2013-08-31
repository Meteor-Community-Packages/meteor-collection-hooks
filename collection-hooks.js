// TODO: not quite sure what to do yet. I end up with aspects that are shared
// across collections. It seems due to the fact that I'm setting up these
// advices on Meteor.Collection, which has a "_collection" property that may
// or may not even be of type LocalCollection or MongoInternals.Connection.
// I then need to have LocalCollection and MongoInternals.Connection refer to
// the exact instance of Meteor.Collection to which they are related. This has
// proven to be very tricky, because the instances of LocalCollection don't
// appear to store a reference back to the parent Meteor.Collection, and worse
// still, MongoInternals.Connection is so far removed from Meteor.Collection
// that it's not even stored as a child object anywhere in Meteor.Collection --
// it seems a few of its functions are bound to it but the trouble is that I
// think it's a single instance of MongoInternals.Connection... that would
// explain the _.bind() trickery in remote_mongo_driver.js

// The best approach I think is to wrap Meteor.Collection, and after it has
// been constructed, wrap each of the mutator methods of its _collection object.
// It's more memory intensive, but probably negligible.


// Relevant AOP terminology:
// Aspect: User code that runs before/after (hook)
// Advice: Wrapper code that knows when to calls user code (aspects)
// Pointcut: before/after

var advices = {};
var constructor = Meteor.Collection;

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
      return advice.call(this, CollectionHooks.getUserId(), _super, self._aspects[method] || {}, _.toArray(arguments));
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

CollectionHooks.getUserId = function () {
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

    // TODO: re-implement this
    //if (!userId) {
    //    userId = Meteor.__collection_hooks_publish_userId;
    //}
  }

  return userId;
};

CollectionHooks.defineAdvice = function (method, advice) {
  advices[method] = advice;
};

CollectionHooks.afterTrailingCallback = function (args, func) {
  if (!_.isFunction(_.last(args))) return args;

  var i = args.length - 1;
  var callback = args[i];

  args[i] = function () {
    var ret = callback.apply(this, arguments);
    func.apply(this, arguments);
    return ret;
  };

  return args;
};

/*
//===================
// Tests
//===================

var c = new Meteor.Collection(null);
c.before.insert(function (userId, doc) {
  console.log("Before insert called!")
  doc.test = 2;
});

c.insert({test: 1});
console.log(c.find().fetch());
*/


/*
var _Meteor_Collection = Meteor.Collection;

Meteor.Collection = function () {
  return _Meteor_Collection.apply(this, arguments);
  console.log("it ran")
};
*/

/*
var argParsers = {};
var advices = {};

var mongoConnectionAspects = {};
var localCollectionAspects = {};
var lc = 0;

function makeArgs(method, _arguments, offset) {
  var args = _.toArray(_arguments);

  var ret = {
    _async: false,
    _get: function () { return args; }
  };

  if (!argParsers[method]) {
    throw "No argument parser defined for " + method + ".";
  }

  // In the case of MongoInternals.Connection, the first argument is the
  // collection name. The provided offset helps us to optionally skip over the
  // first argument (or slice it out)
  offset = offset || 0;

  return argParsers[method](args, ret, offset);
}

function getAdviceName(method) {
  return "_" + method + "Advice"; // _insertAdvice for example
}

function isMongoConnection(obj) {
  return _.has(obj._collection, "_ensureIndex");
}

//==============================================================================
// Public API
//==============================================================================

CollectionHooks = {};

CollectionHooks.getUserId = function () {
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

    // TODO: re-implement this
    //if (!userId) {
    //    userId = Meteor.__collection_hooks_publish_userId;
    //}
  }

  return userId;
};

CollectionHooks.addPointcuts = function (pointcutLocations) {
  pointcutLocations = pointcutLocations || ["before", "after"];

  _.each(pointcutLocations, function (loc) {

    // Add pointcuts
    Meteor.Collection.prototype[loc] = function (method, advice) {
      if (isMongoConnection(this)) {
        // Initialize empty array
        Meteor._ensure(mongoConnectionAspects, this._name, loc);
        if (!mongoConnectionAspects[this._name][loc][method])
          mongoConnectionAspects[this._name][loc][method] = [];

        // Push advice
        mongoConnectionAspects[this._name][loc][method].push(advice);
      } else {
        // Generate id for this collection instance
        if (!this.__collection_hook_id) this.__collection_hook_id = (lc++);
        this._collection.__collection_hook_id = this.__collection_hook_id;

        // Initialize empty array
        Meteor._ensure(localCollectionAspects, this.__collection_hook_id, loc);
        if (!localCollectionAspects[this.__collection_hook_id][loc][method])
          localCollectionAspects[this.__collection_hook_id][loc][method] = [];

        // Push advice
        localCollectionAspects[this.__collection_hook_id][loc][method].push(advice);

        // Initialize empty array
        //Meteor._ensure(this, "_collection", "_advice", loc);
        //if (!this._collection._advice[loc][method]) this._collection._advice[loc][method] = [];

        // Push advice
        //this._collection._advice[loc][method].push(advice);
      }
    };

  });
};

CollectionHooks.defineAdvice = function (method, advice) {
  var adviceName = getAdviceName(method);
  advices[adviceName] = advice;
};

CollectionHooks.defineArgParser = function (method, parser) {
  if (argParsers[method]) {
    throw "Argument parser for " + method + " already defined";
  }
  argParsers[method] = parser;
};

CollectionHooks.wrapMethod = function (method) {

  function wrap(constructor, offset) {
    var _super = constructor.prototype[method];

    constructor.prototype[method] = function () {
      var adviceName = getAdviceName(method);
      var advice;

      // If advice has not been defined, fallback to regular behavior
      if (!advices[adviceName]) {
        return _super.apply(this, arguments);
      }

      if (_.isString(arguments[0]) && _.has(mongoConnectionAspects, arguments[0])) {
        // MongoInternals.Connection is a level of abstraction too far for us to
        // store advices on it. Since they are always uniquely named, we can
        // store them in an object:
        advice = mongoConnectionAspects[arguments[0]];
      } else {
        // LocalCollection advices can be named or null, so we must store them
        // on each collection instance:
        //console.log("this", this);
        advice = localCollectionAspects[this.__collection_hook_id];
        //advice = this._advice;
        console.log("advice", method, advice, this.__collection_hook_id);
      }

      // Call the advice, passing in a userId (if applicable) and the super,
      // implying that the advice is responsible for calling the super to run
      // the original behavior. We also send the arguments parsed as per the arg
      // parsing rules defined by each implementation
      return advices[adviceName].call(this,
        CollectionHooks.getUserId(), _super, advice || {}, makeArgs(method, arguments, offset)
      );
    };
  }

  if (Meteor.isServer) {
    wrap(MongoInternals.Connection, 1);
    wrap(LocalCollection);
  }

  if (Meteor.isClient) {
    wrap(LocalCollection);
  }

};

CollectionHooks.addPointcuts();
*/

/*
var directFind = Meteor.Collection.prototype.find;
var directFindOne = Meteor.Collection.prototype.findOne;
var directInsert = Meteor.Collection.prototype.insert;
var directUpdate = Meteor.Collection.prototype.update;
var directRemove = Meteor.Collection.prototype.remove;

function delegate() {
    var i, len, c;
    var args = Array.prototype.slice.call(arguments);
    var type = args.shift();
    var verb = args.shift();

    if (this.__collection_hooks && this.__collection_hooks[type] && this.__collection_hooks[type][verb]) {
        for (i = 0, len = this.__collection_hooks[type][verb].length; i < len; i++) {
            c = this.__collection_hooks[type][verb][i];
            if (typeof c === "function") {
                if (c.apply(this, args) === false) {
                    return false;
                }
            }
        }
    }
}

function getUserId() {
    var userId = null;

    if (Meteor.isClient) {
        Deps.nonreactive(function () {
            userId = Meteor.userId();
        });
    }

    if (Meteor.isServer) {
        try {
            // Will work inside methods
            userId = Meteor.userId();
        } catch (e) {}

        if (!userId) {
            userId = Meteor.__collection_hooks_publish_userId;
        }
    }

    return userId;
}

// Allow direct operations
Meteor.Collection.prototype.directFind = directFind;
Meteor.Collection.prototype.directFindOne = directFindOne;

// These are invoked when the method is called directly on the collection
// from either the server or client. These are adapted to match the
// function signature of the validated version (userId added)

// "after" hooks for find are strange and only here for completeness.
// Most of their functionality can be done by "transform".

Meteor.Collection.prototype.find = function (selector, options) {
    var result, userId = getUserId.call(this);

    selector = selector || {};

    if (delegate.call(this, "before", "find", userId, selector, options) !== false) {
        result = directFind.call(this, selector, options);
        delegate.call(this, "after", "find", userId, selector, options, result);
    }

    return result;
};

Meteor.Collection.prototype.findOne = function (selector, options) {
    var result, userId = getUserId.call(this);

    selector = selector || {};

    if (delegate.call(this, "before", "findOne", userId, selector, options) !== false) {
        result = directFindOne.call(this, selector, options);
        delegate.call(this, "after", "findOne", userId, selector, options, result);
    }

    return result;
};

Meteor.Collection.prototype.insert = function (doc, callback) {
    var result, userId = getUserId.call(this);

    if (delegate.call(this, "before", "insert", userId, doc, callback) !== false) {
        result = directInsert.call(this, doc, callback);
        delegate.call(this, "after", "insert", userId, result && this._collection.findOne({_id: result}) || doc, callback);
    }

    return result;
};

Meteor.Collection.prototype.update = function (selector, modifier, options, callback) {
    var result, previous, i, len, stopFiltering;
    var updateArgumentsRaw = Array.prototype.slice.call(arguments).reverse();
    var updateArguments = [];
    var userId = getUserId.call(this);

    selector = selector || {};

    if (delegate.call(this, "before", "update", userId, selector, modifier, options, callback) !== false) {
        previous = this._collection.find(selector, {reactive: false}).fetch();

        // Build an array of the parameters in preparation for Function.apply.
        // We can't use call here because of the way Meteor.Collection.update
        // resolves if the last parameter is a callback or not. If we use call,
        // and the caller didn't pass options, callbacks won't work. We need
        // to trim any undefined arguments off the end of the arguments array
        // that we pass.
        stopFiltering = false;
        for (i = 0, len = updateArgumentsRaw.length; i < len; i++) {
            // Skip undefined values until we hit a non-undefined value.
            // Then accept everything.
            if (stopFiltering || updateArgumentsRaw[i] !== undefined) {
                updateArguments.push(updateArgumentsRaw[i]);
                stopFiltering = true;
            }
        }

        updateArguments = updateArguments.reverse();

        result = directUpdate.apply(this, updateArguments);
        delegate.call(this, "after", "update", userId, selector, modifier, options, previous, callback);
    }

    return result;
};

Meteor.Collection.prototype.remove = function (selector, callback) {
    var result, previous, userId = getUserId.call(this);

    selector = selector || {};

    if (delegate.call(this, "before", "remove", userId, selector, callback) !== false) {
        previous = this._collection.find(selector, {reactive: false}).fetch();
        result = directRemove.call(this, selector, callback);
        delegate.call(this, "after", "remove", userId, selector, previous, callback);
    }

    return result;
};

if (Meteor.isServer) {
    (function () {

        var _validatedInsert = Meteor.Collection.prototype._validatedInsert;
        var _validatedUpdate = Meteor.Collection.prototype._validatedUpdate;
        var _validatedRemove = Meteor.Collection.prototype._validatedRemove;

        var directPublish = Meteor.publish;

        // Allow direct operations on server only. If they are allowed in
        // this form on the client, the validated versions will still run
        Meteor.Collection.prototype.directInsert = directInsert;
        Meteor.Collection.prototype.directUpdate = directUpdate;
        Meteor.Collection.prototype.directRemove = directRemove;

        // These are triggered on the server, but only when a client initiates
        // the method call. They act similarly to observes, but simply hi-jack
        // _validatedXXX. Additionally, they hi-jack the collection
        // instance's _collection.insert/update/remove temporarily in order to
        // maintain validator integrity (allow/deny).

        Meteor.Collection.prototype._validatedInsert = function (userId, doc) {
            var id, self = this;
            var _insert = self._collection.insert;

            self._collection.insert = function (doc) {
                if (delegate.call(self, "before", "insert", userId, doc) !== false) {
                    id = _insert.call(this, doc);
                    delegate.call(self, "after", "insert", userId, id && this.findOne({_id: id}) || doc);
                }
            };

            _validatedInsert.call(self, userId, doc);
            self._collection.insert = _insert;
        };

        Meteor.Collection.prototype._validatedUpdate = function (userId, selector, mutator, options) {
            var previous, self = this;
            var _update = self._collection.update;

            self._collection.update = function (selector, mutator, options) {
                if (delegate.call(self, "before", "update", userId, selector, mutator, options) !== false) {
                    previous = this.find(selector).fetch();
                    _update.call(this, selector, mutator, options);
                    delegate.call(self, "after", "update", userId, selector, mutator, options, previous);
                }
            };

            _validatedUpdate.call(self, userId, selector, mutator, options);
            self._collection.update = _update;
        };

        Meteor.Collection.prototype._validatedRemove = function (userId, selector) {
            var previous, self = this;
            var _remove = self._collection.remove;

            self._collection.remove = function (selector) {
                if (delegate.call(self, "before", "remove", userId, selector, previous) !== false) {
                    previous = this.find(selector).fetch();
                    _remove.call(this, selector);
                    delegate.call(self, "after", "remove", userId, selector, previous);
                }
            };

            _validatedRemove.call(self, userId, selector);
            self._collection.remove = _remove;
        };

        Meteor.publish = function (name, func) {
            return directPublish.call(this, name, function () {
                var result;

                Meteor.__collection_hooks_publish_userId = this.userId;
                result = func.apply(this, arguments);
                delete Meteor.__collection_hooks_publish_userId;

                return result;
            });
        };

    })();
}

Meteor.Collection.prototype.clearHooks = function (type, verb) {
    if (!this.__collection_hooks) this.__collection_hooks = {};
    if (!this.__collection_hooks[type]) this.__collection_hooks[type] = {};
    this.__collection_hooks[type][verb] = [];
};

_.each(["before", "after"], function (type) {
    Meteor.Collection.prototype[type] = function (verb, callback) {
        if (!this.__collection_hooks) this.__collection_hooks = {};
        if (!this.__collection_hooks[type]) this.__collection_hooks[type] = {};
        if (!this.__collection_hooks[type][verb]) this.__collection_hooks[type][verb] = [];

        this.__collection_hooks[type][verb].push(callback);
    };
});

if (Meteor.isClient) {
    Meteor.Collection.prototype.when = function (condition, callback) {
        var self = this;
        Deps.autorun(function (c) {
            if (condition.call(self._collection)) {
                c.stop();
                callback.call(self._collection);
            }
        });
    };
}
*/