if (Meteor.isServer) {
  (function () {

    var CollectionBeforeFind = new Meteor.Collection("tests_publish_collection_for_before_find");
    var CollectionAfterFind = new Meteor.Collection("tests_publish_collection_for_after_find");
    var CollectionBeforeFindOne = new Meteor.Collection("tests_publish_collection_for_before_findone");
    var CollectionAfterFindOne = new Meteor.Collection("tests_publish_collection_for_after_findone");

    Meteor.methods({
      tests_publish_collection_reset: function () {
        CollectionBeforeFind.remove({});
        CollectionAfterFind.remove({});
        CollectionBeforeFindOne.remove({});
        CollectionAfterFindOne.remove({});

        CollectionBeforeFind.insert({a: 1});
        CollectionAfterFind.insert({a: 1});
        CollectionBeforeFindOne.insert({a: 1});
        CollectionAfterFindOne.insert({a: 1});
      }
    });

    Meteor.publish("test_publish_for_before_find", function () {
      return CollectionBeforeFind.find({}, {test: 1});
    });

    Meteor.publish("test_publish_for_after_find", function () {
      return CollectionAfterFind.find({}, {test: 1});
    });

    Meteor.publish("test_publish_for_before_findone", function () {
      var doc = CollectionBeforeFindOne.findOne({}, {test: 1});
      return CollectionBeforeFindOne.find();  // still need to return a cursor
    });

    Meteor.publish("test_publish_for_after_findone", function () {
      var doc = CollectionAfterFindOne.findOne({}, {test: 1});
      return CollectionAfterFindOne.find(); // still need to return a cursor
    });

    Tinytest.addAsync("find - userId available to before find hook when within publish context", function (test, next) {
      // Setup the hook
      CollectionBeforeFind.before.find(function (userId, selector, options) {
        if (options && options.test) { // ignore other calls to find (caused by insert/update)
          test.notEqual(userId, undefined);
          next();
        }
      });

      // Trigger the publish to run by modifying the collection it references
      CollectionBeforeFind.update({a: 1}, {$inc: {b: 1}});
    });

    Tinytest.addAsync("find - userId available to after find hook when within publish context", function (test, next) {
      CollectionAfterFind.after.find(function (userId, selector, options, result) {
        if (options && options.test) { // ignore other calls to find (caused by insert/update)
          test.notEqual(userId, undefined);
          next();
        }
      });

      CollectionAfterFind.update({a: 1}, {$inc: {b: 1}});
    });

    Tinytest.addAsync("findone - userId available to before findOne hook when within publish context", function (test, next) {
      CollectionBeforeFindOne.before.findOne(function (userId, selector, options) {
        if (options && options.test) { // ignore other calls to find (caused by insert/update)
          test.notEqual(userId, undefined);
          next();
        }
      });

      CollectionBeforeFindOne.update({a: 1}, {$inc: {b: 1}});
    });

    Tinytest.addAsync("findone - userId available to after findOne hook when within publish context", function (test, next) {
      CollectionAfterFindOne.after.findOne(function (userId, selector, options, result) {
        if (options && options.test) { // ignore other calls to find (caused by insert/update)
          test.notEqual(userId, undefined);
          next();
        }
      });

      CollectionAfterFindOne.update({a: 1}, {$inc: {b: 1}});
    });

  })();
}

if (Meteor.isClient) {
  (function () {
    function run() {
      Meteor.call("tests_publish_collection_reset", function (err, result) {
        // Subscribe, otherwise publishes will never run their callbacks
        Meteor.subscribe("test_publish_for_before_find");
        Meteor.subscribe("test_publish_for_after_find");
        Meteor.subscribe("test_publish_for_before_findone");
        Meteor.subscribe("test_publish_for_after_findone");
      });
    }

    InsecureLogin.ready(run);
  })();
}