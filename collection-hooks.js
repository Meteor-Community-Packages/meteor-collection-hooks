(function () {

	var directInsert, directUpdate, directRemove, _validatedInsert, _validatedUpdate, _validatedRemove;

	function delegate() {
		var i, len, c;
		var args = Array.prototype.slice.call(arguments);
		var type = args.shift();
		var verb = args.shift();

		if (this._x_matb33_hooks && this._x_matb33_hooks[type] && this._x_matb33_hooks[type][verb]) {
			for (i = 0, len = this._x_matb33_hooks[type][verb].length; i < len; i++) {
				c = this._x_matb33_hooks[type][verb][i];
				if (typeof c === "function") {
					if (c.apply(this, args) === false) {
						return false;
					}
				}
			}
		}
	}

	function getUserId() {
		var currentInvocation;

		try {
			currentInvocation = Meteor._CurrentInvocation.get();
		} catch (e) {}

		if (currentInvocation) {
			return currentInvocation.userId;
		} else {
			// this.userId will likely not be defined because no one usually
			// invokes collection.insert with a `.call(this)`... But if they
			// do, userId will be available to the end-callback.
			return this.userId || null;
		}
	}

	directInsert = Meteor.Collection.prototype.insert;
	directUpdate = Meteor.Collection.prototype.update;
	directRemove = Meteor.Collection.prototype.remove;

	// These are invoked when the method is called directly on the collection
	// from either the server or client. These are adapted to match the
	// function signature of the triggered version (adding userId)

	Meteor.Collection.prototype.insert = function (doc, callback) {
		var result, userId = getUserId.call(this);

		if (delegate.call(this, "before", "insert", userId, doc, callback) !== false) {
			result = directInsert.call(this, doc, callback);
			delegate.call(this, "after", "insert", userId, doc, callback);
		}

		return result;
	};

	Meteor.Collection.prototype.update = function (selector, modifier, options, callback) {
		var result, previous, userId = getUserId.call(this);

		if (delegate.call(this, "before", "update", userId, selector, modifier, options, callback) !== false) {
			previous = this._collection.find(selector, {reactive: false}).fetch();
			result = directUpdate.call(this, selector, modifier, options, callback);
			delegate.call(this, "after", "update", userId, selector, modifier, options, previous, callback);
		}

		return result;
	};

	Meteor.Collection.prototype.remove = function (selector, callback) {
		var result, previous, userId = getUserId.call(this);

		if (delegate.call(this, "before", "remove", userId, selector, callback) !== false) {
			previous = this._collection.find(selector, {reactive: false}).fetch();
			result = directRemove.call(this, selector, callback);
			delegate.call(this, "after", "remove", userId, selector, previous, callback);
		}

		return result;
	};

	if (Meteor.isServer) {
		_validatedInsert = Meteor.Collection.prototype._validatedInsert;
		_validatedUpdate = Meteor.Collection.prototype._validatedUpdate;
		_validatedRemove = Meteor.Collection.prototype._validatedRemove;

		// These are triggered on the server, but only when a client initiates
		// the method call. They act similarly to observes, but simply hi-jack
		// _validatedInsert. Additionally, they hi-jack the collection
		// instance's _collection.insert/update/remove temporarily in order to
		// maintain validator integrity (allow/deny).

		Meteor.Collection.prototype._validatedInsert = function (userId, doc) {
			var result, id;
			var self = this;

			var _insert = self._collection.insert;
			self._collection.insert = function (doc) {
				if (delegate.call(self, "before", "insert", userId, doc) !== false) {
					id = _insert.call(this, doc);
					delegate.call(self, "after", "insert", userId, id && this.findOne({_id: id}) || doc);
				}
			};
			_validatedRemove.call(self, userId, doc);
			self._collection.insert = _insert;
		};

		Meteor.Collection.prototype._validatedUpdate = function (userId, selector, mutator, options) {
			var result, previous;
			var self = this;

			var _update = self._collection.update;
			self._collection.update = function (selector, mutator, options) {
				if (delegate.call(self, "before", "update", userId, selector, mutator, options) !== false) {
					previous = this.find(selector).fetch();
					_update.call(this, selector, mutator, options);
					delegate.call(self, "after", "update", userId, selector, mutator, options, previous);
				}
			};
			_validatedRemove.call(self, userId, selector, mutator, options);
			self._collection.update = _update;
		};

		Meteor.Collection.prototype._validatedRemove = function (userId, selector) {
			var result, previous;
			var self = this;

			var _remove = self._collection.remove;
			self._collection.remove = function (selector) {
				if (delegate.call(self, "before", "remove", userId, selector, previous) !== false) {
					previous = this.find(selector).fetch();
					_remove.call(this, selector);
					delegate.call(self, "after", "remove", userId, selector, previous);
				}
			};
			_validatedRemove.call(self, userId, selector);
			self._collection.remove = _remove;
		};
	}

	Meteor.Collection.prototype.clearHooks = function (verb, type) {
		if (!this._x_matb33_hooks) this._x_matb33_hooks = {};
		if (!this._x_matb33_hooks[type]) this._x_matb33_hooks[type] = {};
		this._x_matb33_hooks[type][verb] = [];
	};

	_.each(["before", "after"], function (type) {
		Meteor.Collection.prototype[type] = function (verb, callback) {
			if (!this._x_matb33_hooks) this._x_matb33_hooks = {};
			if (!this._x_matb33_hooks[type]) this._x_matb33_hooks[type] = {};
			if (!this._x_matb33_hooks[type][verb]) this._x_matb33_hooks[type][verb] = [];

			this._x_matb33_hooks[type][verb].push(callback);
		};
	});

	if (Meteor.isClient) {
		Meteor.Collection.prototype.when = function (condition, callback) {
			var self = this;
			Deps.autorun(function (c) {
				if (condition.call(self._collection)) {
					c.stop();
					callback.call(self._collection);
				}
			});
		};
	}

})();