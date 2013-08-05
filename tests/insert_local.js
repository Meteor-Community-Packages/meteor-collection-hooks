Tinytest.addAsync("local collection document should have extra property added before being inserted", function (test, next) {
	var collection = new Meteor.Collection(null);

	collection.before({
		insert: function (userId, doc) {
			// There should be a userId if we're running on the client.
			// Since this is a local collection, the server should NOT know
			// about any userId
			if (Meteor.isServer) {
				test.equal(userId, undefined);
			} else {
				test.notEqual(userId, undefined);
			}
			doc.before_insert_value = true;
		}
	});

	InsecureLogin.ready(function () {
		collection.insert({start_value: true}, function (err, id) {
			if (err) throw err;
			test.equal(collection.find({start_value: true, before_insert_value: true}).count(), 1);
			next();
		});
	});
});

Tinytest.addAsync("local collection should fire after-insert hook", function (test, next) {
	var collection = new Meteor.Collection(null);

	collection.after({
		insert: function (userId, doc) {
			// There should be a userId if we're running on the client.
			// Since this is a local collection, the server should NOT know
			// about any userId
			if (Meteor.isServer) {
				test.equal(userId, undefined);
			} else {
				test.notEqual(userId, undefined);
			}

			// Out of convenience, we provide the inserted doc (includes _id)
			test.notEqual(doc._id, undefined);

			next();
		}
	});

	InsecureLogin.ready(function () {
		collection.insert({start_value: true});
	});
});