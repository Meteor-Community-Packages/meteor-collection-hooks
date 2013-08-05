# Meteor Collection Hooks

Extends Meteor.Collection with before/after hooks for insert/update/remove/find/findOne methods.

Works across both client, server or a mix. Also works when a client initiates a collection method and the server runs the hook, all while respecting the collection validators (allow/deny).

### Example usage:

```
var test = new Meteor.Collection("test");

test.before("insert", function (userId, doc) {
	doc.created = Date.now();
});

test.after("insert", function (userId, doc) {
	// In the case of after insert, doc will have been pre-fetched for you
});

test.after("update", function (userId, selector, modifier, options, previous) {
	// Notice the "previous" parameter, which is also available in "remove" (only for the after type).
	// It contains an array of the affected documents before update/remove was applied
	doSomething();
});

test.before("find", function (userId, selector, options) {
	// Note that userId will be available even when find is invoked within a Meteor.publish
});
```

#### Contributors

- Mathieu Bouchard (@matb33)
- Kevin Kaland (@wizonesolutions)
- Andrew Mao (@mizzao)