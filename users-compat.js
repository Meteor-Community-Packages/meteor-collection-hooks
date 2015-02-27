if (Meteor.users) {
  // Next, give it the hook aspects:
  CollectionHooks.extendCollectionInstance(Meteor.users);
}