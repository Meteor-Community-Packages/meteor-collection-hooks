CollectionHooks.defineAdvice("update", function (userId, _super, aspects, getTransform, args) {
  var self = this;
  var ctx = {context: self, _super: _super};
  var async = _.isFunction(_.last(args));
  var docs, fields, abort, prev = {};
  var collection = _.has(self, "_collection") ? self._collection : self;

  // args[0] : selector
  // args[1] : mutator
  // args[2] : options (optional)
  // args[3] : callback

  if (_.isFunction(args[2])) {
    args[3] = args[2];
    args[2] = {};
  }

  fields = getFields(args[1]);
  docs = CollectionHooks.getDocs.call(self, collection, args[0], args[2]).fetch();

  // copy originals for convenience for the "after" pointcut
  if (aspects.after) {
    prev.mutator = EJSON.clone(args[1]);
    prev.options = EJSON.clone(args[2]);
    prev.docs = {};
    _.each(docs, function (doc) {
      prev.docs[doc._id] = EJSON.clone(doc);
    });
  }

  // before
  _.each(aspects.before, function (aspect) {
    _.each(docs, function (doc) {
      var r = aspect.call(_.extend({transform: getTransform(doc)}, ctx), userId, doc, fields, args[1], args[2]);
      if (r === false) abort = true;
    });
  });

  if (abort) return false;

  function after(affected, err) {
    var fields = getFields(args[1]);
    var docs = CollectionHooks.getDocs.call(self, collection, args[0], args[2]).fetch();

    _.each(aspects.after, function (aspect) {
      _.each(docs, function (doc) {
        aspect.call(_.extend({
          transform: getTransform(doc),
          previous: prev.docs[doc._id],
          affected: affected,
          err: err
        }, ctx), userId, doc, fields, prev.mutator, prev.options);
      });
    });
  }

  if (async) {
    return _super.call(self, args[0], args[1], args[2], function (err, affected) {
      after(affected, err);
      return args[3].apply(this, arguments);
    });
  } else {
    var affected = _super.apply(self, args);
    after(affected);
    return affected;
  }
});

// This function contains a snippet of code pulled and modified from:
// ~/.meteor/packages/mongo-livedata/collection.js:632-668
// It's contained in these utility functions to make updates easier for us in
// case this code changes.
var getFields = function (mutator) {
  // compute modified fields
  var fields = [];
  _.each(mutator, function (params, op) {
    _.each(_.keys(params), function (field) {
      // treat dotted fields as if they are replacing their
      // top-level part
      if (field.indexOf('.') !== -1)
        field = field.substring(0, field.indexOf('.'));

      // record the field we are trying to change
      if (!_.contains(fields, field))
        fields.push(field);
    });
  });

  return fields;
};

// This function contains a snippet of code pulled and modified from:
// ~/.meteor/packages/mongo-livedata/collection.js
// It's contained in these utility functions to make updates easier for us in
// case this code changes.
var getFields = function (mutator) {
  // compute modified fields
  var fields = [];

  _.each(mutator, function (params, op) {
    //====ADDED START=======================
    if (_.contains(["$set", "$unset", "$inc", "$push", "$pull", "$pop", "$rename", "$pullAll", "$addToSet", "$bit"], op)) {
    //====ADDED END=========================
      _.each(_.keys(params), function (field) {
        // treat dotted fields as if they are replacing their
        // top-level part
        if (field.indexOf('.') !== -1)
          field = field.substring(0, field.indexOf('.'));

        // record the field we are trying to change
        if (!_.contains(fields, field))
          fields.push(field);
      });
    //====ADDED START=======================
    } else {
      fields.push(op);
    }
    //====ADDED END=========================
  });

  return fields;
};