Package.describe({
	summary: "Extends Meteor.Collection with before/after hooks for insert/update/remove"
});

var both = ["client", "server"];

Package.on_use(function (api, where) {
	api.use(["deps", "underscore"], both);
	api.add_files(["collection-hooks.js"], both);
});

Package.on_test(function (api) {
	api.use(["collection-hooks", "tinytest"], both);

	api.use(["coffeescript"], "server");
	api.use(["accounts-base", "accounts-testing"], both);

	api.add_files("tests.js", both);
	api.add_files("tests_publish.js", both);
	api.add_files("tests_userid_in_find_hooks_within_publish.js", both);

	// TODO: @mizzao, is this still applicable?
	//api.add_files(["client_server_userId_tests.coffee"], both);
});
