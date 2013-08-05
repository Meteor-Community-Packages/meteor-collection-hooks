// TODO: do fetch and fetchAllFields actually get passed down properly to take effect??

Meteor.Collection.prototype._hookedUpdate = function (opts, selector, mutator, options, callback) {
  var self = this;
  var result, tuple, prev = {};

  if (options instanceof Function) {
    callback = options;
    options = {};
  }

  options = options || {};
  tuple = getDocsAndFields.call(self, opts, selector, mutator, options);

  // copy originals for convenience in after-hook
  if (opts.hooks.after) {
    prev.mutator = EJSON.clone(mutator);
    prev.docs = {};
    tuple.docs.forEach(function (doc) {
      prev.docs[doc._id] = EJSON.clone(doc);
    });
    tuple.docs.rewind();
  }

  // before
  _.each(opts.hooks.before, function (hook) {
    tuple.docs.forEach(function (doc) {
      hook(opts.userId, transformDoc(hook, doc), tuple.fields, mutator);
    });
  });

  function after() {
    var tuple = getDocsAndFields.call(self, opts, selector, mutator, options);
    _.each(opts.hooks.after, function (hook) {
      tuple.docs.forEach(function (doc) {
        hook(opts.userId, transformDoc(hook, doc), tuple.fields, prev.mutator, prev.docs[doc._id]);
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
// It's contained in this utility function to make updates easier for us in
// case this code changes.
var getDocsAndFields = function (opts, selector, mutator, options) {
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

  var findOptions = {transform: null, reactive: false};
  if (!opts.hooks.fetchAllFields) {
    findOptions.fields = {};
    _.each(opts.hooks.fetch, function(fieldName) {
      findOptions.fields[fieldName] = 1;
    });
  }
  if (!options.multi) {
    findOptions.limit = 1;
  }

  var docs = self.find(selector, findOptions);

  return {docs: docs, fields: fields};
};