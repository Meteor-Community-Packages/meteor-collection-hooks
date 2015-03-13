## vNEXT

## v0.7.11

* Fix update and insert by string _id (https://github.com/matb33/meteor-collection-hooks/issues/89 and likely https://github.com/matb33/meteor-collection-hooks/issues/90)

## v0.7.10

* Add tests to verify direct update and insert by string _id (https://github.com/matb33/meteor-collection-hooks/issues/89)
* Set api.versionsFrom to 1.0.3

## v0.7.9

* Add tests to verify hook functionality against CollectionFS (https://github.com/matb33/meteor-collection-hooks/issues/84)

## v0.7.8

* Fix instances of direct calls returning raw data instead of the massaged versions (such as insert returning an object instead of _id) (https://github.com/matb33/meteor-collection-hooks/issues/86, https://github.com/matb33/meteor-collection-hooks/issues/73)

## v0.7.7

* Remove bind polyfill (https://github.com/matb33/meteor-collection-hooks/issues/77)

## v0.7.6

* Use versionsFrom 0.9.1
* Fix `new Meteor.Collection` so as not to have to re-assign prototype

## v0.7.5

* Fix backward compatibility issue (https://github.com/meteor/meteor/issues/2549)

## v0.7.4

* Update for Meteor 0.9.1

## v0.7.3

* **Update for Meteor 0.9**
* Store the value of `this.userId` from a `Meteor.publish` function in an environment variable so it is preserved across yielding operations

## v0.7.2

* Allow specifying hook options on a per-collection basis

## v0.7.1

* Fix direct implementation and associated tests (#46)

## v0.7.0

* Implement second parameter `options` for all hooks (`coll.before.update(func, {option: 123})`)
* Add global `CollectionHooks.defaults` to specify options that apply to all or specific hooks
* Add `fetchPrevious` option, which must be set to `false` to prevent fetching `this.previous` (which can also be set via global `CollectionHooks.defaults`) (#41)

## v0.6.7

* Eliminate unnecessary reduction in performance from iterating through individual documents when no hooks are defined. (#38)

## v0.6.6

* Add automated testing and additional tests for `userId` in publish functions. (#21)
* Add functions for direct operations on underlying collection, ignoring hooks. (#3)
* Update argument/input logic of hooks for better compatibility with other packages. (#24)
