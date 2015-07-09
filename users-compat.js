if (Meteor.users) {
  // Next, give it the hook aspects:
  var Collection = typeof Mongo !== "undefined" && typeof Mongo.Collection !== "undefined" ? Mongo.Collection : Meteor.Collection;
  CollectionHooks.extendCollectionInstance(Meteor.users, Collection);
}