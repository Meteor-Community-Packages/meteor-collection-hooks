Meteor.Collection.prototype._hookedRemove = function (opts, selector, callback) {
  var self = this;
  var collection = opts.fromPublicApi ? self : self._collection;
  var context = {_super: opts._super, context: self};
  var result, prev = [];
  var docs = getDocs.call(self, collection, selector).fetch();

  // copy originals for convenience in after-hook
  if (self._validators.remove.after) {
    prev = [];
    _.each(docs, function (doc) {
      prev.push(EJSON.clone(doc));
    });
  }

  // before
  _.each(self._validators.remove.before, function (hook) {
    _.each(docs, function (doc) {
      // Attach _transform helper
      doc._transform = function () { return self._transform && self._transform(doc) || doc; };

      hook.call(context, opts.userId, doc);

      delete doc._transform;
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
      after();
      callback && callback.apply(self, arguments);
    });
  } else {
    // Called from private API (_collection.XXX)
    result = opts._super.call(self._collection, selector);
    after();
    return result;
  }
};

// This function contains a snippet of code pulled from:
// ~/.meteor/packages/mongo-livedata/collection.js:721-731
var getDocs = function (collection, selector) {
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
  return collection.find(selector, findOptions);
};