// TODO: can't get this to work... don't have a simple mechanism to test
// something that relies on both server and client tests talking to each other

// For future implementation - see as example
// https://github.com/meteor/meteor/blob/master/packages/mongo-livedata/allow_tests.js

return;

var CollectionFactory = (function () {
	var collection = new Meteor.Collection("___collection_hook_tests");

	if (Meteor.isServer) {
		collection.allow({
			insert: function (userId, doc) {
				return doc.allow_insert;
			},
			update: function (userId, doc, fieldNames, modifier) {
				return doc.allow_update;
			},
			remove: function (userId, doc) {
				return doc.allow_remove;
			}
		});

		Meteor.publish("all", function () {
			return collection.find({});
		});
	} else {
		Meteor.startup(function () {
			Meteor.subscribe("all");
		});
	}

	return {
		get: function (next) {
			if (Meteor.isServer) {
				collection.remove({}, function (err) {
					if (!err) next(collection);
				});
			} else {
				next(collection);
			}
		}
	};
})();

CollectionFactory.get(function (Collection) {
	Collection.clearHooks("before", "remove");

	if (Meteor.isServer) {
		Tinytest.addAsync("before remove -- collection should be empty", function (test, next) {
			test.equal(Collection.find({a: 1}).count(), 0);
			next();
		});

		Tinytest.addAsync("before remove access granted -- server", function (test, next) {
			test.equal(Collection.find({a: 1}).count(), 0);

			console.log("BIND BEFORE REMOVE")
			Collection.before("remove", function (userId, selector) {
				console.log("REMOVE CALLED", selector)
				//test.equal(Collection.find({a: 1}).count(), 1);
				next();
			});
		});
	}

	if (Meteor.isClient) {
		Tinytest.addAsync("before remove access granted -- client", function (test, next) {
			Collection.insert({a: 1, allow_insert: true, allow_remove: true}, function (err, id) {
				console.log("INSERT CALLED", id)
				test.equal(Collection.find({a: 1}).count(), 1);

				Collection.remove({_id: id}, function (err) {
					test.equal(Collection.find({a: 1}).count(), 0);
					next();
				});
			});
		});
	}
});
