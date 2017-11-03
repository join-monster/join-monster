'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function quote(str) {
  return `\`${str}\``;
}

module.exports = _extends({}, require('./mixins/pagination-not-supported'), {

  name: 'mysql',

  quote,

  compositeKey(parent, keys) {
    keys = keys.map(key => `${quote(parent)}.${quote(key)}`);
    return `CONCAT(${keys.join(', ')})`;
  }
});