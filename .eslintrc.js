module.exports = {
  "env": {
    "es6": true,
    "node": true
  },
  "extends": "eslint:recommended",
  "ecmaFeatures": {
    "experimentalObjectRestSpread": true,
    "modules": true,
    "classes": true,
    "sourceType": "module"
  },
  "parser": "babel-eslint",
  "rules": {
    "indent": [
      "error",
      2
    ],
    "linebreak-style": [
      "error",
      "unix"
    ],
    "quotes": [
      "error",
      "single"
    ],
    "semi": [
      "error",
      "never"
    ],
    "no-console": 0,
    "no-case-declarations": 0
  }
}
