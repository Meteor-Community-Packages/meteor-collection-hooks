var collection = new Meteor.Collection("test_collection_for_find_findone_userid");

var beforeFindUserId, afterFindUserId, beforeFindOneUserId, afterFindOneUserId;

// Don't declare hooks in publish method, as it is problematic
collection.before.find(function (userId, selector, options) {
  if (options && options.test) { // ignore other calls to find (caused by insert/update)
    beforeFindUserId = userId;
  }
});

collection.after.find(function (userId, selector, options, result) {
  if (options && options.test) { // ignore other calls to find (caused by insert/update)
    afterFindUserId = userId;
  }
});

collection.before.findOne(function (userId, selector, options) {
  if (options && options.test) { // ignore other calls to find (caused by insert/update)
    beforeFindOneUserId = userId;
  }
});

collection.after.findOne(function (userId, selector, options, result) {
  if (options && options.test) { // ignore other calls to find (caused by insert/update)
    afterFindOneUserId = userId;
  }
});

if (Meteor.isServer) {
  var serverTestsAdded = false;

  Meteor.publish("test_publish_for_find_findone_userid", function () {
    beforeFindUserId = null;
    afterFindUserId = null;
    beforeFindOneUserId = null;
    afterFindOneUserId = null;

    // Trigger hooks
    collection.find({}, {test: 1});
    collection.findOne({}, {test: 1});

    if (!serverTestsAdded) {
      serverTestsAdded = true;

      Tinytest.add("find - userId available to before find hook when within publish context", function (test) {
        test.notEqual(beforeFindUserId, null);
      });

      Tinytest.add("find - userId available to after find hook when within publish context", function (test) {
        test.notEqual(afterFindUserId, null);
      });

      Tinytest.add("findone - userId available to before findOne hook when within publish context", function (test) {
        test.notEqual(beforeFindOneUserId, null);
      });

      Tinytest.add("findone - userId available to after findOne hook when within publish context", function (test) {
        test.notEqual(afterFindOneUserId, null);
      });
    }

    return;
  });
}

if (Meteor.isClient) {
  function cleanup() {
    beforeFindUserId = null;
    afterFindUserId = null;
    beforeFindOneUserId = null;
    afterFindOneUserId = null;
  }

  function withLogin(testFunc) {
    return function() {
      // grab arguments passed to testFunc (i.e. "test")
      var context = this;
      var args = arguments;

      function wrapper(cb) {
        InsecureLogin.ready(function() {
          cleanup();
          var err;

          try {
            var result = testFunc.apply(context, args);
            cb(null, result);
          } catch (error) {
            err = error;
            cb(err);
          } finally {
            cleanup();
          }
        });
      };

      return Meteor._wrapAsync(wrapper); // Don't run this function, just wrap it
    };
  }

  // Run client tests.
  // TODO: Somehow, Tinytest.add / addAsync doesn't work inside InsecureLogin.ready().
  // Hence, we add these tests wrapped synchronously with a login hook.

  // Ideally, this function should wrap the test functions.
  Tinytest.add("find - userId available to before find hook", withLogin(function(test) {
    collection.find({}, {test: 1});
    test.notEqual(beforeFindUserId, null);
  }));

  Tinytest.add("find - userId available to after find hook", withLogin(function(test) {
    collection.find({}, {test: 1});
    test.notEqual(afterFindUserId, null);
  }));

  Tinytest.add("findone - userId available to before findOne hook", withLogin(function(test) {
    collection.findOne({}, {test: 1});
    test.notEqual(beforeFindOneUserId, null);
  }));

  Tinytest.add("findone - userId available to after findOne hook", withLogin(function(test) {
    collection.findOne({}, {test: 1});
    test.notEqual(afterFindOneUserId, null);
  }));

  InsecureLogin.ready(function () {
    // Run server tests
    Meteor.subscribe("test_publish_for_find_findone_userid");
  });
}
