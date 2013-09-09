CollectionHooks.defineAdvice("remove", function (userId, _super, aspects, getTransform, args) {
  var self = this;
  var ctx = {context: self, _super: _super};
  var async = _.isFunction(_.last(args));
  var docs, abort, prev = [];
  var collection = _.has(self, "_collection") ? self._collection : self;

  // args[0] : selector
  // args[1] : callback

  var docs = CollectionHooks.getDocs.call(self, collection, args[0]).fetch();

  // copy originals for convenience for the "after" pointcut
  if (aspects.after) {
    _.each(docs, function (doc) {
      prev.push(EJSON.clone(doc));
    });
  }

  // before
  _.each(aspects.before, function (aspect) {
    _.each(docs, function (doc) {
      var r = aspect.call(_.extend({transform: getTransform(doc)}, ctx), userId, doc);
      if (r === false) abort = true;
    });
  });

  if (abort) return false;

  function after() {
    _.each(aspects.after, function (aspect) {
      _.each(prev, function (doc) {
        aspect.call(_.extend({transform: getTransform(doc)}, ctx), userId, doc);
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