Tinytest.addAsync("findone - selector should have extra property", function (test, next) {
  var collection = new Meteor.Collection(null);

  collection.before.findOne(function (userId, selector, options) {
    delete selector.bogus_value;
    selector.before_findone = true;
  });

  InsecureLogin.ready(function () {
    collection.insert({start_value: true, before_findone: true}, function (err, id) {
      if (err) throw err;
      test.notEqual(collection.findOne({start_value: true, bogus_value: true}), undefined);
      next();
    });
  });
});

Tinytest.addAsync("findone - tmp variable should have property added after the find", function (test, next) {
  var collection = new Meteor.Collection(null);
  var tmp = {};

  collection.after.findOne(function (userId, selector, options) {
    tmp.after_findone = true;
  });

  InsecureLogin.ready(function () {
    collection.insert({start_value: true}, function (err, id) {
      if (err) throw err;
      collection.findOne({start_value: true});
      test.equal(tmp.after_findone, true);
      next();
    });
  });
});
