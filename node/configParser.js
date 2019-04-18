/* eslint-disable no-param-reassign */
const fs = require('fs');
const config = require('./config');

let mergedConfig = false;

function deepMerge(a, b) {
  Object.keys(a).forEach((i) => {
    const aType = getType(a, i);
    const bType = getType(b, i);
    // special cases
    if (bType === 'undefined') {
      return;
    }
    if (aType === 'undefined') {
      if (bType !== 'undefined') return;
      a[i] = b[i];
    } else if (aType !== bType) {
      a[i] = b[i];
    } else if (aType === 'array') {
      b[i].forEach((v) => {
        a[i].push(v);
      });
    } else if (aType === 'object') {
      deepMerge(a[i], b[i]);
    } else {
      a[i] = b[i];
    }
  });
  return a;
}

function getType(obj, key) {
  if (obj[key] === undefined) {
    return 'undefined';
  }
  if (Object.prototype.toString.call(obj[key]) === '[object Array]') {
    return 'array';
  }
  if (typeof obj[key] === 'object') {
    return 'object';
  }
  return 'scalar';
}


// eslint-disable-next-line consistent-return
exports.getConfig = function getConfig(callback) {
  if (mergedConfig) {
    return callback(null, config);
  }
  const localConfigFile = `${__dirname}/config.local.js`;
  fs.stat(localConfigFile, (err) => {
    if (err) {
      mergedConfig = true;
    } else {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      const localConfig = require(localConfigFile);
      deepMerge(config, localConfig);
      mergedConfig = true;
    }
    callback(null, config);
  });
};

exports.switchProd = function switchProd() {
  if (!mergedConfig) { return; }
  config.port = config.port_prod;
  config.production = true;
  config.couch = config.couch_prod;
  config.mongo = config.mongo_prod;
};

exports.switchDev = function switchDev() {
  if (!mergedConfig) { return; }
  config.port = config.port_dev;
  config.production = false;
  config.couch = config.couch_dev;
  config.mongo = config.mongo_dev;
};
