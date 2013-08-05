# Meteor Collection Hooks

Extends Meteor.Collection with before/after hooks for insert/update/remove.

Works across both client, server or a mix. Also works when a client initiates a collection method and the server runs the hook, all while respecting the collection validators (allow/deny).

### Example usage:

```javascript
var test = new Meteor.Collection("test");

test.before({
	insert: function (userId, doc) {
		// Fired before the doc is inserted.
		// Gives you an opportunity to modify doc as needed, or run additional
		// functionality
		doc.createdAt = Date.now();
	},
	update: function (userId, doc, fieldNames, modifier) {
		// Fired before the doc is updated.
		// Gives you an opportunity to modify doc as needed, or run additional
		// functionality. Note that we are changing the modifier, and not the
		// doc. Setting the value on the doc introduces far too much complexity
		// when multi:true is used.
		modifier.$set.modifiedAt = Date.now();
	},
	remove: function (userId, doc) {
		// Fired just before the doc is removed.
		// Gives you an opportunity to affect your system while the document is
		// still in existence -- useful for maintaining system integrity, such
		// as triggered deletes
	},
	fetch: ...,
	transform: ...
})

test.after({
	insert: function (userId, doc) {
		// Fired after the doc was inserted.
		// "doc" has been pre-fetched for you -- it has the _id. Gives you an
		// opportunity to run post-insert tasks, such as sending notifications
		// of new document insertions.
	},
	update: function (userId, doc, fieldNames, modifier, previous) {
		// Fired after the doc was updated.
		// "previous" contains the doc before it was updated. Gives you an
		// opportunity to run post-update tasks, potentially comparing the
		// previous and new documents to take further action.
	},
	remove: function (userId, doc) {
		// Fired after the doc was removed.
		// "doc" contains a copy of the doc before it was removed.
		// Gives you an opportunity to run post-removal tasks that don't
		// necessarily depend on the document being found in the database
		// (external service clean-up for instance).
	},
	fetch: ...,
	transform: ...
});
```

### TODO

- Allow calling insert/update/remove directly (don't fire hooks)
- Verify that fetch and fetchAllFields actually get used
- Verify that transform actually gets used

### Contributors

- Mathieu Bouchard (@matb33)
- Kevin Kaland (@wizonesolutions)
- Andrew Mao (@mizzao)