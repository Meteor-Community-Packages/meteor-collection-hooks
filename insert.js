Meteor.Collection.prototype._hookedInsert = function (opts, doc, callback) {
  var self = this;
  var id;

  // before
  _.each(opts.hooks.before, function (hook) {
    hook(opts.userId, docToValidate(hook, doc));
  });

  function after(id) {
    _.each(opts.hooks.after, function (hook) {
      // No need to run docToValidate (transform),
      // findOne should do that internally
      hook(opts.userId, self.findOne({_id: id}));
    });
  }

  if (opts.fromPublicApi) {
    // Called from public API (Meteor.Collection.prototype.XXX)
    return opts._super.call(self, doc, function (err, id) {
      if (err) throw err;
      after(id);
      callback && callback.apply(self, arguments);
    });
  } else {
    // Called from private API (_collection.XXX)
    id = opts._super.call(self, doc);
    after(id);
    return id;
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