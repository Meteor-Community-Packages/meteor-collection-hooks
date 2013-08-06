Meteor.Collection.prototype._hookedRemove = function (opts, selector, callback) {
  var self = this;
  var context = {_super: opts._super, context: self};
  var result, prev = [];
  var docs = getDocs.call(self, opts, selector).fetch();

  // copy originals for convenience in after-hook
  if (self._validators.remove.after) {
    prev = [];
    _.each(self._validators.remove.after, function (hook) {
      _.each(docs, function (doc) {
        prev.push(EJSON.clone(transformDoc(hook, doc)));
      });
    });
  }

  // before
  _.each(self._validators.remove.before, function (hook) {
    _.each(docs, function (doc) {
      hook.call(context, opts.userId, transformDoc(hook, doc));
    });
  });

  function after() {
    _.each(self._validators.remove.after, function (hook) {
      _.each(prev, function (doc) {
        hook.call(context, opts.userId, doc);
      });
    });
  }

  if (opts.fromPublicApi) {
    // Called from public API (Meteor.Collection.prototype.XXX)
    return opts._super.call(self, selector, function (err) {
      if (err) throw err;
      after();
      callback && callback.apply(self, arguments);
    });
  } else {
    // Called from private API (_collection.XXX)
    result = opts._super.call(self, selector);
    after();
    return result;
  }
};

// transformDoc pulled verbatim from:
// ~/.meteor/packages/mongo-livedata/collection.js:618-622
var transformDoc = function (validator, doc) {
  if (validator.transform)
    return validator.transform(doc);
  return doc;
};

// This function contains a snippet of code pulled from:
// ~/.meteor/packages/mongo-livedata/collection.js:721-731
var getDocs = function (opts, selector) {
  var self = this;

  var findOptions = {transform: null, reactive: false}; // added reactive:false
  if (!self._validators.fetchAllFields) {
    findOptions.fields = {};
    _.each(self._validators.fetch, function(fieldName) {
      findOptions.fields[fieldName] = 1;
    });
  }

  // Unlike validators, we iterate over multiple docs, so use
  // find instead of findOne:
  return self.find(selector, findOptions);
};