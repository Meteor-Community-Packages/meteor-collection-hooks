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
  Meteor.publish("test_publish_for_find_findone_userid", function () {
    console.log("PUBLISHING");

    beforeFindUserId = null;
    afterFindUserId = null;
    beforeFindOneUserId = null;
    afterFindOneUserId = null;

    // Trigger hooks
    collection.find({}, {test: 1});
    collection.findOne({}, {test: 1});

    // TODO: reloading the browser will break these tests, because duplicate names are generated.

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

    return;
  });
}

if (Meteor.isClient) {
  beforeFindUserId = null;
  afterFindUserId = null;
  beforeFindOneUserId = null;
  afterFindOneUserId = null;

  // Trigger hooks
  collection.find({}, {test: 1});
  collection.findOne({}, {test: 1});

  // Run client tests.
  // TODO: Somehow, Tinytest.add / addAsync doesn't work inside InsecureLogin.ready().

  Tinytest.add("find - userId available to before find hook", function(test) {
    test.notEqual(beforeFindUserId, null);
  });

  Tinytest.add("find - userId available to after find hook", function(test) {
    test.notEqual(afterFindUserId, null);
  });

  Tinytest.add("findone - userId available to before findOne hook", function(test) {
    test.notEqual(beforeFindOneUserId, null);
  });

  Tinytest.add("findone - userId available to after findOne hook", function(test) {
    test.notEqual(afterFindOneUserId, null);
  });

  InsecureLogin.ready(function () {
    console.log("TRIGGERING SERVER FIND TESTS");
    // Run server tests
    Meteor.subscribe("test_publish_for_find_findone_userid");
  });
}
