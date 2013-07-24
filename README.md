# Meteor Collection Hooks

Extends Meteor.Collection with before/after hooks for insert/update/remove/find/findOne methods.

Works across both client, server or a mix. Also works when a client initiates a collection method and the server runs the hook, all while respecting the collection validators (allow/deny).

The only downside to these hooks is that they currently match the function signatures of their respective methods, i.e. the hook is fired on a per method-call basis, not per-document.

This means that when an `update` method is called, a hook callback will have the same function signature (with `userId` added though, if applicable). You will need to run a query to take any action on the affected documents:

```
MyCollection.before("update", function (userId, selector) {
	var docs = MyCollection.find(selector);
	docs.forEach(function (doc) {
		// etc
	});
});
```

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
```

#### Contributors

- Mathieu Bouchard (@matb33)
- Kevin Kaland (@wizonesolutions)
- Andrew Mao (@mizzao)