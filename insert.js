Meteor.Collection.prototype._hookedInsert = function (opts, doc, callback) {
  var self = this;
  var collection = opts.fromPublicApi ? self : self._collection;
  var context = {_super: opts._super, context: self};
  var id;

  // Attach _transform helper
  doc._transform = function () { return self._transform && self._transform(doc) || doc; };

  // before
  _.each(self._validators.insert.before, function (hook) {
    hook.call(context, opts.userId, doc);
  });

  // Detach helper so it doesn't get "inserted"
  delete doc._transform;

  function after(id) {
    // Attach _transform helper and provide _id
    doc._id = id;
    doc._transform = function () { return self._transform && self._transform(doc) || doc; };

    _.each(self._validators.insert.after, function (hook) {
      hook.call(context, opts.userId, doc);
    });

    // Detach helpers
    delete doc._transform;
  }

  if (opts.fromPublicApi) {
    // Called from public API (Meteor.Collection.prototype.XXX)
    return opts._super.call(self, doc, function (err, id) {
      after(id);
      callback && callback.apply(self, arguments);
    });
  } else {
    // Called from private API (_collection.XXX)
    opts._super.call(self._collection, doc);
    after(doc._id);
    return doc._id;
  }
};