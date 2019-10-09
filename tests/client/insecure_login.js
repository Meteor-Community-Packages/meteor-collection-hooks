import { Accounts } from 'meteor/accounts-base'
import { InsecureLogin } from '../insecure_login'

Accounts.callLoginMethod({
  methodArguments: [{ username: 'InsecureLogin' }],
  userCallback (err) {
    if (err) throw err
    console.info('Insecure login successful!')
    InsecureLogin.run()
  }
})

export {
  InsecureLogin
}
