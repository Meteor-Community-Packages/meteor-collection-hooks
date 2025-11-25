import { Meteor } from 'meteor/meteor'
import expect from 'expect'

if (Meteor.isServer) {
  describe('insert - Meteor.users collection', function () {
    it('document should have extra property added before being inserted and properly provide inserted _id in after hook', async function () {
      const collection = Meteor.users

      const aspect1 = collection.before.insert(function (nil, doc) {
        if (doc && doc.test) {
          doc.before_insert_value = true
        }
      })

      const aspect2 = collection.after.insert(function (nil, doc) {
        if (doc && doc.test) {
          expect(doc._id).toBe(this._id)
          expect(Array.isArray(doc._id)).toBe(false)
        }
      })

      const id = await collection.insertAsync({ start_value: true, test: 1 })

      expect(await collection.find({ start_value: true, before_insert_value: true }).countAsync()).not.toBe(0)
      await collection.removeAsync({ _id: id })
      aspect1.remove()
      aspect2.remove()
    })
  })
}
