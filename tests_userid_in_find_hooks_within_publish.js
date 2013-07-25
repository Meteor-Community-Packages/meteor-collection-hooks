var CollectionBeforeFind = new Meteor.Collection("tests_publish_collection_for_before_find");
var CollectionAfterFind = new Meteor.Collection("tests_publish_collection_for_after_find");
var CollectionBeforeFindOne = new Meteor.Collection("tests_publish_collection_for_before_findone");
var CollectionAfterFindOne = new Meteor.Collection("tests_publish_collection_for_after_findone");

if (Meteor.isServer) {
	(function () {

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
			return CollectionBeforeFind.find();
		});

		Meteor.publish("test_publish_for_after_find", function () {
			return CollectionAfterFind.find();
		});

		Meteor.publish("test_publish_for_before_findone", function () {
			var doc = CollectionBeforeFindOne.findOne();
			return CollectionBeforeFindOne.find();	// still need to return a cursor
		});

		Meteor.publish("test_publish_for_after_findone", function () {
			var doc = CollectionAfterFindOne.findOne();
			return CollectionAfterFindOne.find();	// still need to return a cursor
		});

		Tinytest.addAsync("userId available to before find hook when within publish context", function (test, next) {
			// Setup the hook
			CollectionBeforeFind.clearHooks("before", "find");
			CollectionBeforeFind.before("find", function (userId, selector, options) {
				test.equal(!!userId, true);
				next();
			});

			// Trigger the publish to run by modifying the collection it references
			CollectionBeforeFind.update({a: 1}, {$set: {b: 1}});
		});

		Tinytest.addAsync("userId available to after find hook when within publish context", function (test, next) {
			CollectionAfterFind.clearHooks("after", "find");
			CollectionAfterFind.after("find", function (userId, selector, options, result) {
				test.equal(!!userId, true);
				next();
			});
			CollectionAfterFind.update({a: 1}, {$set: {b: 1}});
		});

		Tinytest.addAsync("userId available to before findOne hook when within publish context", function (test, next) {
			CollectionBeforeFindOne.clearHooks("before", "findOne");
			CollectionBeforeFindOne.before("findOne", function (userId, selector, options) {
				test.equal(!!userId, true);
				next();
			});
			CollectionBeforeFindOne.update({a: 1}, {$set: {b: 1}});
		});

		Tinytest.addAsync("userId available to after findOne hook when within publish context", function (test, next) {
			CollectionAfterFindOne.clearHooks("after", "findOne");
			CollectionAfterFindOne.after("findOne", function (userId, selector, options, result) {
				test.equal(!!userId, true);
				next();
			});
			CollectionAfterFindOne.update({a: 1}, {$set: {b: 1}});
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

		if (Meteor.userId()) {
			Meteor._debug("already logged in -- running tests");
			run();
		} else {
			Meteor._debug("logging in to run tests");
			Meteor.insecureUserLogin("tests_userid_in_find_hooks_within_publish", run);
		}

	})();
}