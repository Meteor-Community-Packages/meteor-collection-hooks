import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { InsecureLogin } from '../insecure_login';

InsecureLogin.run();

// Meteor.users.remove({'username': 'InsecureLogin'})
if (!(await Meteor.users.find({ username: 'InsecureLogin' }).countAsync())) {
  await Accounts.createUserAsync({
    username: 'InsecureLogin',
    email: 'test@test.com',
    password: 'password',
    profile: { name: 'InsecureLogin' },
  });
}

Accounts.registerLoginHandler(async function (options) {
  if (!options.username) return;
  const user = await Meteor.users.findOneAsync({ username: options.username });
  if (!user) return;
  return {
    userId: user._id,
  };
});

export { InsecureLogin };
