/* eslint-disable no-console */
/*

This script will migrate D10 data from a CouchDB datastore to a MongoDB datastore.

It'll lookup the configuration of couch and mongo in config.js and the config.local.js overwrite.

It supports dev as well as prod migrations.

Example:

<code>
node/config.js

exports.couch_prod = {
  d10: {dsn: "http://localhost:5984/",database:"d10"},
  d10wi: {dsn: "http://localhost:5984/",database:"d10wi"},
  auth: {dsn: "http://localhost:5984/",database:"auth"},
  track: {dsn: "http://localhost:5984/",database:"track"}
};

exports.mongo_prod = {
  url: 'mongodb://localhost:27017/d10_prod',
  database: 'd10_prod',
  options: {},
};


$ node couch2mongo.js -p
</code>
*/
const prompt = require('prompt');
const configParser = require('../configParser');
const d10 = require('../d10');
const artistToken = require('../artistToken');

const schema = {
  properties: {
    target: {
      description: 'Which db to convert ? production (p) or test (t)',
      type: 'string',
      required: true,
    },
  },
};

prompt.start();

prompt.get(schema, (err, result) => {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  if (result.target !== 'p' && result.target !== 't') {
    console.log('Error, target should be "p" (production) or "t" (test)');
    process.exit(1);
  }

  configParser.getConfig((err2, config) => {
    if (err2) {
      console.log(err);
      process.exit(1);
    }

    if (result.target === 'p') {
      configParser.switchProd();
    } else {
      configParser.switchDev();
    }

    console.log(`
-----------------------------------------------------
About to start data migration from CouchDB to MongoDB
               --------------
CouchDB configuration:
d10 datastore: ${config.couch.d10.dsn}/${config.couch.d10.database}
d10wi datastore: ${config.couch.d10wi.dsn}/${config.couch.d10wi.database}
auth datastore: ${config.couch.auth.dsn}/${config.couch.auth.database}
track datastore: ${config.couch.track.dsn}/${config.couch.track.database}
               -------------
MongoDB configuration:
MongoDB datastore: ${config.mongo.url}
MongoDB database: ${config.mongo.database}
MongoDB datastore options: ${JSON.stringify(config.mongo.options)}
-----------------------------------------------------
Press Ctrl-C to abort, or wait 5 seconds
`);
    setTimeout(() => {
      d10.setConfig(config).then(startMigration);
    }, 500);
  });
});

function startMigration() {
  const d10Migration = startD10Migration();

  d10Migration
    .then(() => {
      console.log('migration success');
    })
    .catch(err => console.log('migration error', err))
    .then(() => d10.mongoClient.close());
}

function startD10Migration() {
  return d10.dbp.authGetAllDocs({ include_docs: true })
    .then((docs) => {
      const users = [];
      const userPrivates = {};
      const sessions = [];
      docs.rows.map(row => row.doc).forEach((doc) => {
        if (doc._id.startsWith('us')) {
          users.push(doc);
        } else if (doc._id.startsWith('pr')) {
          userPrivates[`us${doc._id.substring(2)}`] = doc;
        } else if (doc._id.startsWith('se')) {
          sessions.push(doc);
        } else {
          console.log(doc._id);
        }
      });
      console.log('users to migrate:', users.length);
      console.log('sessions to migrate:', sessions.length);

      return D10MigrateUsers(users, userPrivates)
        .then(() => D10MigrateSessions(sessions));
    })
    .then(() => Promise.all([
      d10.dbp.d10GetAllDocs({ include_docs: true }),
      d10.dbp.d10wiGetAllDocs({ include_docs: true }),
    ]))
    .then(([allDocs, allwiDocs]) => {
      const songs = [];
      const playlists = [];
      const userHistory = [];
      const userPreferences = [];
      const songHits = {};
      allDocs.rows.map(row => row.doc).forEach((doc) => {
        if (doc._id.startsWith('aa')) {
          songs.push(doc);
        } else if (doc._id.startsWith('pl')) {
          playlists.push(doc);
        } else {
          console.log(doc._id);
        }
      });

      allwiDocs.rows.map(row => row.doc).forEach((doc) => {
        if (doc._id.startsWith('pr')) {
          userHistory.push(doc);
        } else if (doc._id.startsWith('up')) {
          userPreferences.push(doc);
        } else if (doc._id.startsWith('aa')) {
          songHits[doc._id] = doc.hits || 0;
        } else {
          console.log(doc._id);
        }
      });

      console.log('songs to migrate:', songs.length);
      console.log('playlists to migrate:', playlists.length);
      console.log('user preferences to migrate:', userPreferences.length);
      console.log('user history to migrate:', userHistory.length);
      return D10MigrateSongs(songs, songHits)
        .then(() => D10MigratePlaylists(playlists))
        .then(() => D10MigrateUserHistory(userHistory))
        .then(() => D10MigrateUserPreferences(userPreferences));
    })
    .then(() => d10.dbp.trackGetAllDocs({ include_docs: true }))
    .then((docs) => {
      const pings = [];
      const playEvents = [];
      docs.rows.map(row => row.doc).forEach((doc) => {
        if (doc._id.startsWith('pi')) {
          pings.push(doc);
        } else if (doc._id.startsWith('pt')) {
          playEvents.push(doc);
        } else {
          console.log(doc._id);
        }
      });
      console.log('pings to migrate:', pings.length);
      console.log('events to migrate:', playEvents.length);
      return D10MigratePings(pings)
        .then(() => D10MigrateEvents(playEvents));
    });
}

