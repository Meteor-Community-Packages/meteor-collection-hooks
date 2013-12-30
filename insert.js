CollectionHooks.defineAdvice("insert", function (userId, _super, aspects, getTransform, args) {
  var self = this;
  var ctx = {context: self, _super: _super};
  var async = _.isFunction(_.last(args));
  var abort, ret;

  // args[0] : doc
  // args[1] : callback

  // before
  _.each(aspects.before, function (aspect) {
    var r = aspect.call(_.extend({transform: getTransform(args[0])}, ctx), userId, args[0]);
    if (r === false) abort = true;
  });

  if (abort) return false;

  function after(id, err) {
    var doc = args[0];
    if (id) {
      doc = EJSON.clone(args[0]);
      doc._id = id;
    }
    var lctx = _.extend({transform: getTransform(doc), _id: id, err: err}, ctx);
    _.each(aspects.after, function (aspect) {
      aspect.call(lctx, userId, doc);
    });
    return id;
  }

  if (async) {
    return _super.call(self, args[0], function (err, obj) {
      after(obj && obj[0] && obj[0]._id || obj, err);
      return args[1].apply(this, arguments);
    });
  } else {
    ret = _super.apply(self, args);
    return after(ret && ret[0] && ret[0]._id || ret);
  }
});