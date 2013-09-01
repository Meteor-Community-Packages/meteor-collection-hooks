CollectionHooks.defineAdvice("remove", function (userId, _super, aspects, getTransform, args) {
  var self = this;
  var ctx = {context: self, _super: _super};
  var async = _.isFunction(_.last(args));
  var docs, prev = [];
  var collection = _.has(self, "_collection") ? self._collection : self;

  // args[0] : selector
  // args[1] : callback

  var docs = getDocs.call(self, collection, args[0]).fetch();

  // copy originals for convenience for the "after" pointcut
  if (aspects.after) {
    _.each(docs, function (doc) {
      prev.push(EJSON.clone(doc));
    });
  }

  // before
  _.each(aspects.before, function (aspect) {
    _.each(docs, function (doc) {
      // Attach _transform helper
      doc._transform = getTransform(doc);
      // Invoke the aspect
      aspect.call(ctx, userId, doc);
      // Remove _transform helper
      delete doc._transform;
    });
  });

  function after() {
    _.each(aspects.after, function (aspect) {
      _.each(prev, function (doc) {
        aspect.call(ctx, userId, doc);
      });
    });
  }

  if (async) {
    return _super.apply(self, CollectionHooks.beforeTrailingCallback(args, function (err) {
      after();
    }));
  } else {
    var result = _super.apply(self, args);
    after();
    return result;
  }
});

// This function contains a snippet of code pulled from:
// ~/.meteor/packages/mongo-livedata/collection.js:721-731
var getDocs = function (collection, selector) {
  var self = this;

  var findOptions = {transform: null, reactive: false}; // added reactive: false

  /*
  // No "fields" support for the time being
  if (!self._validators.fetchAllFields) {
    findOptions.fields = {};
    _.each(self._validators.fetch, function(fieldName) {
      findOptions.fields[fieldName] = 1;
    });
  }
  */

  // Unlike validators, we iterate over multiple docs, so use
  // find instead of findOne:
  return collection.find(selector, findOptions);
};