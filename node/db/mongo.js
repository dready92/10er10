import { MongoClient } from 'mongodb';

module.exports = function getMongoCLient(url, options) {
  return MongoClient.connect(url, options);
};
