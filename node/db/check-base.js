const deepStrictEqual = require('assert').deepStrictEqual;
const debugProvider = require('../debug');

const debug = debugProvider('d10:mongo:check-base');

const ARTISTS_PIPELINE = [
  { $unwind: '$tokenartists' },
  { $match: { tokenartists: { $exists: true, $ne: '' } } },
  {
    $group:
    {
      _id: '$tokenartists',
      songs: { $push: '$$ROOT' },
      count: { $sum: 1 },
      duration: { $sum: '$duration' },
      hits: { $sum: '$hits' },
      genres: { $addToSet: '$genre' },
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
const indexes = {
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
  return db.collections().then(collections => checkArtistsView(db, collections)
    .then(() => checkAlbumsView(db, collections))
    .then(() => checkCollectionsExist(db, collections))
    .then(() => checkCollection(db, 'users'))
    .then(() => checkCollection(db, 'songs'))
  );
}

function checkCollectionsExist(db, collections) {
  const jobs = Object.keys(indexes).map((collname) => {
    debug(collname, ': checking if collection exists');
    const collinfo = collections.filter(coll => coll.collectionName === collname);
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
      const refindexes = indexes[collectionName];
      const saneindexes = collindexes.filter(index => index.name !== '_id_');
      const missing = getMissingIndexes(refindexes, saneindexes);
      const unexpected = getUnexpectedIndexes(refindexes, saneindexes);
      debug(collectionName, ': ', missing.length, ' missing indexes, ', unexpected.length, ' unexpected indexes');
      if (unexpected.length) {
        debug(collectionName, ': list of unexpected indices:');
        unexpected.forEach(debug);
        debug('Those indices will be left as-is. It can prevent index creation success on the current collection');
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
  debug('checking for "artists" collection');
  const artistsCollection = collections.filter(coll => coll.collectionName === 'artists');
  if (artistsCollection.length > 1) {
    throw new Error('DB got several collections "artists"');
  }
  if (artistsCollection.length === 0) {
    debug('"artists" collection not found. Trying to create');
    return db.command({ create: 'artists', viewOn: 'songs', pipeline: ARTISTS_PIPELINE })
      .then(() => {
        debug('View "artists" has been created');
        return Promise.resolve(true);
      })
      .catch((err) => {
        debug('View "artists" creation failed', err);
        throw err;
      });
  }

  debug('view "artists" exists');
  return Promise.resolve(true);
}

function checkAlbumsView(db, collections) {
  debug('checking for "albums" collection');
  const artistsCollection = collections.filter(coll => coll.collectionName === 'albums');
  if (artistsCollection.length > 1) {
    throw new Error('DB got several collections "albums"');
  }
  if (artistsCollection.length === 0) {
    debug('"albums" collection not found. Trying to create');
    return db.command({ create: 'albums', viewOn: 'songs', pipeline: ALBUMS_PIPELINE })
      .then(() => {
        debug('View "albums" has been created');
        return Promise.resolve(true);
      })
      .catch((err) => {
        debug('View "albums" creation failed', err);
        throw err;
      });
  }

  debug('view "albums" exists');
  return Promise.resolve(true);
}

function runPromiseInSequense(arr) {
  return arr.reduce((promiseChain, currentPromise) => promiseChain
    .then(chainedResult => currentPromise(chainedResult)
      .then(res => res)), Promise.resolve());
}
