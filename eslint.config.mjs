import standard from 'eslint-plugin-standard'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
})

export default [...compat.extends('standard'), {
  plugins: {
    standard
  },

  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',

    parserOptions: {
      ecmaFeatures: {
        modules: true
      }
    }
  }
}, {
  files: ['tests-app/**/*.js'],
  languageOptions: {
    globals: {
      describe: 'readonly',
      it: 'readonly',
      before: 'readonly',
      after: 'readonly',
      beforeEach: 'readonly',
      afterEach: 'readonly',
      mocha: 'readonly'
    }
  }
}]