// TODO: do fetch and fetchAllFields actually get passed down properly to take effect??

Meteor.Collection.prototype._hookedRemove = function (opts, selector, callback) {
  var self = this;
  var result, prev = [];
  var docs = getDocs.call(self, opts, selector);

  // copy originals for convenience in after-hook
  if (opts.hooks.after) {
    prev = [];
    _.each(opts.hooks.after, function (hook) {
      docs.forEach(function (doc) {
        prev.push(EJSON.clone(transformDoc(hook, doc)));
      });
      docs.rewind();
    });
  }

  // before
  _.each(opts.hooks.before, function (hook) {
    docs.forEach(function (doc) {
      hook(opts.userId, transformDoc(hook, doc));
    });
  });

  function after() {
    _.each(opts.hooks.after, function (hook) {
      prev.forEach(function (doc) {
        hook(opts.userId, doc);
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

  var findOptions = {transform: null, reactive: false};
  if (!opts.hooks.fetchAllFields) {
    findOptions.fields = {};
    _.each(opts.hooks.fetch, function(fieldName) {
      findOptions.fields[fieldName] = 1;
    });
  }

  var docs = self.find(selector, findOptions);

  return docs;
};