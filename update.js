// TODO: write this!
// TODO: Make sure if options is ommitted, the callback is still called

Meteor.Collection.prototype._hookedUpdate = function (opts, selector, mutator, options, callback) {
  var self = this;
  var result;

  // before
  _.each(opts.hooks.before, function (hook) {
  	//
  });

  function after() {
    _.each(opts.hooks.after, function (hook) {
      //
    });
  }

  if (opts.fromPublicApi) {
    // Called from public API (Meteor.Collection.prototype.XXX)
    return opts._super.call(self, selector, mutator, options, function () {
      after();
      callback && callback.apply(self, arguments);
    });
  } else {
    // Called from private API (_collection.XXX)
    result = opts._super.call(self, selector, mutator, options);
    after();
    return result;
  }
};