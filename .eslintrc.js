module.exports = {
  env: {
    es6: true,
    node: true
  },
  globals: {
    idx: true
  },
  extends: 'airbnb-base/legacy',
  ecmaFeatures: {
    experimentalObjectRestSpread: true,
    modules: true,
    classes: true,
    sourceType: 'module'
  },
  parser: 'babel-eslint',
  rules: {
    indent: [
      'error',
      2
    ],
    'no-extend-native': 0,
    'func-names': 0,
    'space-before-function-paren': [
      'error',
      'never'
    ],
    'guard-for-in': 0,
    'no-restricted-syntax': 0,
    'no-param-reassign': 0,
    'no-multi-assign': 0,
    'global-require': 0,
    'vars-on-top': 0,
    'block-scoped-var': 0,
    'max-len': [
      'warn',
      125
    ],
    'array-bracket-spacing': [
      'error',
      'always'
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    quotes: [
      'error',
      'single'
    ],
    semi: [
      'error',
      'never'
    ],
    'no-console': 0,
    'no-case-declarations': 0,
    'no-unused-vars': [
      2,
      {
        argsIgnorePattern: '^__+$',
        varsIgnorePattern: '^__+$',
      }
    ],
  }
}
