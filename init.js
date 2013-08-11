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
      var hookedMethodName = '_hooked' + method.charAt(0).toUpperCase() + method.slice(1);
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
        // Allow Meteor to set-up normal mutation methods
        _defineMutationMethods.apply(self, arguments);
      }

      // Now that the mutation methods are setup, we can bind our interceptions
      // on the final mutation invocations, and facilitate our server-side hooks
      _.each(verbs, function (method) {
        var _super = self._collection[method];

        self._collection[method] = function () {
          var hookedMethodName = '_hooked' + method.charAt(0).toUpperCase() + method.slice(1);
          var opts = {
            _super: _super,
            userId: getUserId.call(self),
            fromPublicApi: false
          };

          self._collection._validators = self._validators;

          return self[hookedMethodName].apply(self._collection, [opts].concat(_.toArray(arguments)));
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