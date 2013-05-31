Tinytest.addAsync("before insert", function (test, next) {
	var Collection = new Meteor.Collection(null);

	test.equal(Collection.find({a: 1}).count(), 0);

	Collection.before("insert", function (userId, doc) {
		test.equal(Collection.find({a: 1}).count(), 0);
		doc.b = 2;
	});

	Collection.insert({a: 1}, function (err, id) {
		test.equal(Collection.find({a: 1, b: 2}).count(), 1);
		next();
	});
});

Tinytest.addAsync("after insert", function (test, next) {
	var Collection = new Meteor.Collection(null);

	test.equal(Collection.find({a: 1}).count(), 0);

	Collection.after("insert", function (userId, doc) {
		test.equal(doc.a, 1);
		test.equal(Collection.find({a: 1}).count(), 1);
		next();
	});

	Collection.insert({a: 1}, function (err, id) {
		test.equal(Collection.find({a: 1}).count(), 1);
	});
});

Tinytest.add("before update", function (test) {
	var Collection = new Meteor.Collection(null);

	test.equal(Collection.find({a: 1}).count(), 0);

	Collection.insert({a: 1}, function (err, id) {
		test.equal(Collection.find({a: 1}).count(), 1);
		test.equal(Collection.find({a: 1, b: 2}).count(), 0);

		Collection.before("update", function (userId, selector, modifier, options) {
			test.equal(Collection.find({a: 1, b: 2}).count(), 0);
			modifier.$set.c = 3;
		});

		Collection.update(id, {$set: {b: 2}}, {}, function (err) {
			test.equal(Collection.find({a: 1, b: 2, c: 3}).count(), 1);
		});
	});
});

Tinytest.addAsync("after update", function (test, next) {
	var Collection = new Meteor.Collection(null);

	test.equal(Collection.find({a: 1}).count(), 0);

	Collection.insert({a: 1}, function (err, id) {
		test.equal(Collection.find({a: 1}).count(), 1);

		Collection.after("update", function (userId, selector, modifier, options, previous) {
			test.equal(Collection.find({a: 1, b: 2}).count(), 1);

			test.length(previous, 1);
			if (previous.length === 1) {
				test.equal(previous[0].a, 1);
				test.isUndefined(previous[0].b);
			}

			next();
		});

		Collection.update(id, {$set: {b: 2}});
	});
});

Tinytest.addAsync("before remove", function (test, next) {
	var Collection = new Meteor.Collection(null);

	test.equal(Collection.find({a: 1}).count(), 0);

	Collection.insert({a: 1}, function (err, id) {
		var b = null;

		test.equal(Collection.find({a: 1}).count(), 1);

		Collection.before("remove", function (userId, selector) {
			test.equal(Collection.find({a: 1}).count(), 1);
			b = 2;
		});

		Collection.remove(id, function (err) {
			test.equal(Collection.find({a: 1}).count(), 0);
			test.equal(b, 2);
			next();
		});
	});
});

Tinytest.addAsync("after remove", function (test, next) {
	var Collection = new Meteor.Collection(null);

	test.equal(Collection.find({a: 1}).count(), 0);

	Collection.insert({a: 1}, function (err, id) {

		test.equal(Collection.find({a: 1}).count(), 1);

		Collection.after("remove", function (userId, selector, previous) {
			test.equal(Collection.find({a: 1}).count(), 0);

			test.length(previous, 1);
			if (previous.length === 1) {
				test.equal(previous[0].a, 1);
			}

			next();
		});

		Collection.remove(id);
	});
});

/*
//write these later
Tinytest.addAsync("multiple before hooks on same collection", function (test, next) {
	next();
});

Tinytest.addAsync("multiple after hooks on same collection", function (test, next) {
	next();
});
*/