Tinytest.addAsync("update - server collection documents should have extra properties added before and after being updated despite selector not being _id", function (test, next) {
  var collection = new Meteor.Collection(null);

  collection.before.update(function (userId, doc, fieldNames, modifier, options) {
    if (modifier && modifier.$set && modifier.$set.test) {
      modifier.$set.before_update_value = true;
    }
  });

  collection.after.update(function (userId, doc, fieldNames, modifier, options) {
    if (modifier && modifier.$set && modifier.$set.test) {
      collection.update({_id: doc._id}, {$set: {after_update_value: true}});
    }
  });

  collection.insert({not_an_id: "testing"}, function (err, id1) {
    if (err) throw err;
    collection.insert({not_an_id: "testing"}, function (err, id2) {
      if (err) throw err;
      collection.insert({not_an_id: "testing"}, function (err, id3) {
        if (err) throw err;
        collection.update({not_an_id: "testing"}, {$set: {not_an_id: "newvalue", test: true}}, {multi: true}, function (err) {
          if (err) throw err;
          test.equal(collection.find({not_an_id: "newvalue", before_update_value: true, after_update_value: true}).count(), 3, "number of docs found should be 3");
          next();
        });
      });
    });
  });
});