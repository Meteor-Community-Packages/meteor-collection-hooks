Package.describe({
  summary: "Extends Meteor.Collection with before/after hooks for insert/update/remove/find/findOne",
  version: "0.7.2",
  git: "https://github.com/matb33/meteor-collection-hooks.git"
});

Package.on_use(function (api, where) {
  api.versionsFrom("METEOR-CORE@0.9.0-atm");
  
  api.use([
    "meteor",
    "underscore",
    "ejson",
    "mongo-livedata",
    "minimongo",
    "deps"
  ]);

  api.use([ "accounts-base" ], ["client", "server"], { weak: true });

  api.add_files([
    "bind-polyfill.js",
    "collection-hooks.js",
    "insert.js",
    "update.js",
    "remove.js",
    "find.js",
    "findone.js"
  ]);

  // Load after all advices have been defined
  api.add_files([ "users-compat.js" ]);
  
  api.export(["CollectionHooks"]);  
});

Package.on_test(function (api) {
  api.use([
    "matb33:collection-hooks",
    "underscore",
    "accounts-base",
    "accounts-password",
    "tinytest",
    "test-helpers"
  ]);

  api.add_files(["tests/insecure_login.js"]);

  // local = minimongo (on server and client)
  // both = minimongo on client and server, mongo on server, with mutator methods
  // allow = same as both but with an allow rule test
  api.add_files(["tests/insert_local.js"]);
  api.add_files(["tests/insert_both.js"]);
  api.add_files(["tests/insert_allow.js"]);
  api.add_files(["tests/insert_user.js"], "server");

  api.add_files(["tests/update_local.js"]);
  api.add_files(["tests/update_both.js"]);
  api.add_files(["tests/update_allow.js"]);
  api.add_files(["tests/update_user.js"], "server");
  api.add_files(["tests/update_without_id.js"], "server");

  api.add_files(["tests/remove_local.js"]);
  api.add_files(["tests/remove_both.js"]);
  api.add_files(["tests/remove_allow.js"]);

  api.add_files(["tests/find.js"]);
  api.add_files(["tests/findone.js"]);
  api.add_files(["tests/find_users.js"]);
  api.add_files(["tests/find_findone_userid.js"]);

  api.add_files(["tests/multiple_hooks.js"]);
  api.add_files(["tests/transform.js"]);
  api.add_files(["tests/direct.js"]);
  api.add_files(["tests/optional_previous.js"]);

  // NOTE: not supporting fetch for the time being.
  // NOTE: fetch can only work server-side because find's "fields" option is
  // limited to only working on the server
  //api.add_files(["tests/fetch.js"], "server");
});
