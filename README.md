# Meteor Collection Hooks

Extends Meteor.Collection with `before`/`after` hooks for `insert`/`update`/`remove`/`find`/`findOne`.

Works across both client, server or a mix. Also works when a client initiates a collection method and the server runs the hook, all while respecting the collection validators (allow/deny).

--------------------------------------------------------------------------------

### .before.insert(userId, doc)

Fired before the doc is inserted.

Gives you an opportunity to modify doc as needed, or run additional
functionality

- `this.transform()` obtains transformed version of document, if a transform was
defined.

```javascript
var test = new Meteor.Collection("test");

test.before.insert(function (userId, doc) {
  doc.createdAt = Date.now();
});
```

--------------------------------------------------------------------------------

### .before.update(userId, doc, fieldNames, modifier, options)

Fired before the doc is updated.

Gives you an opportunity to change the `modifier` as needed, or run additional
functionality.

- `this.transform()` obtains transformed version of document, if a transform was
defined.

```javascript
test.before.update(function (userId, doc, fieldNames, modifier, options) {
  modifier.$set.modifiedAt = Date.now();
});
```

__Important__: note that we are changing `modifier`, and not `doc`.
Changing `doc` won't have any effect as the document is a copy and is not what
ultimately gets sent down to the underlying `update` method.

--------------------------------------------------------------------------------

### .before.remove(userId, doc)

Fired just before the doc is removed.

Gives you an opportunity to affect your system while the document is still in
existence -- useful for maintaining system integrity, such as cascading deletes.

- `this.transform()` obtains transformed version of document, if a transform was
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

- `this.transform()` obtains transformed version of document, if a transform was
defined;
- `this._id` holds the newly inserted `_id` if available.

```javascript
test.after.insert(function (userId, doc) {
  // ...
});
```

--------------------------------------------------------------------------------

### .after.update(userId, doc, fieldNames, modifier, options)

Fired after the doc was updated.

Gives you an opportunity to run post-update tasks, potentially comparing the
previous and new documents to take further action.

- `this.previous` contains the document before it was updated.
- `this.transform()` obtains transformed version of document, if a transform was
  defined. Note that this function accepts an optional parameter to specify the
  document to transform — useful to transform previous:
  `this.transform(this.previous)`.

```javascript
test.after.update(function (userId, doc, fieldNames, modifier, options) {
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

- `this.transform()` obtains transformed version of document, if a transform was
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

## Tips

- Returning `false` in any `before` hook will prevent the underlying method (and
subsequent `after` hooks) from executing. Note that all `before` hooks will
still continue to run even if the first hook returns `false`.

- ~~If you wish to make `userId` available to a `find` query in a `publish`
function, try the technique detailed in this [comment](https://github.com/matb33/meteor-collection-hooks/issues/7#issuecomment-24021616)~~ `userId` is available to `find` and `findOne` queries that were invoked within a `publish` function.

- All hook callbacks have `this._super` available to them (the underlying
method) as well as `this.context`, the equivalent of `this` to the underlying
method. Additionally, `this.args` contain the original arguments passed to the
method and can be modified by reference (for example, modifying a selector in a
`before` hook so that the underlying method uses this new selector).

- It is quite normal for `userId` to sometimes be unavailable to hook callbacks
in some circumstances. For example, if an `update` is fired from the server
with no user context, the server certainly won't be able to provide any
particular userId.

- If, like me, you transform `Meteor.users` through a [round-about way](https://github.com/matb33/meteor-collection-hooks/issues/15#issuecomment-25809919) involving
`find` and `findOne`, then you won't be able to use `this.transform()`. Instead,
grab the transformed user with `findOne`.

--------------------------------------------------------------------------------


## Contributors

- Mathieu Bouchard ([matb33](https://github.com/matb33))
- Andrew Mao ([mizzao](https://github.com/mizzao))
- Kevin Kaland ([wizonesolutions](https://github.com/wizonesolutions))
- Jonathan James ([jonjamz](https://github.com/jonjamz))
- Dave Workman ([davidworkman9](https://github.com/davidworkman9))