import { Meteor } from 'meteor/meteor'
import { Tinytest } from 'meteor/tinytest'
import { InsecureLogin } from './insecure_login'

Tinytest.addAsync('users - find hooks should be capable of being used on special Meteor.users collection', function (test, next) {
  // eslint-disable-next-line array-callback-return
  const aspect1 = Meteor.users.before.find(function (userId, selector, options) {
    if (selector && selector.test) {
      selector.a = 1
    }
  })

  // eslint-disable-next-line array-callback-return
  const aspect2 = Meteor.users.after.find(function (userId, selector, options) {
    if (selector && selector.test) {
      selector.b = 1
    }
  })

  InsecureLogin.ready(async function () {
    const selector = { test: 1 }
    Meteor.users.find(selector)
    test.equal(Object.prototype.hasOwnProperty.call(selector, 'a'), true)
    test.equal(Object.prototype.hasOwnProperty.call(selector, 'b'), true)
    aspect1.remove()
    aspect2.remove()

    test.notEqual(await Meteor.users.find().countAsync(), 0)

    next()
  })
})

Tinytest.addAsync('users - find hooks should be capable of being used on wrapped Meteor.users collection', function (test, next) {
  function TestUser (doc) {
    return Object.assign(this, doc)
  }

  Meteor.users.__transform = doc => new TestUser(doc)

  const MeteorUsersFind = Meteor.users.find

  Meteor.users.find = function (selector = {}, options = {}) {
    return MeteorUsersFind.call(this, selector, { transform: Meteor.users.__transform, ...options })
  }

  // eslint-disable-next-line array-callback-return
  const aspect1 = Meteor.users.before.find(function (userId, selector, options) {
    console.log('before find', selector, options)
    if (selector && selector.test) {
      selector.a = 1
    }
  })

  // eslint-disable-next-line array-callback-return
  const aspect2 = Meteor.users.after.find(function (userId, selector, options) {
    console.log('after find', selector, options)
    if (selector && selector.test) {
      selector.b = 1
    }
  })

  InsecureLogin.ready(async function () {
    const selector = { test: 1 }
    const res = Meteor.users.find(selector)
    console.log('res', res)
    console.log('selector', selector)
    test.equal(Object.prototype.hasOwnProperty.call(selector, 'a'), true)
    test.equal(Object.prototype.hasOwnProperty.call(selector, 'b'), true)
    aspect1.remove()
    aspect2.remove()

    test.notEqual(await Meteor.users.find().countAsync(), 0)

    Meteor.users.find = MeteorUsersFind

    console.log('calling next')
    next()
  })
})
