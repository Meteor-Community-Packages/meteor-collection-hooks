import { Meteor } from 'meteor/meteor'
import expect from 'expect'

if (Meteor.isServer) {
  describe('update - Meteor.users collection', function () {
    it('document should have extra property added before being updated', async function () {
      const collection = Meteor.users
      const aspect1 = collection.before.update(function (userId, doc, fieldNames, modifier) {
              if (modifier && modifier.$set && modifier.$set.test) {
                modifier.$set.before_update_value = true
              }
            })

            const aspect2 = collection.after.update(function (userId, doc, fieldNames, modifier, options) {
              expect(modifier !== undefined && options !== undefined).toBe(true, 'modifier and options should not be undefined when fetchPrevious is false issue #97 and #138')
            }, { fetchPrevious: false })

            async function ok (user) {
              await collection.updateAsync({ _id: user._id }, { $set: { update_value: true, test: 2 } })

              expect(await collection.find({ _id: user._id, update_value: true, before_update_value: true }).countAsync()).toBe(1, 'number of users found should be 1')
              await collection.removeAsync({ _id: user._id })
              aspect1.remove()
              aspect2.remove()
            }

            const user = await collection.findOneAsync({ test: 2 })

            if (!user) {
              const id = await collection.insertAsync({ test: 2 })
              await ok(await collection.findOneAsync({ _id: id }))
            } else {
              await ok(user)
            }
          
    })
  })
}