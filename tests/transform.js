Tinytest.addAsync("general - hook callbacks should have transformed docs", function (test, next) {
  var collection = new Meteor.Collection(null);
  var counts = {
    before: {
      insert: 0,
      update: 0,
      remove: 0
    },
    after: {
      insert: 0,
      update: 0,
      remove: 0
    }
  };

  collection.before({
    insert: function (userId, doc) { if (doc.isTransformed) { counts.before.insert++; } },
    update: function (userId, doc) { if (doc.isTransformed) { counts.before.update++; } },
    remove: function (userId, doc) { if (doc.isTransformed) { counts.before.remove++; } },
    transform: function (doc) {
      return _.extend(doc, {isTransformed: true});
    }
  });

  collection.after({
    insert: function (userId, doc) { if (doc.isTransformed) { counts.after.insert++; } },
    update: function (userId, doc) { if (doc.isTransformed) { counts.after.update++; } },
    remove: function (userId, doc) { if (doc.isTransformed) { counts.after.remove++; } },
    transform: function (doc) {
      return _.extend(doc, {isTransformed: true});
    }
  });

  InsecureLogin.ready(function () {
    collection.insert({start_value: true}, function (err, id) {
      if (err) throw err;
      collection.update({_id: id}, {$set: {}}, function (err) {
        if (err) throw err;
        collection.remove({_id: id}, function (err) {
          test.equal(counts.before.insert, 1);
          test.equal(counts.before.update, 1);
          test.equal(counts.before.remove, 1);
          test.equal(counts.after.insert, 1);
          test.equal(counts.after.update, 1);
          test.equal(counts.after.remove, 1);
          next();
        })
      });
    });
  });
});