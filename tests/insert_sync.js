// TODO: write test to verify allow/deny is functioning properly with hooks

var collection1 = new Meteor.Collection("test_insert_collection1");

if (Meteor.isServer) {
	Tinytest.addAsync("collection1 document should have extra property added to it before it is inserted", function (test, next) {
		collection1.remove({});

		collection1.before({
			insert: function (userId, doc) {
				// There should be no userId because the insert was initiated
				// on the server -- there's no correlation to any specific user
				//test.equal(userId, undefined);	// FIX: when refreshing test, this line stops execution
				doc.before_insert_value = true;
			}
		});

		collection1.insert({start_value: true}, function () {
			test.equal(collection1.find({start_value: true, before_insert_value: true}).count(), 1);
			next();
		});
	});
}

var collection2 = new Meteor.Collection("test_insert_collection2");

if (Meteor.isServer) {
	// full client-side access
	collection2.allow({
		insert: function () { return true; },
		update: function () { return true; },
		remove: function () { return true; }
	});

	Meteor.methods({
		test_insert_reset_collection2: function () {
			collection2.remove({});
		}
	});

	Meteor.publish("test_insert_publish_collection2", function () {
		return collection2.find();
	});

	collection2.before({
		insert: function (userId, doc) {
			doc.server_value = true;
		}
	});
}

if (Meteor.isClient) {
	Meteor.subscribe("test_insert_publish_collection2");

	Tinytest.addAsync("collection2 document should have client-added and server-added extra properties added to it before it is inserted", function (test, next) {
		collection2.before({
			insert: function (userId, doc) {
				// Insert is initiated on the client, a userId must be present
				test.notEqual(userId, undefined);
				test.equal(collection2.find({start_value: true}).count(), 0);
				doc.client_value = true;
			}
		});

		collection2.after({
			insert: function (userId, doc) {
				test.equal(collection2.find({start_value: true, client_value: true, server_value: true}).count(), 1);
				test.notEqual(doc._id, undefined);
				next();
			}
		});

		InsecureLogin.ready(function () {
			Meteor.call("test_insert_reset_collection2", function (err, result) {
				collection2.insert({start_value: true});
			});
		});
	});
}