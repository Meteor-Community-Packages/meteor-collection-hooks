/* global Package */

Package.describe({
  name: 'matb33:collection-hooks',
  summary: 'Extends Mongo.Collection with before/after hooks for insert/update/remove/find/findOne',
  version: '0.10.0',
  git: 'https://github.com/matb33/meteor-collection-hooks.git'
})

Package.onUse(function (api, where) {

  api.versionsFrom('1.7.0.5')

  api.use([
    'mongo',
    'tracker',
    'ejson',
    'minimongo',
    'ecmascript',
  ])

  api.use(['accounts-base'], ['client', 'server'], {weak: true})

  api.mainModule('client.js', 'client');
  api.mainModule('server.js', 'server');

  api.export('CollectionHooks')
})

Package.onTest(function (api) {
  // var isTravisCI = process && process.env && process.env.TRAVIS

  api.versionsFrom('1.7.0.5')

  api.use([
    'matb33:collection-hooks',
    'accounts-base',
    'accounts-password',
    'mongo',
    'tinytest',
    'test-helpers',
    "ecmascript"
  ]);

  api.mainModule('tst/client/main.js', 'client');
  api.mainModule('tst/server/main.js', 'server');
})