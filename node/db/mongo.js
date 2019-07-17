// eslint-disable-next-line prefer-destructuring
const MongoClient = require('mongodb').MongoClient;

module.exports = function getMongoCLient(url, options) {
  return MongoClient.connect(url, options);
};
