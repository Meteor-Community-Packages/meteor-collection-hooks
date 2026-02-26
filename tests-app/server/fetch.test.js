import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import expect from 'expect'

if (Meteor.isServer) {
  describe('general - local collection', function () {
    it('documents should only have fetched fields', async function () {
      const collection = new Mongo.Collection(null)

      function same (arr1, arr2) {
        return arr1.length === arr2.length && arr1.every(el => arr2.includes(el))
      }

      function start (nil, id) {
        const fields = ['fetch_value1', 'fetch_value2']

        collection.after.update(function (userId, doc, fieldNames, modifier) {
          const { _id, ...docKeys } = Object.keys(doc)
          expect(same(docKeys, fields)).toBe(true)
        }, {
          fetch: fields
        })

        collection.update({ _id: id }, { $set: { update_value: true } })
      }

      collection.insert({
        nonfetch_value1: true,
        nonfetch_value2: true,
        nonfetch_value3: true,
        fetch_value1: true,
        fetch_value2: true
      }, start)
    })
  })
}
