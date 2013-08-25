Package.describe({
  summary: "Extends Meteor.Collection with before/after hooks for insert/update/remove"
});

var both = ["client", "server"];

Package.on_use(function (api, where) {
  api.use([
    "meteor",
    "underscore",
    "ejson",
    "mongo-livedata",
    "minimongo",
    "deps"
  ], both);

  api.add_files([
      "collection-hooks.js",
      "insert.js"
  ], both);

  api.export("CollectionHooks");
});

Package.on_test(function (api) {
  api.use([
    "collection-hooks-refactor",
    "underscore",
    "accounts-base",
    "accounts-password",
    "tinytest",
    "test-helpers"
  ], both);

  api.add_files(["tests/insecure_login.js"], both);

  // local = minimongo (on server and client)
  // sync = minimongo on client, mongo on server, with mutator methods to sync
  // allow = same as sync but with an allow rule test
  api.add_files(["tests/insert_local.js"], both);
  api.add_files(["tests/insert_sync.js"], both);
  //api.add_files(["tests/insert_allow.js"], both);
  //api.add_files(["tests/insert_user.js"], "server");

  /*
  api.add_files(["tests/update_local.js"], both);
  api.add_files(["tests/update_sync.js"], both);
  api.add_files(["tests/update_allow.js"], both);
  api.add_files(["tests/update_user.js"], "server");

  api.add_files(["tests/remove_local.js"], both);
  api.add_files(["tests/remove_sync.js"], both);
  api.add_files(["tests/remove_allow.js"], both);

  // fetch can only work server-side because find's "fields" option is limited
  // to only working on the server
  api.add_files(["tests/fetch.js"], "server");
  api.add_files(["tests/multiple_hooks.js"], both);
  api.add_files(["tests/transform.js"], both);
  */
});
