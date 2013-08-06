Meteor.Collection.prototype._hookedUpdate = function (opts, selector, mutator, options, callback) {
  var self = this;
  var result, docs, fields, prev = {};

  if (options instanceof Function) {
    callback = options;
    options = {};
  }

  options = options || {};

  fields = getFields.call(self, mutator);
  docs = getDocs.call(self, selector, options).fetch();

  // copy originals for convenience in after-hook
  if (self._validators.update.after) {
    prev.mutator = EJSON.clone(mutator);
    prev.docs = {};
    _.each(docs, function (doc) {
      prev.docs[doc._id] = EJSON.clone(doc);
    });
  }

  // before
  _.each(self._validators.update.before, function (hook) {
    _.each(docs, function (doc) {
      hook(opts.userId, transformDoc(hook, doc), fields, mutator);
    });
  });

  function after() {
    var fields = getFields.call(self, mutator);
    var docs = getDocs.call(self, selector, options).fetch();

    _.each(self._validators.update.after, function (hook) {
      _.each(docs, function (doc) {
        hook(opts.userId, transformDoc(hook, doc), fields, prev.mutator, prev.docs[doc._id]);
      });
    });
  }

  if (opts.fromPublicApi) {
    // Called from public API (Meteor.Collection.prototype.XXX)
    return opts._super.call(self, selector, mutator, options, function (err, result) {
      if (err) throw err;
      after(result);
      callback && callback.apply(self, arguments);
    });
  } else {
    // Called from private API (_collection.XXX)
    result = opts._super.call(self, selector, mutator, options);
    after(result);
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

// This function contains a snippet of code pulled and modified from:
// ~/.meteor/packages/mongo-livedata/collection.js:632-668
// It's contained in these utility functions to make updates easier for us in
// case this code changes.
var getFields = function (mutator) {
  var self = this;

  // compute modified fields
  var fields = [];
  _.each(mutator, function (params, op) {
    _.each(_.keys(params), function (field) {
      // treat dotted fields as if they are replacing their
      // top-level part
      if (field.indexOf('.') !== -1)
        field = field.substring(0, field.indexOf('.'));

      // record the field we are trying to change
      if (!_.contains(fields, field))
        fields.push(field);
    });
  });

  return fields;
};

var getDocs = function (selector, options) {
  var self = this;

  var findOptions = {transform: null, reactive: false};
  if (!self._validators.fetchAllFields) {
    findOptions.fields = {};
    _.each(self._validators.fetch, function(fieldName) {
      findOptions.fields[fieldName] = 1;
    });
  }

  // This was added because in our case, we are potentially iterating over
  // multiple docs. If multi isn't enabled, force a limit (almost like findOne)
  if (!options.multi) {
    findOptions.limit = 1;
  }

  // Unlike validators, we iterate over multiple docs, so use
  // find instead of findOne:
  return self.find(selector, findOptions);
};