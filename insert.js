CollectionHooks.defineAdvice("insert", function (userId, _super, aspects, args) {
  var self = this;
  var ctx = {context: self, _super: _super};
  var async = _.isFunction(_.last(args));

  //console.log("run insert advice", userId, aspects, args)

  // before
  _.each(aspects.before, function (aspect) {
    aspect.call(ctx, userId, args[0]);
  });

  function after(id) {
    args[0]._id = args[0]._id || id;  // client version won't have _id yet
    _.each(aspects.after, function (aspect) {
      aspect.call(ctx, userId, args[0]);
    });
  }

  if (async) {
    _super.apply(self, CollectionHooks.afterTrailingCallback(args, function (err, id) {
      after(id);
    }));
  } else {
    after(_super.apply(self, args));
  }

  return args[0]._id || null;
});