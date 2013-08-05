if Meteor.isServer

  # Set up allow/deny rules for test collections
  collections = {}

  # We create the collections in the publisher (instead of using a method or
  # something) because if we made them with a method, we'd need to follow the
  # method with some subscribes, and it's possible that the method call would
  # be delayed by a wait method and the subscribe messages would be sent before
  # it and fail due to the collection not yet existing. So we are very hacky
  # and use a publish.
  Meteor.publish "clientServerTests", (nonce) ->
    return unless @userId

    check(nonce, String)
    cursors = []
    needToConfigure = `undefined`

    # helper for defining a collection. we are careful to create just one
    # Meteor.Collection even if the sub body is rerun, by caching them.
    defineCollection = (name, insecure, transform, hooks) ->
      fullName = name + nonce

      if _.has(collections, fullName)
        collection = collections[fullName]
        if needToConfigure is true
          throw new Error("collections inconsistently exist")
        needToConfigure = false
      else
        collection = new Meteor.Collection(fullName,
          transform: transform
        )
        collections[fullName] = collection
        if needToConfigure is false
          throw new Error("collections inconsistently don't exist")
        needToConfigure = true
        collection._insecure = insecure

        m = {}
        m["clear-collection-" + fullName] = -> collection.remove({})
        Meteor.methods(m)

        # add whatever hook to the collection
        hooks(collection)

      # TODO we need to figure out some way to get this.userId to the hook
      cursors.push( collection.find({}, {}, @userId) )
      return collection

    # defined collections
    serverUserId = null

    foo = defineCollection.call this, "foo", true, null, (coll) ->
      coll.before "find", (userId) -> serverUserId = userId

    Meteor.methods
      "fooFind": ->
        serverUserId = null
        foo.find()
        return serverUserId

    if needToConfigure
      # Do whatever to the collections

      Meteor._debug "collections configured"
    else
      Meteor._debug "skipping configuration"

    return cursors

if Meteor.isClient
  runTests = ->
    # Set up a bunch of test collections... on the client! They match the ones
    # created by setUpAllowTestsCollections.
    nonce = Random.id()

    # Tell the server to make, configure, and publish a set of collections unique
    # to our test run. Since the method does not unblock, this will complete
    # running on the server before anything else happens.
    Meteor.subscribe("clientServerTests", nonce)

    # helper for defining a collection, subscribing to it, and defining
    # a method to clear it
    defineCollection = (name, transform, hooks) ->
      fullName = name + nonce

      collection = new Meteor.Collection fullName,
        transform: transform

      collection.callClearMethod = (callback) ->
        Meteor.call "clear-collection-" + fullName, callback

      collection.unnoncedName = name

      hooks(collection)
      return collection

    # resticted collection with same allowed modifications, both with and
    # without the `insecure` package
    clientUserId = null

    foo = defineCollection "foo", `undefined`, (coll) ->
      coll.before "find", (userId) -> clientUserId = userId

    Tinytest.add "userId - client", (test) ->
      foo.find()
      test.equal clientUserId, Meteor.userId()

    Tinytest.addAsync "userId - server method", (test, next) ->
      Meteor.call "fooFind", (err, res) ->
        test.isFalse err, JSON.stringify(err)
        test.equal res, Meteor.userId()
        next()

    Tinytest.add "userId - server publish", (test) ->
      # TODO need to implement this
      test.fail()

  # Ensure we are logged in before running these tests
  # TODO can we provide a better way to ensure this login?

  if Meteor.userId()
    Meteor._debug "running tests"
    runTests()
  else
    Meteor._debug "logging in to run tests"
    Tinytest.addAsync "userId - dummy login", (test, next) ->
      Meteor.insecureUserLogin("foo", next)
    runTests()
