Package.describe({
	summary: "Extends Meteor.Collection with before/after hooks for insert/update/remove"
});

var both = ["client", "server"];

Package.on_use(function (api, where) {
    api.use(["underscore"], both);
	api.add_files(["collection-hooks.js"], both);
});

Package.on_test(function (api) {
	api.use(["collection-hooks", "tinytest"], both);

	api.use(["coffeescript"], "server");
	api.use(["accounts-base", "accounts-testing"], both);

	// TODO: the most important tests, the ones for client -> server
	// hooks (a client-initiated insert/update/remove that runs a server
	// hook) are not yet written. If you can figure out how, please tell
	// me or help me write these tests. I can't figure out how to run a
	// Tinytest that relies on both server and client talking to each other.
	api.add_files("tests.js", both);
	api.add_files("tests_publish.js", both);
	api.add_files("tests_userid_in_find_hooks_within_publish.js", both);
	//api.add_files(["client_server_userId_tests.coffee"], both);
});
