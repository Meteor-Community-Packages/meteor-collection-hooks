Meteor.Collection.prototype._hookedUpdate = function (opts, selector, mutator, options, callback) {
  var self = this;
  var result, factoriedDoc;
  var fields = getFields.call(self, opts, selector, mutator);

  if (options instanceof Function) {
    callback = options;
    options = {};
  }

  // before
  _.each(opts.hooks.before, function (hook) {
    if (!factoriedDoc) factoriedDoc = transformDoc(hook, doc);
    hook(opts.userId, factoriedDoc, fields, mutator);
  });

  function after() {
    _.each(opts.hooks.after, function (hook) {
      if (!factoriedDoc) factoriedDoc = transformDoc(hook, doc);
      hook(opts.userId, factoriedDoc, fields, mutator);
    });
  }

  if (opts.fromPublicApi) {
    // Called from public API (Meteor.Collection.prototype.XXX)
    return opts._super.call(self, selector, mutator, options, function () {
      after();
      callback && callback.apply(self, arguments);
    });
  } else {
    // Called from private API (_collection.XXX)
    result = opts._super.call(self, selector, mutator, options);
    after();
    return result;
  }
};

// transformDoc pulled verbatim from:
// ~/.meteor/packages/mongo-livedata/collection.js:618-622
var transformDoc = function (validator, doc) {
  if (validator.transform)
    return validator.transform(doc);
  return doc;
};

// This function contains a snippet of code pulled from:
// ~/.meteor/packages/mongo-livedata/collection.js:632-668
// It's contained in this utility function to make updates easier for us in
// case this code changes.
var getFields = function (opts, selector, mutator) {
  // Commented-out -- not sure if this is needed for hooks
  //if (!LocalCollection._selectorIsIdPerhapsAsObject(selector))
  //  throw new Error("validated update should be of a single ID");

  // compute modified fields
  var fields = [];
  _.each(mutator, function (params, op) {
    if (op.charAt(0) !== '$') {
      throw new Meteor.Error(
        403, "Access denied. In a restricted collection you can only update documents, not replace them. Use a Mongo update operator, such as '$set'.");
    } else if (!_.has(ALLOWED_UPDATE_OPERATIONS, op)) {
      throw new Meteor.Error(
        403, "Access denied. Operator " + op + " not allowed in a restricted collection.");
    } else {
      _.each(_.keys(params), function (field) {
        // treat dotted fields as if they are replacing their
        // top-level part
        if (field.indexOf('.') !== -1)
          field = field.substring(0, field.indexOf('.'));

        // record the field we are trying to change
        if (!_.contains(fields, field))
          fields.push(field);
      });
    }
  });

  var findOptions = {transform: null};
  if (!opts.hooks.fetchAllFields) {
    findOptions.fields = {};
    _.each(opts.hooks.fetch, function(fieldName) {
      findOptions.fields[fieldName] = 1;
    });
  }

  var doc = self._collection.findOne(selector, findOptions);
  if (!doc)  // none satisfied!
    return;

  return fields;
};