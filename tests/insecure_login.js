InsecureLogin = {
  queue: [],
  ran: false,
  ready: function (callback) {
    this.queue.push(callback);
    if (this.ran) this.unwind();
  },
  run: function () {
    this.ran = true;
    this.unwind();
  },
  unwind: function () {
    _.each(this.queue, function (callback) {
      callback();
    });
    this.queue = [];
  }
};

if (Meteor.isClient) {
  Meteor.startup(function () {
    Accounts.callLoginMethod({
      methodArguments: [{key: "Test"}],
      userCallback: function (err) {
        if (err) throw err;
        console.info("Insecure login successful!");
        InsecureLogin.run();
      }
    });
  });
} else {
  InsecureLogin.run();
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    if (!Meteor.users.find().count()) {
      Meteor.users.insert({profile: {name: "Test"}});
    }
  });

  Accounts.registerLoginHandler(function (options) {
    if (!options.key) return;

    var user = Meteor.users.findOne({"profile.name": options.key});
    if (!user) return;

    var stampedLoginToken = Accounts._generateStampedLoginToken();

    Meteor._ensure(user, "services", "resume");

    if (_.has(user.services.resume, "loginTokens")) {
      user.services.resume.loginTokens.push(stampedLoginToken);
    } else {
      user.services.resume.loginTokens = [stampedLoginToken];
    }

    Meteor.users.update({_id: user._id}, {$set: {services: user.services}});

    return {
      id: user._id,
      token: stampedLoginToken.token
    };
  });
}