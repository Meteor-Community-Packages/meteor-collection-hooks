CollectionHooks.defineAdvice("insert", function (userId, _super, instance, aspects, getTransform, args) {
  var self = this;
  var ctx = {context: self, _super: _super, args: args};
  var callback = _.last(args);
  var async = _.isFunction(callback);
  var abort, ret;

  // args[0] : doc
  // args[1] : options (optional)
  // args[2] : callback

  try {
    // before
    _.each(aspects.before, function (o) {
      var r = o.aspect.call(_.extend({
        transform: getTransform(args[0]),
        args: args
      }, ctx), userId, args[0], args[1]);
      if (r === false) abort = true;
    });

    if (abort) return false;
  } catch (e) {
    if (async) {
      return callback.call(this, e);
    } else {
      throw e;
    }
  }

  function after(id, err) {
    var doc = args[0];
    if (id) {
      doc = EJSON.clone(args[0]);
      doc._id = id;
    }
    var options = EJSON.clone(args[1]);
    var lctx = _.extend({transform: getTransform(doc), _id: id, err: err, args: args}, ctx);
    _.each(aspects.after, function (o) {
      o.aspect.call(lctx, userId, doc, options);
    });
    return id;
  }

  if (async) {
    args[args.length - 1] = function (err, obj) {
      after(obj && obj[0] && obj[0]._id || obj, err);
      return callback.apply(this, arguments);
    };
    return _super.apply(self, args);
  } else {
    ret = _super.apply(self, args);
    return after(ret && ret[0] && ret[0]._id || ret);
  }
});