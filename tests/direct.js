var Mongo = this.Mongo || this.Meteor;

_.each([null, "direct_collection_test"], function (ctype) {

  Tinytest.add("direct - hooks should not be fired when using .direct (collection type " + ctype + ")", function (test) {
    // console.log("-------", ctype)

    var collection = new Mongo.Collection(ctype, {connection: null});
    var hookCount = 0;

    // The server will make a call to find when findOne is called, which adds 2 extra counts
    var hookCountTarget = Meteor.isServer ? 12 : 10;

    // Full permissions on collection
    collection.allow({
      insert: function () { return true; },
      update: function () { return true; },
      remove: function () { return true; }
    });

    collection.before.insert(function (userId, doc) {
      if (doc && doc.test) {
        hookCount++;
        // console.log(ctype, ": before insert", hookCount)
      }
    });

    collection.after.insert(function (userId, doc) {
      if (doc && doc.test) {
        hookCount++;
        // console.log(ctype, ": after insert", hookCount)
      }
    });

    collection.before.update(function (userId, doc, fieldNames, modifier, options) {
      if (options && options.test) {
        hookCount++;
        // console.log(ctype, ": before update", hookCount)
      }
    });

    collection.after.update(function (userId, doc, fieldNames, modifier, options) {
      if (options && options.test) {
        hookCount++;
        // console.log(ctype, ": after update", hookCount)
      }
    });

    collection.before.remove(function (userId, doc) {
      if (doc && doc._id === "test") {
        hookCount++;
        // console.log(ctype, ": before remove", hookCount)
      }
    });

    collection.after.remove(function (userId, doc) {
      if (doc && doc._id === "test") {
        hookCount++;
        // console.log(ctype, ": after remove", hookCount)
      }
    });

    collection.before.find(function (userId, selector, options) {
      if (options && options.test) {
        hookCount++;
        // console.log(ctype, ": before find", hookCount)
      }
    });

    collection.after.find(function (userId, selector, options, result) {
      if (options && options.test) {
        hookCount++;
        // console.log(ctype, ": after find", hookCount)
      }
    });

    collection.before.findOne(function (userId, selector, options) {
      if (options && options.test) {
        hookCount++;
        // console.log(ctype, ": before findOne", hookCount)
      }
    });

    collection.after.findOne(function (userId, selector, options, result) {
      if (options && options.test) {
        hookCount++;
        // console.log(ctype, ": after findOne", hookCount)
      }
    });

    collection.insert({_id: "test", test: 1});
    collection.update({_id: "test"}, {$set: {test: 1}}, {test: 1});
    collection.find({}, {test: 1});
    collection.findOne({}, {test: 1});
    collection.remove({_id: "test"});

    test.equal(hookCount, hookCountTarget);

    // These should in no way affect the hookCount, which is essential in proving
    // that the direct calls are functioning as intended
    collection.direct.insert({_id: "test", test: 1});

    collection.direct.update({_id: "test"}, {$set: {test: 1}}, {test: 1});

    var cursor = collection.direct.find({}, {test: 1});
    var count = cursor.count();
    test.equal(count, 1);

    var doc = collection.direct.findOne({}, {test: 1});
    test.equal(doc.test, 1);

    collection.direct.remove({_id: "test"});


    test.equal(hookCount, hookCountTarget);
  });

});