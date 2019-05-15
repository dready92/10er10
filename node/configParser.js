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

function overridesWithEnv() {
  if (process.env.MONGO_URL) {
    config.mongo.url = process.env.MONGO_URL;
    config.mongo.options = {};
  }

  if (process.env.MONGO_OPTIONS) {
    try {
      config.mongo.options = JSON.parse(process.env.MONGO_OPTIONS);
    } catch (e) {
      console.log('error json.parsing string', e);
    }
  }

  if (process.env.MONGO_DB) {
    config.mongo.database = process.env.MONGO_DB;
  }

  if (process.env.AUDIO_TMPDIR) {
    config.audio.tmpdir = process.env.AUDIO_TMPDIR;
  }
  if (process.env.AUDIO_DIR) {
    config.audio.dir = process.env.AUDIO_DIR;
  }
  if (process.env.IMAGES_TMPDIR) {
    config.images.tmpdir = process.env.IMAGES_TMPDIR;
  }
  if (process.env.IMAGES_DIR) {
    config.images.dir = process.env.IMAGES_DIR;
  }
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
  overridesWithEnv(config);
};

exports.switchDev = function switchDev() {
  if (!mergedConfig) { return; }
  config.port = config.port_dev;
  config.production = false;
  config.couch = config.couch_dev;
  config.mongo = config.mongo_dev;
  overridesWithEnv(config);
};
