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
	api.add_files("tests.js", both);

	// Commented-out -- requires "accounts-testing" which makes
	// Meteor.insecureUserLogin available globally. Meteorite will install
	// it in "packages/", and thus be available to the normal app, not just
	// testing.
	//api.use(["accounts-base", "accounts-testing"], both);
	//api.add_files("tests_publish.js", both);
	//api.add_files("tests_userid_in_find_hooks_within_publish.js", both);

	// TODO: @mizzao, is this still applicable?
	//api.use(["coffeescript"], "server");
	//api.add_files(["client_server_userId_tests.coffee"], both);
});
