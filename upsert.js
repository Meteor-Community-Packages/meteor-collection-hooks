CollectionHooks.defineAdvice("upsert", function (userId, _super, instance, aspectGroup, getTransform, args, suppressAspects) {
  var self = this;
  var ctx = {context: self, _super: _super, args: args};
  var callback = _.last(args);
  var async = _.isFunction(callback);
  var docs, docsIds, fields, abort, prev = {};
  var collection = _.has(self, "_collection") ? self._collection : self;

  // args[0] : selector
  // args[1] : mutator
  // args[2] : options (optional)
  // args[3] : callback

  if (_.isFunction(args[2])) {
    callback = args[2];
    args[2] = {};
  }

  if (!suppressAspects) {
    if (aspectGroup.upsert.before) {
      fields = CollectionHooks.getFields(args[1]);
      docs = CollectionHooks.getDocs.call(self, collection, args[0], args[2]).fetch();
      docIds = _.map(docs, function (doc) { return doc._id; });
    }

    // copy originals for convenience for the "after" pointcut
    if (aspectGroup.update.after) {
      if (_.some(aspectGroup.update.after, function (o) { return o.options.fetchPrevious !== false; }) &&
          CollectionHooks.extendOptions(instance.hookOptions, {}, "after", "update").fetchPrevious !== false) {
        prev.mutator = EJSON.clone(args[1]);
        prev.options = EJSON.clone(args[2]);
        prev.docs = {};
        _.each(docs, function (doc) {
          prev.docs[doc._id] = EJSON.clone(doc);
        });
      }
    }

    // before
    _.each(aspectGroup.upsert.before, function (o) {
      _.each(docs, function (doc) {
        var r = o.aspect.call(_.extend({transform: getTransform(doc)}, ctx), userId, doc, fields, args[1], args[2]);
        if (r === false) abort = true;
      });
    });

    if (abort) return false;
  }

  function afterUpdate(affected, err) {
    if (!suppressAspects) {
      var fields = CollectionHooks.getFields(args[1]);
      var docs = CollectionHooks.getDocs.call(self, collection, {_id: {$in: docIds}}, args[2]).fetch();

      _.each(aspectGroup.update.after, function (o) {
        _.each(docs, function (doc) {
          o.aspect.call(_.extend({
            transform: getTransform(doc),
            previous: prev.docs && prev.docs[doc._id],
            affected: affected,
            err: err
          }, ctx), userId, doc, fields, prev.mutator, prev.options);
        });
      });
    }
  }

  function afterInsert(id, err) {
    var doc = args[0];
    if (id) {
      doc = EJSON.clone(args[0]);
      doc._id = id;
    }
    if (!suppressAspects) {
      var lctx = _.extend({transform: getTransform(doc), _id: id, err: err}, ctx);
      _.each(aspectGroup.insert.after, function (o) {
        o.aspect.call(lctx, userId, doc);
      });
    }
    return id;
  }

  if (async) {
    args[args.length - 1] = function (err, ret) {
      console.log("-------- RET ASYNC", ret)
      if (args[2].insertedId) {
        afterInsert(ret && ret[0] && ret[0]._id || ret, err, err);
      } else {
        afterUpdate(ret, err);
      }
      return callback.apply(this, arguments);
    };
    return _super.apply(this, args);
  } else {
    var ret = _super.apply(self, args);
    console.log("-------- RET SYNC", ret)
    if (args[2].insertedId) {
      return afterInsert(ret && ret[0] && ret[0]._id || ret)
    } else {
      afterUpdate(ret);
      return ret;
    }
  }
});