function D10MigrateSongs(songs, songHits) {
  const collection = d10.mcol(d10.COLLECTIONS.SONGS);

  console.log('Starting songs migration:');
  console.log('Songs: sanitize');
  const saneData = songs.map((song) => {
    const tokens = artistToken.tokenize(song);
    const newSong = {
      ...song,
      tokentitle: tokens.title,
      tokenartists: tokens.artists,
      hits: songHits[song._id] || 0,
    };
    delete newSong._rev;
    return newSong;
  });
  console.log('Songs: sanitize done');
  return writeInMongo(collection, saneData, 'Songs');
}

function D10MigratePlaylists(playlists) {
  const collection = d10.mcol(d10.COLLECTIONS.PLAYLISTS);

  console.log('Starting playlists migration:');
  console.log('Playlists: sanitize');
  const saneData = playlists.map((playlist) => {
    const newPlaylist = {
      ...playlist,
    };
    delete newPlaylist._rev;
    return newPlaylist;
  });
  console.log('Playlists: sanitize done');
  return writeInMongo(collection, saneData, 'Playlists');
}

function D10MigrateUserPreferences(prefs) {
  const collection = d10.mcol(d10.COLLECTIONS.USERS);

  console.log('Starting user preferences migration:');
  console.log('User preferences: sanitize');
  const saneData = prefs.map((pref) => {
    const newPref = {
      ...pref,
    };
    delete newPref._rev;
    newPref._id = `us${newPref._id.substring(2)}`;
    return newPref;
  });
  console.log('User preferences: sanitize done');
  console.log('User preferences: start write in Mongo');

  function run() {
    if (!saneData.length) {
      console.log('User preferences: Mongo write done');
      return Promise.resolve(true);
    }
    const pref = saneData.pop();
    const id = pref._id;
    delete pref._id;
    return collection.updateOne({ _id: id }, { $set: { preferences: pref } });
  }

  return run();
}

function D10MigrateUserHistory(prefs) {
  const collection = d10.mcol(d10.COLLECTIONS.USER_HISTORY);

  console.log('Starting user history migration:');
  console.log('User history: sanitize');
  const saneData = prefs.map((pref) => {
    const newPref = {
      ...pref,
    };
    delete newPref._rev;
    newPref._id = `us${newPref._id.substring(2)}`;
    return newPref;
  });
  console.log('User history: sanitize done');
  return writeInMongo(collection, saneData, 'User history');
}

function D10MigrateUsers(users, privates) {
  const collection = d10.mcol(d10.COLLECTIONS.USERS);

  console.log('Starting users migration:');
  console.log('Users: sanitize');
  const saneData = users.map((pref) => {
    const newPref = {
      ...pref,
      password: privates[pref._id].password,
      depth: privates[pref._id].depth || 0,
      sessions: [],
    };
    delete newPref._rev;
    return newPref;
  });
  console.log('Users: sanitize done');
  return writeInMongo(collection, saneData, 'Users');
}

function D10MigrateSessions(sessions) {
  const collection = d10.mcol(d10.COLLECTIONS.USERS);

  console.log('Starting sessions migration:');
  console.log('Sessions: sanitize');
  const saneData = sessions.map((pref) => {
    const newPref = { ...pref };
    delete newPref._rev;
    return newPref;
  });
  console.log('Sessions: sanitize done');
  console.log('Sessions: start write in Mongo');

  function run() {
    if (!saneData.length) {
      console.log('Sessions: Mongo write done');
      return Promise.resolve(true);
    }
    const pref = saneData.pop();
    const id = `us${pref.userid}`;
    delete pref.userid;
    return collection.updateOne({ _id: id }, { $push: { sessions: pref } });
  }

  return run();
}

function D10MigratePings(pings) {
  const collection = d10.mcol(d10.COLLECTIONS.PINGS);

  console.log('Starting pings migration:');
  console.log('pings: sanitize');
  const saneData = pings.map((pref) => {
    const newPref = {
      ...pref,
    };
    delete newPref._rev;
    newPref._id = `us${newPref._id.substring(2)}`;
    return newPref;
  });
  console.log('Pings: sanitize done');
  return writeInMongo(collection, saneData, 'Pings');
}

function D10MigrateEvents(events) {
  const collection = d10.mcol(d10.COLLECTIONS.EVENTS);

  console.log('Starting events migration:');
  console.log('Events: sanitize');
  const saneData = events.map((pref) => {
    const newPref = { ...pref };
    delete newPref._rev;
    return newPref;
  });
  console.log('Events: sanitize done');
  return writeInMongo(collection, saneData, 'Events');
}

function writeInMongo(collection, docs, label) {
  console.log(`${label}: write in MongoDB`);
  function start() {
    if (!docs.length) {
      console.log(`${label}: write in MongoDB done`);
      return Promise.resolve(true);
    }

    const doc = docs.pop();
    return collection.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true })
      .then(start);
  }

  return start();
}
