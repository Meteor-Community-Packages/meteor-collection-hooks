CollectionHooks.defineAdvice("update", function (userId, _super, aspects, getTransform, args) {
  var self = this;
  var ctx = {context: self, _super: _super};
  var async = _.isFunction(_.last(args));
  var docs, fields, prev = {};
  var collection = _.has(self, "_collection") ? self._collection : self;

  // args[0] : selector
  // args[1] : mutator
  // args[2] : options (optional)
  // args[3] : callback

  if (_.isFunction(args[2])) {
    args[3] = args[2];
    args[2] = {};
  }

  args[2] = args[2] || {};

  fields = getFields(args[1]);
  docs = getDocs.call(self, collection, args[0], args[2]).fetch();

  // copy originals for convenience for the "after" pointcut
  if (aspects.after) {
    prev.mutator = EJSON.clone(args[1]);
    prev.docs = {};
    _.each(docs, function (doc) {
      prev.docs[doc._id] = EJSON.clone(doc);
    });
  }

  // before
  _.each(aspects.before, function (aspect) {
    _.each(docs, function (doc) {
      // Attach _transform helper
      doc._transform = getTransform(doc);
      // Invoke the aspect
      aspect.call(ctx, userId, doc, fields, args[1]);
      // Remove _transform helper
      delete doc._transform;
    });
  });

  function after() {
    var fields = getFields(args[1]);
    var docs = getDocs.call(self, collection, args[0], args[2]).fetch();

    _.each(aspects.after, function (aspect) {
      _.each(docs, function (doc) {
        // Attach _transform and _previous helpers
        doc._transform = getTransform(doc);
        doc._previous = prev.docs[doc._id];
        // Invoke the aspect
        aspect.call(ctx, userId, doc, fields, prev.mutator);
      });
    });
  }

  if (async) {
    return _super.apply(self, CollectionHooks.beforeTrailingCallback(args, function (err, result) {
      after(result);
    }));
  } else {
    var result = _super.apply(self, args);
    after(result);
    return result;
  }
});

// This function contains a snippet of code pulled and modified from:
// ~/.meteor/packages/mongo-livedata/collection.js:632-668
// It's contained in these utility functions to make updates easier for us in
// case this code changes.
var getFields = function (mutator) {
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