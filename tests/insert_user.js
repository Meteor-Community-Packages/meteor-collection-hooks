Tinytest.addAsync("insert - Meteor.users collection document should have extra property added before being inserted", function (test, next) {
  var collection = Meteor.users;

  var aspect = collection.before.insert(function (nil, doc) {
    if (doc && doc.test) {
      doc.before_insert_value = true;
    }
  });

  collection.insert({start_value: true, test: 1}, function (err, id) {
    if (err) throw err;
    test.notEqual(collection.find({start_value: true, before_insert_value: true}).count(), 0);
    collection.remove({_id: id});
    aspect.remove();
    next();
  });
});