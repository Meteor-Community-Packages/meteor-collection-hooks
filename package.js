Package.describe({
  summary: "Extends Meteor.Collection with before/after hooks for insert/update/remove/find/findOne",
  version: "0.7.3",
  git: "https://github.com/matb33/meteor-collection-hooks.git"
});

Package.onUse = Package.onUse || Package.on_use;    // backwards-compat
Package.onTest = Package.onTest || Package.on_test; // backwards-compat

Package.onUse(function (api, where) {
  api.addFiles = api.addFiles || api.add_files;     // backwards-compat

  api.versionsFrom("METEOR-CORE@0.9.0-atm");

  api.use([
    "meteor",
    "underscore",
    "ejson",
    "mongo-livedata",
    "minimongo",
    "deps"
  ]);

  api.use("accounts-base", ["client", "server"], { weak: true });

  api.addFiles([
    "bind-polyfill.js",
    "collection-hooks.js",
    "insert.js",
    "update.js",
    "remove.js",
    "find.js",
    "findone.js"
  ]);

  // Load after all advices have been defined
  api.addFiles("users-compat.js");

  api.export("CollectionHooks");
});

Package.onTest(function (api) {
  api.addFiles = api.addFiles || api.add_files;     // backwards-compat

  api.use([
    "matb33:collection-hooks",
    "underscore",
    "accounts-base",
    "accounts-password",
    "tinytest",
    "test-helpers"
  ]);

  api.addFiles("tests/insecure_login.js");

  // local = minimongo (on server and client)
  // both = minimongo on client and server, mongo on server, with mutator methods
  // allow = same as both but with an allow rule test
  api.addFiles("tests/insert_local.js");
  api.addFiles("tests/insert_both.js");
  api.addFiles("tests/insert_allow.js");
  api.addFiles("tests/insert_user.js", "server");

  api.addFiles("tests/update_local.js");
  api.addFiles("tests/update_both.js");
  api.addFiles("tests/update_allow.js");
  api.addFiles("tests/update_user.js", "server");
  api.addFiles("tests/update_without_id.js", "server");

  api.addFiles("tests/remove_local.js");
  api.addFiles("tests/remove_both.js");
  api.addFiles("tests/remove_allow.js");

  api.addFiles("tests/find.js");
  api.addFiles("tests/findone.js");
  api.addFiles("tests/find_users.js");
  api.addFiles("tests/find_findone_userid.js");

  api.addFiles("tests/multiple_hooks.js");
  api.addFiles("tests/transform.js");
  api.addFiles("tests/direct.js");
  api.addFiles("tests/optional_previous.js");

  // NOTE: not supporting fetch for the time being.
  // NOTE: fetch can only work server-side because find's "fields" option is
  // limited to only working on the server
  //api.addFiles("tests/fetch.js", "server");
});
