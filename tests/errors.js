var Collection = typeof Mongo !== "undefined" && typeof Mongo.Collection !== "undefined" ? Mongo.Collection : Meteor.Collection;

Tinytest.addAsync("errors - should call error callback on insert hook exception", function (test, next) {
  var collection = new Collection(null);

  collection.before.insert(function (userId, doc) {
    throw new Error('Foo');
  });

  InsecureLogin.ready(function () {
    collection.insert({foo: 'bar'}, function (err, id) {
      test.isNotNull(err);
      next();
    });
  });
});
