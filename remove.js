CollectionHooks.defineAdvice("remove", function (userId, _super, instance, aspects, getTransform, args) {
  var self = this;
  var ctx = {context: self, _super: _super, args: args};
  var callback = _.last(args);
  var async = _.isFunction(callback);
  var docs, abort, prev = [];
  var collection = _.has(self, "_collection") ? self._collection : self;

  // args[0] : selector
  // args[1] : callback

  try {
    if (aspects.before || aspects.after) {
      docs = CollectionHooks.getDocs.call(self, collection, args[0]).fetch();
    }

    // copy originals for convenience for the "after" pointcut
    if (aspects.after) {
      _.each(docs, function (doc) {
        prev.push(EJSON.clone(doc));
      });
    }

    // before
    _.each(aspects.before, function (o) {
      _.each(docs, function (doc) {
        var r = o.aspect.call(_.extend({transform: getTransform(doc)}, ctx), userId, doc);
        if (r === false) abort = true;
      });
    });

    if (abort) return false;
  } catch (e) {
    if (async) {
      return callback.call(this, e);
    } else {
      throw e;
    }
  }

  function after(err) {
    _.each(aspects.after, function (o) {
      _.each(prev, function (doc) {
        o.aspect.call(_.extend({transform: getTransform(doc), err: err}, ctx), userId, doc);
      });
    });
  }

  if (async) {
    args[args.length - 1] = function (err) {
      after(err);
      return callback.apply(this, arguments);
    };
    return _super.apply(self, args);
  } else {
    var result = _super.apply(self, args);
    after();
    return result;
  }
});