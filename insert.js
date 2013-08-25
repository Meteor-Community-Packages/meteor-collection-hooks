CollectionHooks.addPointcuts("insert");
CollectionHooks.wrapMethod("insert");

CollectionHooks.argParser("insert", function (ret) {
	var callback;

	ret.doc = args[0];
	callback = args[1];

	if (typeof callback === "function") {
	  ret._async = true;
	  ret._get = function (cb) {
	    return args.concat([ret.doc, function () {
	      if (typeof cb === "function") cb.apply(this, arguments);
	      callback.apply(this, arguments);
	    }]);
	  };
	}

	return ret;
});

CollectionHooks.defineAdvice("insert", function () {

});