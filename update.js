CollectionHooks.defineAdvice("update", function (userId, _super, aspects, args) {
  var self = this;
  var ctx = {context: self, _super: _super};
  var async = _.isFunction(_.last(args));

  if (async) {
    return _super.apply(self, CollectionHooks.afterTrailingCallback(args, function (err, id) {
      //after();
    }));
  } else {
    return _super.apply(self, args);
    //after();
  }
});