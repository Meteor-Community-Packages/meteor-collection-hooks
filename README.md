# Meteor Collection Hooks

Extends Meteor.Collection with `before`/`after` hooks for `insert`/`update`/`remove`/`find`/`findOne`.

Works across both client, server or a mix. Also works when a client initiates a collection method and the server runs the hook, all while respecting the collection validators (allow/deny).

--------------------------------------------------------------------------------

### .before.insert(userId, doc)

Fired before the doc is inserted.

Gives you an opportunity to modify doc as needed, or run additional
functionality

`this.transform()` obtains transformed version of document, if a transform was
defined.

```javascript
var test = new Meteor.Collection("test");

test.before.insert(function (userId, doc) {
  doc.createdAt = Date.now();
});
```

--------------------------------------------------------------------------------

### .before.update(userId, doc, fieldNames, modifier)

Fired before the doc is updated.

Gives you an opportunity to change the `modifier` as needed, or run additional
functionality. _Important_: note that we are changing `modifier`, and not `doc`.
Changing `doc` won't have any effect as the document is a copy and is not what
ultimately gets sent down to the real `update` method.

`this.transform()` obtains transformed version of document, if a transform was
defined.

```javascript
test.before.update(function (userId, doc, fieldNames, modifier) {
  modifier.$set.modifiedAt = Date.now();
});
```

--------------------------------------------------------------------------------

### .before.remove(userId, doc)

Fired just before the doc is removed.

Gives you an opportunity to affect your system while the document is still in
existence -- useful for maintaining system integrity, such as cascading deletes.

`this.transform()` obtains transformed version of document, if a transform was
defined.

```javascript
test.before.remove(function (userId, doc) {
  // ...
});
```

--------------------------------------------------------------------------------

### .after.insert(userId, doc)

Fired after the doc was inserted.

Gives you an opportunity to run post-insert tasks, such as sending notifications
of new document insertions.

`this.transform()` obtains transformed version of document, if a transform was
defined.

```javascript
test.after.insert(function (userId, doc) {
  // ...
});
```

--------------------------------------------------------------------------------

### .after.update(userId, doc, fieldNames, modifier)

Fired after the doc was updated.

Gives you an opportunity to run post-update tasks, potentially comparing the
previous and new documents to take further action.

`this.previous` contains the document before it was updated.

`this.transform()` obtains transformed version of document, if a transform was
defined.

```javascript
test.after.update(function (userId, doc, fieldNames, modifier) {
  // ...
});
```

--------------------------------------------------------------------------------

### .after.remove(userId, doc)

Fired after the doc was removed.

`doc` contains a copy of the document before it was removed.

Gives you an opportunity to run post-removal tasks that don't necessarily depend
on the document being found in the database (external service clean-up for
instance).

`this.transform()` obtains transformed version of document, if a transform was
defined.

```javascript
test.after.remove: function (userId, doc) {
  // ...
});
```

--------------------------------------------------------------------------------

### .before.find(userId, selector, options)

Fired before a find query.

Gives you an opportunity to adjust selector/options on-the-fly.

```javascript
test.before.find: function (userId, selector, options) {
  // ...
});
```

--------------------------------------------------------------------------------

### .after.find(userId, selector, options, cursor)

Fired after a find query.

Gives you an opportunity to act on a given find query. The cursor resulting from
the query is provided as the last argument for convenience.

```javascript
test.after.find: function (userId, selector, options, cursor) {
  // ...
});
```

--------------------------------------------------------------------------------

### .before.findOne(userId, selector, options)

Fired before a findOne query.

Gives you an opportunity to adjust selector/options on-the-fly.

```javascript
test.before.findOne: function (userId, selector, options) {
  // ...
});
```

--------------------------------------------------------------------------------

### .after.findOne(userId, selector, options, doc)

Fired after a findOne query.

Gives you an opportunity to act on a given findOne query. The document resulting
from the query is provided as the last argument for convenience.

```javascript
test.after.findOne: function (userId, selector, options, doc) {
  // ...
});
```

--------------------------------------------------------------------------------

## Contributors

- Mathieu Bouchard (@matb33)
- Kevin Kaland (@wizonesolutions)
- Andrew Mao (@mizzao)