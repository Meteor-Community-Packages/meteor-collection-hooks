var Collection = new Meteor.Collection("tests_publish");

if (Meteor.isServer) {
	(function () {

		Meteor.methods({
			tests_publish_reset: function () {
				Collection.remove({});
				Collection.insert({pass: false});
				Collection.insert({pass: true});
			}
		});

		Meteor.call("tests_publish_reset", function () {
			Meteor.publish("tests_publish", function () {
				return Collection.find({pass: (this.userId === Meteor.__collection_hooks_publish_userId)});
			});
		});

	})();
}

if (Meteor.isClient) {
	(function () {

		Tinytest.addAsync("global publish_userId available within publish", function (test, next) {
			function run() {
				Meteor.call("tests_publish_reset", function (err, result) {
					test.equal(!!err, false);

					var handle = Meteor.subscribe("tests_publish", function () {
						var doc = Collection.findOne({pass: true});
						if (doc) {
							next();
						}
					});
				});
			}

			if (Meteor.userId()) {
				Meteor._debug("already logged in -- running tests");
				run();
			} else {
				Meteor._debug("logging in to run tests");
				Meteor.insecureUserLogin("tests_publish", run);
			}
		});

	})();
}