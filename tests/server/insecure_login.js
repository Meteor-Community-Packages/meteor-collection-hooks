import { Meteor } from 'meteor/meteor'
import { Accounts } from 'meteor/accounts-base'
import { InsecureLogin } from '../insecure_login'

InsecureLogin.run()

// Meteor.users.remove({'username': 'InsecureLogin'})
if (!Meteor.users.find({ username: 'InsecureLogin' }).count()) {
  Accounts.createUser({
    username: 'InsecureLogin',
    email: 'test@test.com',
    password: 'password',
    profile: { name: 'InsecureLogin' }
  })
}

Accounts.registerLoginHandler(function (options) {
  if (!options.username) return
  const user = Meteor.users.findOne({ username: options.username })
  if (!user) return
  return {
    userId: user._id
  }
})

export {
  InsecureLogin
}
