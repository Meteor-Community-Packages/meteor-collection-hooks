Meteor.Collection.prototype._hookedInsert = function (opts, doc, callback) {
  var self = this;
  var result;

  // before
  _.each(opts.hooks.before, function (hook) {
    hook(opts.userId, docToValidate(hook, doc));
  });

  function after() {
    _.each(opts.hooks.after, function (hook) {
      hook(opts.userId, docToValidate(hook, doc));
    });
  }

  if (opts.fromPublicApi) {
    // Called from public API (Meteor.Collection.prototype.XXX)
    return opts._super.call(self, doc, function () {
      after();
      callback && callback.apply(self, arguments);
    });
  } else {
    // Called from private API (_collection.XXX)
    result = opts._super.call(self, doc);
    after();
    return result;
  }
};

// docToValidate pulled verbatim from:
// ~/.meteor/packages/mongo-livedata/collection.js:575-580
var docToValidate = function (validator, doc) {
  var ret = doc;
  if (validator.transform)
    ret = validator.transform(EJSON.clone(doc));
  return ret;
};