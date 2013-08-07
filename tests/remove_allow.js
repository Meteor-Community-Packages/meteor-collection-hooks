var collection = new Meteor.Collection("test_remove_allow_collection");

if (Meteor.isServer) {
  // full client-side access
  collection.allow({
    insert: function () { return true; },
    update: function () { return true; },
    remove: function (userId, doc) { return doc.allowed; }
  });

  Meteor.methods({
    test_remove_allow_reset_collection: function () {
      collection.remove({});
    }
  });

  Meteor.publish("test_remove_allow_publish_collection", function () {
    return collection.find();
  });
}

if (Meteor.isClient) {
  Meteor.subscribe("test_remove_allow_publish_collection");

  Tinytest.addAsync("remove - only one of two collection documents should be allowed to be removed", function (test, next) {
    collection.before({
      remove: function (userId, doc) {
        test.equal(doc.start_value, true);
      }
    });

    InsecureLogin.ready(function () {
      Meteor.call("test_remove_allow_reset_collection", function (err, result) {
        function start(id1, id2) {
          collection.remove({_id: id1}, function (err) {
            // FIX: Perhaps a Meteor problem, but the callback on the remove
            // below never gets fired. Instead, we get an exception that halts
            // further processing. Until we can figure this out, give Meteor
            // time to rollback the change to the client using setTimeout.
            Meteor._suppress_log(1);
            collection.remove({_id: id2}, function (err) { /* EXCEPTION THROWN INSTEAD! */ });
            Meteor.setTimeout(function () {
              test.equal(collection.find({start_value: true}).count(), 1, "only one document should remain");
              next();
            }, 250);
          });
        }

        // Insert two documents
        collection.insert({start_value: true, allowed: true}, function (err, id1) {
          collection.insert({start_value: true, allowed: false}, function (err, id2) {
            start(id1, id2);
          });
        });
      });
    });
  });
}