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
  }

  return userId;
}

function makeArgs(method, _arguments) {
  var args = _.toArray(_arguments);
  var offset = 0;
  var callback;

  var ret = {
    _async: false,
    _get: function () { return args; }
  };

  // In some cases the first argument is the collection name:
  if (typeof args[0] === "string") {
    offset = 1;
  }

  if (method === "insert") {
    ret.doc = args[0 + offset];
    callback = args[1 + offset];

    if (typeof callback === "function") {
      ret._async = true;
      ret._get = function (cb) {
        return args.slice(0, offset).concat([ret.doc, function () {
          if (typeof cb === "function") cb.apply(this, arguments);
          callback.apply(this, arguments);
        }]);
      };
    }
  }

  if (method === "update") {
  }

  if (method === "remove") {
  }

  return ret;
}

function bindAdvices(constructor) {
  _.each(["insert", "update", "remove"], function (method) {
    _.each(["before", "after"], function (type) {
      Meteor._ensure(constructor.prototype, "_advice", type);
      Meteor._ensure(Meteor.Collection.prototype, type);

      constructor.prototype._advice[type][method] = [];
      Meteor.Collection.prototype[type][method] = function (advice) {
        constructor.prototype._advice[type][method].push(advice);
      };
    });

    var _super = constructor.prototype[method];
    constructor.prototype[method] = function () {
      if (!this["_" + method + "Advice"]) {
        // TEMP
        return _super.apply(this, arguments);
      }
      return this["_" + method + "Advice"].call(this,
        getUserId(), _super, makeArgs(method, arguments)
      );
    };
  });

  constructor.prototype._insertAdvice = function (userId, _super, args) {
    var self = this;
    var adviceContext = {context: self, _super: _super};

    // before
    _.each(self._advice.before.insert, function (advice) {
      advice.call(adviceContext, userId, args.doc);
    });

    function after(err, id) {
      args.doc._id = id;
      _.each(self._advice.after.insert, function (advice) {
        advice.call(adviceContext, userId, args.doc);
      });
    }

    if (args._async) {
      _super.apply(self, args._get(function (err, id) {
        after(err, id);
      }));
    } else {
      ret = _super.apply(self, args._get());
      after(null, ret);
    }

    return ret;
  };

  //constructor.prototype._updateAdvice = function (userId, _super, args) {};

  //constructor.prototype._removeAdvice = function (userId, _super, args) {};
}

if (Meteor.isServer) {
  bindAdvices(MongoInternals.Connection);
  bindAdvices(LocalCollection);
}

if (Meteor.isClient) {
  bindAdvices(Meteor.Collection);
}

/*

Meteor.Collection.prototype.before = function (options) {
  addHook.call(this, 'before', options);
};

Meteor.Collection.prototype.after = function (options) {
  addHook.call(this, 'after', options);
};

var verbs = ['insert', 'update', 'remove'];

if (Meteor.isClient) {
  _.each(verbs, function (method) {
    var _super = Meteor.Collection.prototype[method];

    Meteor.Collection.prototype[method] = function () {
      var self = this;
      var hookedMethodName = '_hooked' + capitalize(method);
      var opts = {
        _super: _super,
        userId: getUserId.call(self),
        fromPublicApi: true
      };

      return self[hookedMethodName].apply(self, [opts].concat(_.toArray(arguments)));
    };
  });
}

if (Meteor.isServer) {
  (function () {
    var _defineMutationMethods = Meteor.Collection.prototype._defineMutationMethods;

    Meteor.Collection.prototype._defineMutationMethods = function (skipSuper) {
      var self = this;

      if (self.wrapped) return;

      if (!skipSuper) {
        // Allow Meteor to set-up normal mutation methods, unless explicitly
        // skipped (in the case where _defineMutationMethods has run earlier)
        _defineMutationMethods.apply(self, arguments);
      }

      // Now that the mutation methods are setup, we can bind our interceptions
      // on the final mutation invocations, and facilitate our server-side hooks
      _.each(verbs, function (method) {
        var _super = self._collection[method];

        self._collection[method] = function () {
          var hookedMethodName = '_hooked' + capitalize(method);
          var opts = {
            _super: _super,
            userId: getUserId.call(self),
            fromPublicApi: false
          };

          return self[hookedMethodName].apply(self, [opts].concat(_.toArray(arguments)));
        }
      });

      self.wrapped = true;
    };

    // accounts-base/accounts_common.js runs before us, and has already created
    // Meteor.users. We need to run our wrapped _defineMutationMethods manually:
    if (Meteor.users instanceof Meteor.Collection) {
      Meteor.users._defineMutationMethods(true);
    }
  })();
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getUserId() {
  var userId;

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
  }

  return userId;
}

// addHook is nearly identical to addValidator, pulled from
// ~/.meteor/packages/mongo-livedata/collection.js:426-459
function addHook(verb, options) {
  var VALID_KEYS = verbs.concat(['fetch', 'transform']);
  _.each(_.keys(options), function (key) {
    if (!_.contains(VALID_KEYS, key))
      throw new Error(verb + ": Invalid key: " + key);
  });

  var self = this;
  self._restricted = true;

  _.each(verbs, function (name) {
    if (options[name]) {
      if (!(options[name] instanceof Function)) {
        throw new Error(verb + ": Value for `" + name + "` must be a function");
      }
      if (self._transform)
        options[name].transform = self._transform;
      if (options.transform)
        options[name].transform = Deps._makeNonreactive(options.transform);

      // Dynamically initialize new paths in self._validators
      if (!_.has(self._validators, name))
        self._validators[name] = {};
      if (!_.has(self._validators[name], verb))
        self._validators[name][verb] = [];

      self._validators[name][verb].push(options[name]);
    }
  });

  if (options.update || options.remove || options.fetch) {
    if (options.fetch && !(options.fetch instanceof Array)) {
      throw new Error(verb + ": Value for `fetch` must be an array");
    }
    self._updateFetch(options.fetch);
  }
}
*/