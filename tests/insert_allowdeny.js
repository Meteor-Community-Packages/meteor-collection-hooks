var collection = new Meteor.Collection("test_insert_allowdeny_collection");

if (Meteor.isServer) {
  // full client-side access
  collection.allow({
    insert: function (userId, doc) { return !!doc.allowed; },
    update: function () { return true; },
    remove: function () { return true; }
  });

  Meteor.methods({
    test_insert_allowdeny_reset_collection: function () {
      collection.remove({});
    }
  });

  Meteor.publish("test_insert_allowdeny_publish_collection", function () {
    return collection.find();
  });

  collection.before({
    insert: function (userId, doc) {
      doc.server_value = true;
    }
  });
}

if (Meteor.isClient) {
  Meteor.subscribe("test_insert_allowdeny_publish_collection");

  Tinytest.addAsync("insert - only one of two collection documents should be allowed to be inserted, and should carry the extra server and client properties", function (test, next) {
    collection.before({
      insert: function (userId, doc) {
        doc.client_value = true;
      }
    });

    InsecureLogin.ready(function () {
      Meteor.call("test_insert_allowdeny_reset_collection", function (err, result) {
        // First insert is disallowed.
        // FIX: Perhaps a Meteor problem, but the callback on the update
        // below never gets fired. Instead, we get an exception that halts
        // further processing. If we can figure this out, then we can get
        // rid of the suppress_log and continue execution flow via the
        // callback.
        Meteor._suppress_log(1);
        collection.insert({start_value: true, allowed: false});

        // Second insert is allowed
        collection.insert({start_value: true, allowed: true}, function () {
          test.equal(collection.find({start_value: true, client_value: true, server_value: true}).count(), 1);
          next();
        });
      });
    });
  });
}