const d10 = require('../d10');

/*
  This file contains all the
  denormalizations in place
  in the data model
*/

module.exports = denormalize;

function denormalize(song, oldsong = null) {
  return new Promise((resolve) => {
    const promises = [];

    const eventPromise = denormalizeEvents(song, oldsong);
    if (eventPromise) {
      promises.push(eventPromise);
    }

    Promise.all(allSettled(promises)).then(resolve);
  });
}

// ////////////////////////////
/*
  songs -> events

  an event, in events collection, got a reference to a song
  event.song === song._id

  The fields:
      totkentitle, tokenartists, genre, album
  are copied from the song to the events.

  This function is idempotent.
*/

function denormalizeEvents(song, oldsong = null) {
  const fields = new Map();
  ['tokentitle', 'tokenartists', 'genre', 'album'].forEach((field) => {
    if (!oldsong || !isSame(song[field], oldsong[field])) {
      fields.set(field, song[field]);
    }
  });

  if (fields.size) {
    const $set = {};
    fields.forEach((v, k) => { $set[k] = v; });

    return d10.mcol(d10.COLLECTIONS.EVENTS).updateMany(
      { song: song._id },
      { $set },
    );
  }

  return null;
}

function isSame(fielda, fieldb) {
  if (Array.isArray(fielda)) {
    return fielda.join(',') === fieldb.join(',');
  }
  return fielda === fieldb;
}

function allSettled(promises) {
  return promises.map(p => p
    .then(value => ({ status: 'fulfilled', value }))
    .catch(reason => ({ status: 'rejected', reason })));
}
