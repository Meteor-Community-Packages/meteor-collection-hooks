Package.describe({
  summary: "Extends Meteor.Collection with before/after hooks for insert/update/remove"
});

var both = ["client", "server"];

Package.on_use(function (api, where) {
  api.use(["underscore", "ejson", "mongo-livedata"], both);
  api.add_files([
    "init.js",
    "insert.js",
    "update.js",
    "remove.js"
  ], both);
});

Package.on_test(function (api) {
  api.use(["collection-hooks", "underscore", "accounts-base", "startup", "tinytest", "test-helpers"], both);

  api.add_files(["tests/insecure_login.js"], both);

  // local = minimongo (on server and client)
  // sync = minimongo on client, mongo on server, with mutator methods to sync
  // allowdeny = same as sync but with allow (and/or deny) rules
  api.add_files(["tests/insert_local.js"], both);
  api.add_files(["tests/insert_sync.js"], both);
  api.add_files(["tests/insert_allowdeny.js"], both);

  api.add_files(["tests/update_local.js"], both);
  api.add_files(["tests/update_sync.js"], both);
  api.add_files(["tests/update_allowdeny.js"], both);

  api.add_files(["tests/remove_local.js"], both);
  api.add_files(["tests/remove_sync.js"], both);

  // fetch can only work server-side because find's "fields" option is limited
  // to only working on the server
  api.add_files(["tests/fetch.js"], "server");

  api.add_files(["tests/multiple_hooks.js"], both);
});