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
  return d10.dbp.d10GetAllDocs({ include_docs: true })
    .then((allDocs) => {
      const songs = [];
      allDocs.rows.map(row => row.doc).forEach((doc) => {
        if (doc._id.startsWith('aa')) {
          songs.push(doc);
        } else {
          console.log(doc._id);
        }
      });

      console.log('songs to migrate:', songs.length);
      return D10MigrateSongs(songs);
    });
}

function D10MigrateSongs(songs) {
  const songsCollection = d10.mongo.collection('songs');

  console.log('Starting songs migration:');
  console.log('Songs: sanitize');
  const saneSongs = songs.map((song) => {
    const tokens = artistToken.tokenize(song);
    return {
      ...song,
      tokentitle: tokens.title,
      tokenartists: tokens.artists,
    };
  });
  console.log('Songs: sanitize done');
  console.log('Songs: write in MongoDB');
  function start() {
    if (!saneSongs.length) {
      console.log('Songs: write in MongoDB done');
      return Promise.resolve(true);
    }

    const song = saneSongs.pop();

    return songsCollection.updateOne({ _id: song._id }, { $set: song }, { upsert: true })
      .then(start);
  }

  return start();
}
