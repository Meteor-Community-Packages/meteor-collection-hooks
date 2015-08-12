var Collection = typeof Mongo !== "undefined" && typeof Mongo.Collection !== "undefined" ? Mongo.Collection : Meteor.Collection;

Tinytest.addAsync("upsert - hooks should all fire the appropriate number of times", function (test, next) {
  var collection = new Collection(null);
  var counts = {
    before: {
      insert: 0,
      update: 0,
      remove: 0,
      upsert: 0
    },
    after: {
      insert: 0,
      update: 0,
      remove: 0,
      upsert: 0
    }
  };

  collection.before.insert(function () { counts.before.insert++; });
  collection.before.update(function () { counts.before.update++; });
  collection.before.remove(function () { counts.before.remove++; });
  collection.before.upsert(function () { counts.before.upsert++; });

  collection.after.insert(function () { counts.after.insert++; });
  collection.after.update(function () { counts.after.update++; });
  collection.after.remove(function () { counts.after.remove++; });
  collection.after.upsert(function () { counts.after.upsert++; });

  InsecureLogin.ready(function () {
    collection.remove({test: true}, function (err) {
      if (err) throw err;
      collection.upsert({test: true}, {test: true, step: "insert"}, function (err, obj) {
        if (err) throw err;
        collection.upsert(obj.insertedId, {test: true, step: "update"}, function (err) {
          if (err) throw err;
          test.equal(counts.before.insert, 0);
          test.equal(counts.before.update, 0);
          test.equal(counts.before.remove, 0);
          test.equal(counts.before.upsert, 2);
          test.equal(counts.after.insert, 1);
          test.equal(counts.after.update, 1);
          test.equal(counts.after.remove, 0);
          test.equal(counts.after.upsert, 0);
          next();
        });
      });
    });
  });
});

Tinytest.addAsync("upsert - calling update with upsert:true should call before.upsert instead of before.update", function (test, next) {
  var collection = new Collection(null);
  var counts = {
    before: {
      update: 0,
      upsert: 0
    }
  };

  collection.before.update(function () { counts.before.update++; });
  collection.before.upsert(function () { counts.before.upsert++; });

  InsecureLogin.ready(function () {
    collection.remove({test: true}, function (err) {
      if (err) throw err;
      collection.update({test: true}, {test: true, step: "insert"}, {upsert: true}, function (err, obj) {
        if (err) throw err;
        test.equal(counts.before.update, 0);
        test.equal(counts.before.upsert, 1);
        next();
      });
    });
  });
});

// TODO: we should also test the synchronous version of upsert hooks