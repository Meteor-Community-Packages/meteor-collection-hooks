Package.describe({
	summary: "Extends Meteor.Collection with before/after hooks for insert/update/remove"
});

Package.on_use(function (api, where) {
	api.add_files(["collection-hooks.js"], ["client", "server"]);
});

Package.on_test(function (api) {
	api.use(["collection-hooks", "tinytest"], ["client", "server"]);

	// TODO: the most important tests, the ones for client -> server
	// hooks (a client-initiated insert/update/remove that runs a server
	// hook) are not yet written. If you can figure out how, please tell
	// me or help me write these tests. I can't figure out how to run a
	// Tinytest that relies on both server and client talking to each other.
	api.add_files(["tests.js"], ["server", "client"]);
});