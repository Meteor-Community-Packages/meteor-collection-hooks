/* global Package */

Package.describe({
  name: 'matb33:collection-hooks',
  summary: 'Extends Mongo.Collection with before/after hooks for insert/update/upsert/remove/find/findOne',
  version: '2.1.0-beta.4',
  documentation: '../../README.md',
  git: 'https://github.com/Meteor-Community-Packages/meteor-collection-hooks'
})

Package.onUse(function (api) {
  api.versionsFrom(['2.16', '3.0.2', '3.1'])

  api.use([
    'mongo',
    'tracker',
    'ejson',
    'minimongo',
    'ecmascript',
    'lai:collection-extensions'
  ])

  api.use('zodern:types@1.0.13', 'server')

  api.use(['accounts-base'], ['client', 'server'], { weak: true })

  api.mainModule('client.js', 'client')
  api.mainModule('server.js', 'server')

  api.export('CollectionHooks')
})

Package.onTest(function (api) {
  api.versionsFrom(['2.16', '3.0.2', '3.1'])

  api.use([
    'matb33:collection-hooks',
    'accounts-base',
    'accounts-password',
    'mongo',
    'ecmascript',
    'jquery'
  ])
})
