/* eslint-disable prefer-destructuring */
const deepStrictEqual = require('assert').deepStrictEqual;
const debugProvider = require('../debug');

const debug = debugProvider('d10:mongo:check-base');

const ARTISTS_PIPELINE = [
  { $addFields: { _artist: '$tokenartists' } },
  { $unwind: '$_artist' },
  { $match: { _artist: { $exists: true, $ne: '' } } },
  {
    $group:
    {
      _id: '$_artist',
      songs: { $push: '$$ROOT' },
      count: { $sum: 1 },
      duration: { $sum: '$duration' },
      hits: { $sum: '$hits' },
      genres: { $addToSet: '$genre' },
      ts_creation: { $max: '$ts_creation' },
    },
  },
];

const ALBUMS_PIPELINE = [
  { $match: { album: { $exists: true, $ne: '' } } },
  {
    $group:
    {
      _id: '$album',
      songs: { $push: '$$ROOT' },
      count: { $sum: 1 },
      duration: { $sum: '$duration' },
      hits: { $sum: '$hits' },
      genres: { $addToSet: '$genre' },
      ts_creation: { $max: '$ts_creation' },
    },
  },
];

/*
[ { v: 2, key: { _id: 1 }, name: '_id_', ns: 'd10_dev.users' },
  { v: 2,
    key: { 'sessions._id': 1 },
    name: 'sessions._id_1',
    ns: 'd10_dev.users' } ]
*/
const INDEXES = {
  songs: [
    { name: 'album_1', key: { album: 1 } },
    { name: 'genre_1', key: { genre: 1 } },
    { name: 'hits_1', key: { hits: 1 } },
    { name: 'tokentitle_1', key: { tokentitle: 1 } },
    { name: 'tokenartists_1', key: { tokenartists: 1 } },
    { name: 'ts_creation_1', key: { ts_creation: 1 } },

  ],
  users: [
    { name: 'apikeys.key_1', key: { 'apikeys.key': 1 } },
    { name: 'sessions._id_1', key: { 'sessions._id': 1 } },
    { name: 'login_1', key: { login: 1 }, opts: { unique: true } },
  ],
};


module.exports = check;

function check(db) {
  return db.listCollections().toArray()
    .then(collections => checkArtistsView(db, collections)
      .then(() => checkAlbumsView(db, collections))
      .then(() => checkCollectionsExist(db, collections))
      .then(() => checkCollection(db, 'users'))
      .then(() => checkCollection(db, 'songs')));
}

function checkCollectionsExist(db, collections) {
  const jobs = Object.keys(INDEXES).map((collname) => {
    debug(collname, ': checking if collection exists');
    const collinfo = collections.filter(coll => coll.name === collname);
    if (collinfo.length) {
      debug(collname, ': exists');
      return Promise.resolve(true);
    }
    debug(collname, ': do not exist. Launching the create task');
    return db.createCollection(collname);
  });

  return Promise.all(jobs);
}

function checkCollection(db, collectionName) {
  return db.indexInformation(collectionName, { full: true })
    .then((collindexes) => {
      const refindexes = INDEXES[collectionName];
      const saneindexes = collindexes.filter(index => index.name !== '_id_');
      const missing = getMissingIndexes(refindexes, saneindexes);
      const unexpected = getUnexpectedIndexes(refindexes, saneindexes);
      debug(collectionName, ': ', missing.length, ' missing indexes, ', unexpected.length, ' unexpected indexes');
      if (unexpected.length) {
        debug(collectionName, ': list of unexpected indices:');
        unexpected.forEach(debug);
        debug('Those indices will be left as-is. It can prevent index creation success on the current collection');
        // eslint-disable-next-line no-console
        console.log(collectionName, ': list of unexpected indices:');
        // eslint-disable-next-line no-console
        unexpected.forEach(console.log.bind(console));
        // eslint-disable-next-line no-console
        console.log('Those indices will be left as-is. It can prevent index creation success on the current collection');
      }
      if (missing.length) {
        debug('planning creation of ', missing.length, ' indexes');
        const promises = missing.map((refindex) => {
          debug('planning index ', refindex);
          return function createIndex() {
            return db.createIndex(collectionName, refindex.key, { ...refindex.opts })
              .then((response) => {
                debug(collectionName, ': index created', refindex);
                return response;
              })
              .catch((err) => {
                debug(collectionName, ': index creation failed', err);
                throw err;
              });
          };
        });

        return runPromiseInSequense(promises)
          .then(() => {
            debug(collectionName, ': all indices creation OK');
            return true;
          })
          .catch((err) => {
            debug(collectionName, ': indices creation failed');
            throw err;
          });
      }

      return Promise.resolve(true);
    });
}

