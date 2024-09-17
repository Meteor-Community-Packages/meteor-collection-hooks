/* global Package */

Package.describe({
  name: 'matb33:collection-hooks',
  summary: 'Extends Mongo.Collection with before/after hooks for insert/update/upsert/remove/find/findOne',
  version: '2.0.0-rc.4',
  git: 'https://github.com/Meteor-Community-Packages/meteor-collection-hooks'
})

Package.onUse(function (api) {
  api.versionsFrom(['3.0.3'])

  api.use([
    'mongo',
    'tracker',
    'ejson',
    'minimongo',
    'ecmascript'
  ])

  api.use('zodern:types@1.0.13', 'server')

  api.use(['accounts-base'], ['client', 'server'], { weak: true })

  api.mainModule('client.js', 'client')
  api.mainModule('server.js', 'server')

  api.export('CollectionHooks')
})

Package.onTest(function (api) {
  api.versionsFrom(['3.0.3'])

  api.use([
    'matb33:collection-hooks',
    'accounts-base',
    'accounts-password@3.0.1',
    'mongo',
    'ddp',
    'tinytest',
    'test-helpers',
    'ecmascript',
    'jquery'
  ])

  api.mainModule('tests/client/main.js', 'client')
  api.mainModule('tests/server/main.js', 'server')
})
