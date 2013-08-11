Tinytest.addAsync("insert - Meteor.users collection document should have extra property added before being inserted", function (test, next) {
  var collection = Meteor.users;

  collection.before({
    insert: function (nil, doc) {
      if (!doc.profile) doc.profile = {};
      doc.profile.before_insert_value = true;
    }
  });

  collection.insert({profile: {start_value: true}}, function (err, id) {
    if (err) throw err;
    test.equal(collection.find({"profile.start_value": true, "profile.before_insert_value": true}).count(), 1);
    collection.remove({_id: id});
    next();
  });
});