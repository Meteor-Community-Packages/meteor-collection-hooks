var collection = new Meteor.Collection("test_collection_for_find_findone_userid");

if (Meteor.isServer) {
  Tinytest.addAsync("find - userId available to before find hook when within publish context", function (test, next) {
    console.log("DECLARE HOOK FOR BEFORE FIND")
    collection.before.find(function (userId, selector, options) {
      console.log("got to before find")
      if (options && options.test) { // ignore other calls to find (caused by insert/update)
        test.notEqual(userId, undefined);
        next();
      }
    });
  });

  Tinytest.addAsync("find - userId available to after find hook when within publish context", function (test, next) {
    console.log("DECLARE HOOK FOR AFTER FIND")
    collection.after.find(function (userId, selector, options, result) {
      console.log("got to after find")
      if (options && options.test) { // ignore other calls to find (caused by insert/update)
        test.notEqual(userId, undefined);
        next();
      }
    });
  });

  Tinytest.addAsync("findone - userId available to before findOne hook when within publish context", function (test, next) {
    console.log("DECLARE HOOK FOR BEFORE FINDONE")
    collection.before.findOne(function (userId, selector, options) {
      console.log("got to before findOne")
      if (options && options.test) { // ignore other calls to find (caused by insert/update)
        test.notEqual(userId, undefined);
        next();
      }
    });
  });

  Tinytest.addAsync("findone - userId available to after findOne hook when within publish context", function (test, next) {
    console.log("DECLARE HOOK FOR AFTER FINDONE")
    collection.after.findOne(function (userId, selector, options, result) {
      console.log("got to after findOne")
      if (options && options.test) { // ignore other calls to find (caused by insert/update)
        test.notEqual(userId, undefined);
        next();
      }
    });
  });

  collection.remove({});
  collection.insert({test: 1}, function (err, id) {});

  Meteor.publish("test_publish_for_find_findone_userid", function () {
    console.log("PUBLISHING")
    collection.findOne({}, {test: 1});
    return collection.find({}, {test: 1});
  });
}

if (Meteor.isClient) {
  InsecureLogin.ready(function () {
    Meteor.subscribe("test_publish_for_find_findone_userid");
  });
}