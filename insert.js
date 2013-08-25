CollectionHooks.wrapMethod("insert");

CollectionHooks.defineArgParser("insert", function (args, ret) {
  var callback;

  ret.doc = args[0];
  callback = args[1];

  if (typeof callback === "function") {
    ret._async = true;
    ret._get = function (cb) {
      return args.concat([ret.doc, function () {
        if (typeof cb === "function") cb.apply(this, arguments);
        callback.apply(this, arguments);
      }]);
    };
  }

  return ret;
});

CollectionHooks.defineAdvice("insert", function (userId, _super, args) {
  var self = this;
  var ctx = {context: self, _super: _super};
  var _insert;

  // before
  if (self._advice && self._advice.before) {
    _.each(self._advice.before.insert, function (advice) {
      advice.call(ctx, userId, args.doc);
    });
  }

  function after(err, id) {
    args.doc._id = id;
    if (self._advice && self._advice.after) {
      _.each(self._advice.after.insert, function (advice) {
        advice.call(ctx, userId, args.doc);
      });
    }
  }

  if (Meteor.isServer) {
    // OOPS, this won't even get called... remember, we're dealing with the
    // client doing a method call ("/collection-name/insert"). Maybe we should
    // be looking at these method calls instead and hook there??

    // deal with validators -- wrap _collection
    _insert = self._collection.insert;
    console.log(_insert);
  }

  if (args._async) {
    _super.apply(self, args._get(function (err, id) {
      after(err, id);
    }));
  } else {
    ret = _super.apply(self, args._get());
    after(null, ret);
  }

  return ret;
});