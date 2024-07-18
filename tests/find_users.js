// import { Meteor } from 'meteor/meteor'
// import { Tinytest } from 'meteor/tinytest'
// import { InsecureLogin } from './insecure_login'

// NOTE: v3 not supporting find hooks
// TODO(v3): both not working on client. selector is just { test: 1 } instead of { test: 1, a: 1, b: 1 }
// When running in isolation, both tests pass
// When running only one, both work, too
// Tinytest.addAsync('users - find hooks should be capable of being used on special Meteor.users collection', async function (test) {
//   // eslint-disable-next-line array-callback-return
//   const aspect1 = Meteor.users.before.find(function (userId, selector, options) {
//     if (selector && selector.test) {
//       selector.a = 1
//     }
//   })

//   // eslint-disable-next-line array-callback-return
//   const aspect2 = Meteor.users.after.find(function (userId, selector, options) {
//     if (selector && selector.test) {
//       selector.b = 1
//     }
//   })

//   await InsecureLogin.ready(async function () {
//     const selector = { test: 1 }
//     Meteor.users.find(selector)
//     test.equal(Object.prototype.hasOwnProperty.call(selector, 'a'), true)
//     test.equal(Object.prototype.hasOwnProperty.call(selector, 'b'), true)
//     aspect1.remove()
//     aspect2.remove()

//     test.notEqual(await Meteor.users.find().countAsync(), 0)
//   })
// })

// Tinytest.addAsync('users - find hooks should be capable of being used on wrapped Meteor.users collection', function (test, next) {
//   function TestUser (doc) {
//     return Object.assign(this, doc)
//   }

//   Meteor.users.__transform = doc => new TestUser(doc)

//   const MeteorUsersFind = Meteor.users.find

//   Meteor.users.find = function (selector = {}, options = {}) {
//     return MeteorUsersFind.call(this, selector, { transform: Meteor.users.__transform, ...options })
//   }

//   // eslint-disable-next-line array-callback-return
//   const aspect1 = Meteor.users.before.find(function (userId, selector, options) {
//     if (selector && selector.test) {
//       selector.a = 1
//     }
//   })

//   // eslint-disable-next-line array-callback-return
//   const aspect2 = Meteor.users.after.find(function (userId, selector, options) {
//     if (selector && selector.test) {
//       selector.b = 1
//     }
//   })

//   InsecureLogin.ready(async function () {
//     const selector = { test: 1 }
//     Meteor.users.find(selector)
//     test.equal(Object.prototype.hasOwnProperty.call(selector, 'a'), true)
//     test.equal(Object.prototype.hasOwnProperty.call(selector, 'b'), true)
//     aspect1.remove()
//     aspect2.remove()

//     test.notEqual(await Meteor.users.find().countAsync(), 0)

//     Meteor.users.find = MeteorUsersFind

//     next()
//   })
// })
