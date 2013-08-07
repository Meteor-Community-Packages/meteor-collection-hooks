var collection = new Meteor.Collection("test_update_allow_collection");

if (Meteor.isServer) {
  // full client-side access
  collection.allow({
    insert: function () { return true; },
    update: function (userId, doc, fieldNames, modifier) { return modifier.$set.allowed; },
    remove: function () { return true; }
  });

  Meteor.methods({
    test_update_allow_reset_collection: function () {
      collection.remove({});
    }
  });

  Meteor.publish("test_update_allow_publish_collection", function () {
    return collection.find();
  });

  collection.before({
    update: function (userId, doc, fieldNames, modifier) {
      modifier.$set.server_value = true;
    }
  });
}

if (Meteor.isClient) {
  Meteor.subscribe("test_update_allow_publish_collection");

  Tinytest.addAsync("update - only one of two collection documents should be allowed to be updated, and should carry the extra server and client properties", function (test, next) {
    collection.before({
      update: function (userId, doc, fieldNames, modifier) {
        modifier.$set.client_value = true;
      }
    });

    InsecureLogin.ready(function () {
      Meteor.call("test_update_allow_reset_collection", function (err, result) {
        function start(id1, id2) {
          collection.update({_id: id1}, {$set: {update_value: true, allowed: true}}, function (err) {
            // FIX: Perhaps a Meteor problem, but the callback on the update
            // below never gets fired. Instead, we get an exception that halts
            // further processing. Until we can figure this out, give Meteor
            // time to rollback the change to the client using setTimeout.
            Meteor._suppress_log(1);
            collection.update({_id: id2}, {$set: {update_value: true, allowed: false}}, function (err) { /* EXCEPTION THROWN INSTEAD! */ });
            Meteor.setTimeout(function () {
              test.equal(collection.find({start_value: true, update_value: true, client_value: true, server_value: true}).count(), 1);
              next();
            }, 250);
          });
        }

        // Insert two documents
        collection.insert({start_value: true}, function (err, id1) {
          collection.insert({start_value: true}, function (err, id2) {
            start(id1, id2);
          });
        });
      });
    });
  });
}