Tinytest.addAsync("users - hooks should be capable of being used on special Meteor.users collection", function (test, next) {

  var aspect1 = Meteor.users.before.find(function (userId, selector, options) {
    if (selector && selector.test) {
      selector.a = 1;
    }
  });

  var aspect2 = Meteor.users.after.find(function (userId, selector, options) {
    if (selector && selector.test) {
      selector.b = 1;
    }
  });

  InsecureLogin.ready(function () {
  	var selector = {test: 1};
  	Meteor.users.find(selector);
    test.equal(_.has(selector, "a"), true);
    test.equal(_.has(selector, "b"), true);
    aspect1.remove();
    aspect2.remove();

    test.notEqual(Meteor.users.find().count(), 0);

    next();
  });
});