function getMissingIndexes(reference, colIndexes) {
  const back = [];
  reference.forEach((refindex) => {
    let found = false;
    colIndexes.forEach((colindex) => {
      try {
        deepStrictEqual(refindex.key, colindex.key);
        found = true;
        // eslint-disable-next-line no-empty
      } catch (e) { }
    });
    if (!found) {
      back.push(refindex);
    }
  });

  return back;
}

function getUnexpectedIndexes(reference, colIndexes) {
  const back = [];
  colIndexes.forEach((colindex) => {
    let found = false;
    reference.forEach((refindex) => {
      try {
        deepStrictEqual(refindex.key, colindex.key);
        found = true;
        // eslint-disable-next-line no-empty
      } catch (e) { }
    });
    if (!found) {
      back.push(colindex);
    }
  });

  return back;
}

function checkArtistsView(db, collections) {
  return checkView(db, collections, 'artists', 'songs', ARTISTS_PIPELINE);
}

function checkAlbumsView(db, collections) {
  return checkView(db, collections, 'albums', 'songs', ALBUMS_PIPELINE);
}

function checkView(db, collections, name, on, pipeline) {
  debug(`${name}: checking collection`);
  const collection = collections.filter(coll => coll.name === name);

  if (collection.length > 1) {
    throw new Error(`${name}: DB got several collections with that name`);
  }

  if (collection.length === 0) {
    debug(`${name}: collection not found. Trying to create`);
    return createView(db, name, on, pipeline);
  }

  debug(`${name}: view  exists`);
  if (checkPipeline(db, collection[0], pipeline)) {
    return Promise.resolve(true);
  }

  return dropCollection(db, name)
    .then(() => createView(db, name, on, pipeline));
}

function createView(db, name, on, pipeline) {
  return db.command({ create: name, viewOn: on, pipeline })
    .then(() => {
      debug(`${name}: view has been created`);
      return Promise.resolve(true);
    })
    .catch((err) => {
      debug(`${name}: View creation failed`, err);
      throw err;
    });
}

function dropCollection(db, name) {
  debug(`${name}: dropping collection`);
  return db.dropCollection(name)
    .then((response) => {
      if (response !== true) {
        throw new Error(`${name}: unable to drop collection`);
      }
      debug(`${name}: collection dropped`);
      return response;
    })
    .catch((err) => {
      debug(`${name}: drop collection failed`, err);
      throw err;
    });
}

function checkPipeline(db, collection, pipeline) {
  const name = collection.name;
  debug(`${name}: checking pipeline definition for collection`);
  let ok;
  try {
    deepStrictEqual(collection.options.pipeline, pipeline);
    ok = true;
    debug(`${name}: pipeline stages ok in collection`);
  } catch (err) {
    debug(`${name}: pipeline stages differs in collection`);
    ok = false;
  }
  return ok;
}

function runPromiseInSequense(arr) {
  return arr.reduce((promiseChain, currentPromise) => promiseChain
    .then(chainedResult => currentPromise(chainedResult)
      .then(res => res)), Promise.resolve());
}
