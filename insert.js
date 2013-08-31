CollectionHooks.wrapMethod("insert");

CollectionHooks.defineArgParser("insert", function (args, ret, offset) {
  var callback;

  ret.doc = args[0 + offset];
  callback = args[1 + offset];

  if (typeof callback === "function") {
    ret._async = true;
    ret._get = function (cb) {
      return args.slice(0, offset).concat([ret.doc, function () {
        if (typeof cb === "function") cb.apply(this, arguments);
        callback.apply(this, arguments);
      }]);
    };
  }

  return ret;
});

CollectionHooks.defineAdvice("insert", function (userId, _super, advice, args) {
  var self = this;
  var ctx = {context: self, _super: _super};

  //console.log("inside insert advice", args, self)

  // before
  if (advice.before) {
    _.each(advice.before.insert, function (advice) {
      advice.call(ctx, userId, args.doc);
    });
  }

  function after() {
    //args.doc._id = id;
    if (advice.after) {
      _.each(advice.after.insert, function (advice) {
        advice.call(ctx, userId, args.doc);
      });
    }
  }

  if (args._async) {
    _super.apply(self, args._get(function (err, id) {
      after(/*err, id*/);
    }));
  } else {
    //console.log(_super.toString())
    _super.apply(self, args._get());
    after(/*null, ret._id || ret*/);
  }

  return args.doc._id || null;
});