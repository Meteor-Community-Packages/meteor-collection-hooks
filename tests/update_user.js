Tinytest.addAsync("update - Meteor.users collection document should have extra property added before being updated", function (test, next) {
  var collection = Meteor.users;

  function start() {
    var aspect = collection.before.update(function (userId, doc, fieldNames, modifier) {
      if (modifier && modifier.$set && modifier.$set.test) {
        modifier.$set.before_update_value = true;
      }
    });

    function ok(user) {
      collection.update({_id: user._id}, {$set: {update_value: true, test: 2}}, function (err) {
        if (err) throw err;
        test.equal(collection.find({_id: user._id, update_value: true, before_update_value: true}).count(), 1, "number of users found should be 1");
        collection.remove({_id: user._id});
        aspect.remove();
        next();
      });
    }

    var user = collection.findOne({test: 2});

    if (!user) {
      collection.insert({test: 2}, function (err, id) {
        if (err) throw err;
        ok(collection.findOne({_id: id}));
      });
    } else {
      ok(user);
    }
  }

  InsecureLogin.ready(start);
});