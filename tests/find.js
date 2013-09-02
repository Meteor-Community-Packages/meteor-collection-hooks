Tinytest.addAsync("find - selector should have extra property", function (test, next) {
  var collection = new Meteor.Collection(null);

  collection.before.find(function (userId, selector, options) {
    delete selector.bogus_value;
    selector.before_find = true;
  });

  InsecureLogin.ready(function () {
    collection.insert({start_value: true, before_find: true}, function (err, id) {
      if (err) throw err;
      test.equal(collection.find({start_value: true, bogus_value: true}).count(), 1);
      next();
    });
  });
});

Tinytest.addAsync("find - tmp variable should have property added after the find", function (test, next) {
  var collection = new Meteor.Collection(null);
  var tmp = {};

  collection.after.find(function (userId, selector, options) {
    tmp.after_find = true;
  });

  InsecureLogin.ready(function () {
    collection.insert({start_value: true}, function (err, id) {
      if (err) throw err;
      collection.find({start_value: true});
      test.equal(tmp.after_find, true);
      next();
    });
  });
});
