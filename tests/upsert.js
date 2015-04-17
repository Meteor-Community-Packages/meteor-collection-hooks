var Collection = typeof Mongo !== "undefined" && typeof Mongo.Collection !== "undefined" ? Mongo.Collection : Meteor.Collection;

_.each([null, "upsert_test_collection"], function (cname) {
  Tinytest.addAsync("upsert - hooks should all fire the appropriate number of times (" + cname + ")", function (test, next) {
    var collection = new Collection(cname);
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
    collection.before.upsert(function () { counts.before.insert++; });

    collection.after.insert(function () { counts.after.insert++; });
    collection.after.update(function () { counts.after.update++; });
    collection.after.remove(function () { counts.after.remove++; });
    collection.after.upsert(function () { counts.after.upsert++; });

    InsecureLogin.ready(function () {
      collection.remove({_id: "upsertid"}, function (err) {
        if (err) throw err;
        collection.upsert({}, {_id: "upsertid", step: "insert"}, function (err, id) {
          if (err) throw err;
          collection.upsert({}, {_id: "upsertid", step: "update"}, function (err) {
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
});