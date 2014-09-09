Tinytest.add("compat - legacy 'new Meteor.Collection' should not throw an exception", function (test) {
  try {
    new Meteor.Collection("test_compat_meteor_collection");
    test.ok();
  } catch (e) {
    test.fail(e.message);
  }
});