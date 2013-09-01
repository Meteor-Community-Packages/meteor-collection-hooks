Tinytest.addAsync("update - Meteor.users collection document should have extra property added before being updated", function (test, next) {
  var collection = Meteor.users;

  function start() {
    collection.before.update(function (userId, doc, fieldNames, modifier) {
      modifier.$set.before_update_value = true;
    });

    var user = collection.findOne();

    collection.update({_id: user._id}, {$set: {update_value: true}}, function (err) {
      if (err) throw err;
      test.equal(collection.find({_id: user._id, update_value: true, before_update_value: true}).count(), 1);
      next();
    });
  }

  InsecureLogin.ready(start);
});