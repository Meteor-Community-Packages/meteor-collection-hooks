Tinytest.addAsync("users - hooks should be capable of being used on special Meteor.users collection", function (test, next) {

  var aspect = Meteor.users.before.find(function (userId, selector, options) {
    delete selector.bogus_value;
  });

  InsecureLogin.ready(function () {
    test.notEqual(Meteor.users.find({bogus_value: true}).count(), 0);
    aspect.remove();
    next();
  });
});