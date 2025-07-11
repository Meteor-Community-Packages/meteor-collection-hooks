import { Meteor } from 'meteor/meteor'
import expect from 'expect'

// NOTE: v3 not supporting find hooks
// TODO(v3): both not working on client. selector is just { test: 1 } instead of { test: 1, a: 1, b: 1 }
// When running in isolation, both tests pass
// When running only one, both work, too
describe('users - find hooks', function () {
  it('should be capable of being used on special Meteor.users collection', async function () {
    const originalGetUserId = CollectionHooks.getUserId
    CollectionHooks.getUserId = () => 'mock-user-id'

    let beforeCalled = false
    let afterCalled = false

    try {      
      const aspect1 = Meteor.users.before.find(function (userId, selector, options) {
        beforeCalled = true
        if (selector && selector.test) {
          selector.a = 1
        }
      })

      const aspect2 = Meteor.users.after.find(function (userId, selector, options) {
        afterCalled = true
        if (selector && selector.test) {
          selector.b = 1
        }
      })

      const selector = { test: 1 }
      
      const cursor = Meteor.users.find(selector)
      
      expect(Object.prototype.hasOwnProperty.call(selector, 'a')).toBe(true)
      expect(Object.prototype.hasOwnProperty.call(selector, 'b')).toBe(true)
      aspect1.remove()
      aspect2.remove()

    } finally {
      CollectionHooks.getUserId = originalGetUserId
    }
  })

  it('should be capable of being used on wrapped Meteor.users collection', async function () {
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

    const selector = { test: 1 }
    Meteor.users.find(selector)
    expect(Object.prototype.hasOwnProperty.call(selector, 'a')).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(selector, 'b')).toBe(true)
    aspect1.remove()
    aspect2.remove()

    expect(await Meteor.users.find().countAsync()).not.toBe(0)

    Meteor.users.find = MeteorUsersFind
    
  })
})
