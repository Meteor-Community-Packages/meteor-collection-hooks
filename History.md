## vNEXT

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
