import { Mongo } from 'meteor/mongo'
import expect from 'expect'

describe('Transform Tests', function () {
  it('should have correct `this` context in hooks when using transform', async function () {
    const collection = new Mongo.Collection(null, {
      transform: doc => ({ ...doc, isTransformed: true })
    })
  
    collection.allow({
      insert () { return true },
      update () { return true },
      remove () { return true }
    })
  
    const counts = {
      before: {
        insert: 0,
        update: 0,
        remove: 0
      },
      after: {
        insert: 0,
        update: 0,
        remove: 0
      }
    }
  
    collection.before.insert(function (userId, doc) { 
      if (typeof this.transform === 'function' && this.transform().isTransformed) { 
        counts.before.insert++ 
      } 
    })
    collection.before.update(function (userId, doc) { 
      if (typeof this.transform === 'function' && this.transform().isTransformed) { 
        counts.before.update++ 
      } 
    })
    collection.before.remove(function (userId, doc) { 
      if (typeof this.transform === 'function' && this.transform().isTransformed) { 
        counts.before.remove++ 
      } 
    })
    collection.after.insert(function (userId, doc) { 
      if (typeof this.transform === 'function' && this.transform().isTransformed) { 
        counts.after.insert++ 
      } 
    })
    collection.after.update(function (userId, doc) { 
      if (typeof this.transform === 'function' && this.transform().isTransformed) { 
        counts.after.update++ 
      } 
    })
    collection.after.remove(function (userId, doc) { 
      if (typeof this.transform === 'function' && this.transform().isTransformed) { 
        counts.after.remove++ 
      } 
    })
  
    // TODO: does it make sense to pass an _id on insert just to get this test
    // to pass? Probably not. Think more on this -- it could be that we simply
    // shouldn't be running a .transform() in a before.insert -- how will we
    // know the _id? And that's what transform is complaining about.
    const id = await collection.insertAsync({ _id: '1', start_value: true })

    await collection.updateAsync({ _id: id }, { $set: { update_value: true } })
    await collection.removeAsync({ _id: id })

    expect(counts.before.insert).toBe(1)
    expect(counts.before.update).toBe(1)
    expect(counts.before.remove).toBe(1)
    expect(counts.after.insert).toBe(1)
    expect(counts.after.update).toBe(1)
    expect(counts.after.remove).toBe(1)
    })
})
