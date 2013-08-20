Tinytest.addAsync("insert - local collection document should have extra property added before being inserted", function (test, next) {
  var collection = new Meteor.Collection(null);
  var tmp = {};

  collection.before.insert(function (userId, doc) {
    tmp.typeof_userId = typeof userId;
    doc.before_insert_value = true;
  });

  InsecureLogin.ready(function () {
    collection.insert({start_value: true}, function (err, id) {
      if (err) throw err;
      console.log(tmp);
      if (Meteor.isServer) {
        test.equal(tmp.typeof_userId, "undefined", "Local collection on server should NOT know about a userId");
      } else {
        test.equal(tmp.typeof_userId, "string", "There should be a userId on the client");
      }
      test.equal(collection.find({start_value: true, before_insert_value: true}).count(), 1);
      next();
    });
  });
});

/*
Tinytest.addAsync("insert - local collection should fire after-insert hook", function (test, next) {
  var collection = new Meteor.Collection(null);

  collection.after.insert(function (userId, doc) {
    if (Meteor.isServer) {
      test.equal(typeof userId, "undefined", "Local collection on server should NOT know about a userId");
    } else {
      test.equal(typeof userId, "string", "There should be a userId on the client");
    }

    test.notEqual(doc._id, undefined, "should provide the inserted doc (includes _id)");

    next();
  });

  InsecureLogin.ready(function () {
    collection.insert({start_value: true});
  });
});
*/