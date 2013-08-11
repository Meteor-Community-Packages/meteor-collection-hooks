Meteor.Collection.prototype._hookedInsert = function (opts, doc, callback) {
  var self = this;
  var context = {_super: opts._super, context: self};
  var id;

  // before
  _.each(self._validators.insert.before, function (hook) {
    hook.call(context, opts.userId, docToValidate(hook, doc));
  });

  function after(id) {
    var doc = self.findOne({_id: id}, {transform: null});
    _.each(self._validators.insert.after, function (hook) {
      hook.call(context, opts.userId, docToValidate(hook, doc));
    });
  }

  if (opts.fromPublicApi) {
    // Called from public API (Meteor.Collection.prototype.XXX)
    return opts._super.call(self, doc, function (err, id) {
      after(id);
      callback && callback.apply(self, arguments);
    });
  } else {
    // Called from private API (_collection.XXX)
    opts._super.call(self, doc);
    after(doc._id);
    return doc._id;
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