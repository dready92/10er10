/* eslint-disable no-restricted-globals */
/* eslint-disable no-plusplus */
/* eslint-disable consistent-return */
const bodyParser = require('body-parser');
const fs = require('fs');
const os = require('os');
const d10 = require('./d10');
const mongoSample = require('./lib/radio/mongoSample');
const session = require('./session');

const debug = d10.debug('d10:d10.router.api');
const jsonParserMiddleware = bodyParser.json();
const urlencodedParserMiddleware = bodyParser.urlencoded();

exports.api = (app) => {
  app.post('/api/songs', jsonParserMiddleware, (request) => {
    request.ctx.headers['Content-type'] = 'application/json';
    if (!request.body.ids
      || !Array.isArray(request.body.ids)
      || !request.body.ids.length) {
      return d10.realrest.success([], request.ctx);
    }
    const badIds = request.body.ids.filter(id => id.substr(0, 2) !== 'aa');
    if (badIds.length) {
      return d10.realrest.success([], request.ctx);
    }
    d10.mcol(d10.COLLECTIONS.SONGS).find({ _id: { $in: request.body.ids } })
      .toArray()
      .then(resp => d10.realrest.success(d10.orderedList(request.body.ids, resp), request.ctx))
      .catch(err => d10.realrest.err(500, err, request.ctx));
  });

  app.get('/api/song/aa:id', (request) => {
    d10.mcol(d10.COLLECTIONS.SONGS).findOne({ _id: `aa${request.params.id}` })
      .then((doc) => {
        if (!doc) {
          const err = new Error('Song not found');
          err.code = 404;
          throw err;
        }
        d10.realrest.success(doc, request.ctx);
      })
      .catch((err) => {
        if (err.code === 404) {
          d10.realrest.err(404, {
            error: 'Document not found',
            reason: `id aa${request.params.id} not found`,
          }, request.ctx);
        } else {
          d10.realrest.err(500, {
            error: 'server error',
            reason: null,
          }, request.ctx);
        }
      });
  });

  app.get('/api/userinfos', (request) => {
    const response = {
      user: { ...request.ctx.user },
      playlists: request.ctx.user.playlists,
      preferences: request.ctx.user.preferences,
    };

    delete response.user.playlists;
    delete response.user.preferences;
    delete response.user.password;
    delete response.user.depth;
    delete response.user.parent;
    d10.realrest.success(response, request.ctx);
  }); // /api/userinfos

  app.get('/api/htmlElements', (request) => {
    const promises = Object.keys(d10.config.templates.clientList)
      .map(tplTag => new Promise((resolve, reject) => {
        const tpl = d10.config.templates.clientList[tplTag];
        request.ctx.langUtils.parseServerTemplate(request, tpl, (err, html) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              name: tplTag,
              value: html,
            });
          }
        });
      }));

    const dynamicP = new Promise((resolve, reject) => {
      request.ctx.langUtils.loadLang(request.ctx.lang, 'client', (err, lang) => {
        if (err) {
          reject(err);
        } else {
          resolve({ name: 'dynamic', value: lang });
        }
      });
    });

    const tplsPromise = Promise.all(promises)
      .then((tpls) => {
        const templates = {};
        tpls.forEach((tpl) => {
          templates[tpl.name] = tpl.value;
        });
        return templates;
      });

    Promise.all([tplsPromise, dynamicP])
      .then(([tpls, dynamic]) => {
        const templates = { ...tpls, ...dynamic.value };
        d10.realrest.success(templates, request.ctx);
      })
      .catch(err => d10.realrest.err(500, err, request.ctx));
  });

  app.get('/api/length', (request) => {
    d10.mcol(d10.COLLECTIONS.SONGS)
      .aggregate([
        {
          $match: { reviewed: true, valid: true },
        },
        {
          $group: { _id: null, totalDuration: { $sum: '$duration' } },
        },
      ])
      .toArray()
      .then((documents) => {
        if (!documents.length) {
          return 0;
        }
        return documents[0].totalDuration;
      })
      .then((duration) => {
        d10.realrest.success({ length: duration }, request.ctx);
      })
      .catch((err) => {
        d10.realrest.err(423, err, request.ctx);
      });
  });

  app.get('/api/serverLoad', (request) => {
    d10.realrest.success({ load: os.loadavg() }, request.ctx);
  });

  app.get('/api/toReview', (request) => {
    d10.mcol(d10.COLLECTIONS.SONGS_STAGING).countDocuments({ user: request.ctx.user._id })
      .then(count => d10.realrest.success({ count }, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  });

  app.put('/api/current_playlist', urlencodedParserMiddleware, jsonParserMiddleware, (request) => {
    const user = request.ctx.user;
    const data = { ...request.body };

    if (!data.type) {
      data.type = 'default';
    }
    const actions = [];
    if (data.id) {
      actions.push(d10.mcol(d10.COLLECTIONS.SONGS).findOne(data.id)
        .catch(() => {
          throw new Error('Error in datastore transaction');
        }))
        .then((doc) => {
          if (!doc) {
            throw new Error('Document id is unknown');
          }
        });
    }
    if (data.list) {
      actions.push(d10.mcol(d10.COLLECTIONS.SONGS).find({ _id: { $in: data.list } })
        .toArray()
        .then((docs) => {
          if (!docs || docs.length !== data.list.length) {
            throw new Error('Some document ids can not be found');
          }
        }));
    }

    Promise.all(actions)
      .then(updatePreferences)
      .then(() => d10.realrest.success({ updated: true }, request.ctx))
      .catch(err => d10.realrest.err(413, err, request.ctx));

    function updatePreferences() {
      return d10.mcol(d10.COLLECTIONS.USERS).updateOne({ _id: user._id }, { $set: { 'preferences.playlist': data } });
    }
  });

  app.post('/api/ping', jsonParserMiddleware, (request) => {
    function updateAliveDoc() {
      d10.mcol(d10.COLLECTIONS.PINGS).updateOne(
        { _id: request.ctx.user._id },
        { $push: { ping: Date.now() } },
      )
        .catch(err => debug('ping error on db request:', err));
    }

    function parsePlayerInfos() {
      let infos = null;
      if (!request.body.player || !request.body.player.length) {
        return;
      }
      try {
        infos = request.body.player;
      } catch (e) {
        return;
      }

      function updateHits(id) {
        d10.mcol(d10.COLLECTIONS.SONGS).updateOne({ _id: id }, { $inc: { hits: 1 } })
          .catch(storeerr => debug('/api/ping error on updateHits db request:', storeerr));
      }

      function updateUserData(id) {
        const upkey = { $inc: {} };
        upkey.$inc[`listen.${id}`] = 1;
        d10.mcol(d10.COLLECTIONS.USER_HISTORY).updateOne({ _id: request.ctx.user._id }, upkey)
          .catch(storeerr => debug('/api/ping error on updateUserData db request:', storeerr));
      }

      infos.forEach((v) => {
        if (v.id.substr(0, 2) !== 'aa') {
          return;
        }
        updateHits(v.id);
        updateUserData(v.id);
        const updatedDoc = { ...v };
        updatedDoc.song = updatedDoc.id;
        delete updatedDoc.id;
        updatedDoc._id = `pt${d10.uid()}`;
        updatedDoc.user = request.ctx.user._id;
        d10.mcol(d10.COLLECTIONS.EVENTS).insertOne(updatedDoc)
          .catch(storeerr => debug('/api/ping error on track Store db request:', storeerr));
      });
    }

    function updateSessionTimestamp() {
      session.setSessionTimestamp(request.ctx.session._id, Date.now())
        .catch(err => debug('Session timestamp updated, error:', err));
    }

    updateAliveDoc();
    parsePlayerInfos();
    d10.realrest.success([], request.ctx);
    updateSessionTimestamp();
  });

  app.post('/api/random', jsonParserMiddleware, (request, response) => {
    mongoSample('genre/unsorted', request, response);
  });


  app.post('/api/volume', jsonParserMiddleware, (request) => {
    let volume = (request.body && 'volume' in request.body) ? parseFloat(request.body.volume) : 0;
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(volume)) volume = 0;

    d10.mcol(d10.COLLECTIONS.USERS).updateOne({ _id: request.ctx.user._id }, { $set: { 'preferences.volume': volume } })
      .then(() => d10.realrest.success({ volume }, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  });


  function updateUserPreferences(userId, preferences) {
    return d10.mcol(d10.COLLECTIONS.USERS).updateOne({ _id: userId }, { $set: { preferences } });
  }

  app.put('/api/preference/:name', jsonParserMiddleware, (request) => {
    let prefValue = (request.body && 'value' in request.body) ? request.body.value : null;
    let docUpdateFn;
    if (request.params.name === 'hiddenExtendedInfos' || request.params.name === 'hiddenReviewHelper') {
      docUpdateFn = (doc) => {
        const updatedDoc = { ...doc };
        if (prefValue && prefValue === 'true') {
          updatedDoc[request.params.name] = true;
        } else {
          delete updatedDoc[request.params.name];
        }
        return updatedDoc;
      };
    } else if (request.params.name === 'audioFade') {
      prefValue = parseInt(prefValue, 10);
      if (isNaN(prefValue)) {
        return d10.realrest.err(406, `preference ${request.params.name} should be a number`, request.ctx);
      }
      docUpdateFn = (doc) => {
        const updatedDoc = { ...doc };
        updatedDoc[request.params.name] = prefValue;
        return updatedDoc;
      };
    } else {
      d10.realrest.err(404, `preference ${request.params.name} is unknown`, request.ctx);
      return;
    }

    const newPreferences = docUpdateFn(request.ctx.user.preferences);


    updateUserPreferences(request.ctx.user._id, newPreferences)
      .then(() => d10.realrest.success([], request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  });

  app.put('/api/starring/likes/aa:id', (request) => {
    const songid = `aa${request.params.id}`;
    let star = null;
    d10.mcol(d10.COLLECTIONS.SONGS).findOne({ _id: songid })
      .then((song) => {
        if (!song) {
          throw new Error('Song not found');
        }
      })
      .then(() => {
        const doc = { ...request.ctx.user.preferences };
        if (!doc.dislikes) {
          doc.dislikes = {};
        }
        if (!doc.likes) {
          doc.likes = {};
        }
        if (doc.dislikes[`aa${request.params.id}`]) {
          delete doc.dislikes[`aa${request.params.id}`];
        }
        if (doc.likes[`aa${request.params.id}`]) {
          delete doc.likes[`aa${request.params.id}`];
        } else {
          doc.likes[`aa${request.params.id}`] = true;
          star = 'likes';
        }
        return updateUserPreferences(request.ctx.user._id, doc);
      })
      .then(() => d10.realrest.success({ id: `aa${request.params.id}`, star }, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  });

  app.put('/api/starring/dislikes/aa:id', (request) => {
    const songid = `aa${request.params.id}`;
    let star = null;
    d10.mcol(d10.COLLECTIONS.SONGS).findOne({ _id: songid })
      .then((song) => {
        if (!song) {
          throw new Error('Song not found');
        }
      })
      .then(() => {
        const doc = { ...request.ctx.user.preferences };
        if (!doc.dislikes) {
          doc.dislikes = {};
        }
        if (!doc.likes) {
          doc.likes = {};
        }
        if (doc.likes[`aa${request.params.id}`]) {
          delete doc.likes[`aa${request.params.id}`];
        }
        if (doc.dislikes[`aa${request.params.id}`]) {
          delete doc.dislikes[`aa${request.params.id}`];
        } else {
          doc.dislikes[`aa${request.params.id}`] = true;
          star = 'dislikes';
        }
        return updateUserPreferences(request.ctx.user._id, doc);
      })
      .then(() => d10.realrest.success({ id: `aa${request.params.id}`, star }, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  });

  app.get('/api/search', (request, response) => {
    songSearch('song/search', request, response);
  });

  function songSearch(view, request) {
    const search = d10.ucwords(request.query.start.replace(/^\s+/, '').replace(/\s+$/, ''));

    const titleSearch = d10.mcol(d10.COLLECTIONS.SONGS).find({ tokentitle: { $regex: search } }).sort({ tokentitle: 1 })
      .toArray()
      .then(results => results || [])
      .then(results => results.map(result => ({ doc: result, value: { json: { field: 'title', value: result.tokentitle } } })));
    const albumSearch = d10.mcol(d10.COLLECTIONS.ALBUMS).find({ _id: { $regex: `${search}` } }).sort({ _id: 1 })
      .toArray()
      .then(results => results || [])
      .then(results => results.map(result => ({ name: result._id, value: { json: { field: 'album', value: result._id } } })));
    const artistSearch = d10.mcol(d10.COLLECTIONS.ARTISTS).find({ _id: { $regex: `${search}` } }).sort({ _id: 1 })
      .toArray()
      .then(results => results || [])
      .then(results => results.map(result => ({ name: result._id, value: { json: { field: 'artist', value: result._id } } })));

    Promise.all([titleSearch, artistSearch, albumSearch])
      .then(([title, artist, album]) => {
        const results = { title, artist, album };
        d10.realrest.success(results, request.ctx);
      })
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  app.post('/api/details', jsonParserMiddleware, (request) => {
    let artists = [];
    let albums = [];
    const jobs = [];
    if (request.body.artists) {
      if (Array.isArray(request.body.artists)) {
        artists = [...request.body.artists];
      } else if (request.body.artists.length) {
        artists = [request.body.artists];
      }
    }
    if (request.body.albums) {
      if (Array.isArray(request.body.albums)) {
        albums = [...request.body.albums];
      } else if (request.body.albums.length) {
        albums = [request.body.albums];
      }
    }
    if (artists.length) {
      jobs.push(
        d10.mcol(d10.COLLECTIONS.ARTISTS).find({ _id: { $in: artists } })
          .toArray()
          .then(as => as || [])
          .then((as) => {
            const back = { field: 'artists', results: [] };
            as.forEach((artist) => {
              artist.songs.forEach(song => back.results.push({ doc: song, key: artist._id }));
            });
            return back;
          }),
      );
    }
    if (albums.length) {
      jobs.push(
        d10.mcol(d10.COLLECTIONS.ALBUMS).find({ _id: { $in: albums } })
          .toArray()
          .then(as => as || [])
          .then((as) => {
            const back = { field: 'albums', results: [] };
            as.forEach((album) => {
              album.songs.forEach(song => back.results.push({ doc: song, key: album._id }));
            });
            return back;
          }),
      );
    }
    Promise.all(jobs)
      .then((responses) => {
        const back = {};
        responses.forEach((response) => {
          back[response.field] = response.results;
        });
        d10.realrest.success(back, request.ctx);
      })
      .catch(err => d10.realrest.err(427, err, request.ctx));
  });

  app.get('/api/artist/byName/:artist', (request) => {
    if (!request.params.artist || !request.params.artist.length) {
      return d10.realrest.err(400, 'Artist name cannot be empty', request.ctx);
    }

    d10.mcol(d10.COLLECTIONS.ARTISTS).findOne({ _id: request.params.artist })
      .then((artist) => {
        if (!artist) {
          return d10.realrest.err(404, 'Not Found', request.ctx);
        }
        return d10.realrest.success(artist, request.ctx);
      })
      .catch(err => d10.realrest.err(500, err, request.ctx));
  });

  app.get('/api/relatedArtists/:artist', (request) => {
    const artist = request.params.artist;
    relatedArtists(artist)
      .then(response => d10.realrest.success(response, request.ctx))
      .catch(err => d10.realrest.err(500, err, request.ctx));
  });

  function relatedArtists(artist) {
    let level1;
    const level2 = [];

    return d10.mcol(d10.COLLECTIONS.SONGS).aggregate([
      { $match: { tokenartists: artist } },
      { $unwind: { path: '$tokenartists' } },
      { $match: { tokenartists: { $ne: artist } } },
      { $group: { _id: '$tokenartists', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray()
      .then((related) => {
        level1 = related || [];
        if (!related) {
          return;
        }
        const level1artists = level1.map(rArtist => rArtist._id);
        const level1artistsAndSource = [...level1artists, artist];

        // eslint-disable-next-line arrow-body-style
        return level1artists.reduce((previous, artistName) => previous.then(() => {
          return d10.mcol(d10.COLLECTIONS.SONGS).aggregate([
            { $match: { tokenartists: artistName } },
            { $unwind: { path: '$tokenartists' } },
            { $match: { tokenartists: { $nin: level1artistsAndSource } } },
            { $group: { _id: '$tokenartists', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]).toArray();
        })
          .then((results) => {
            level2.push({ artist: artistName, results: results || [] });
          }), Promise.resolve());
      })
      .then(() => {
        const response = { artists: {}, artistsRelated: {} };
        if (!level1.length) {
          return response;
        }
        level1.forEach((art) => { response.artists[art._id] = art.count * 1000; });
        if (!level2.length) {
          return response;
        }
        level2.forEach((art) => {
          const name = art.artist;
          art.results.forEach((result) => {
            response.artistsRelated[result._id] = response.artists[name] + result.count;
          });
        });
        return response;
      })
      .catch((err) => {
        debug('error ', err);
        throw err;
      });
  }

  /*
   track : _id: pt....  , song: aa....

  d10wi : _id: aa....
  _id: pr.... , listen: {aa.... : 2}
  _id: up.... , likes: {aa....: true}
  _id: up.... , dislikes: {aa....: true}
  _id: up.... , playlist: {list: [aa....]}

  d10:
  _id: aa....
  _id: pl.... , songs: [aa....]
  */
  app.delete('/api/song/aa:id', (request) => {
    const songId = `aa${request.params.id}`;

    d10.mcol(d10.COLLECTIONS.SONGS).findOne({ _id: songId })
      .then((song) => {
        if (!song) {
          throw new Error('Song not found');
        }
        if (song.user !== request.ctx.user._id && !request.ctx.user.superman) {
          throw new Error('You are not allowed to delete this song');
        }

        return song;
      })
      .then(song => updateSongReferencesOnDelete(song).then(() => song))
      .then(song => removeSongFromDb(song).then(() => song))
      .then((song) => {
        // do not return promise, this is background task
        Promise.all([
          removeSongFile(song._id),
          getUnusedImages(song).then(removeUnusedImages),
        ])
          .catch(err => debug('error garbaging deleted song files', err));

        return d10.realrest.success([], request.ctx);
      })
      .catch(err => d10.realrest.err(423, err, request.ctx));
  });

  function removeSongFromDb(song) {
    return d10.mcol(d10.COLLECTIONS.SONGS).deleteOne({ _id: song._id });
  }

  function updateSongReferencesOnDelete(song) {
    return Promise.all([
      removeSongFromUserHistory(song),
      removeSongFromRpl(song),
      updateSongInEvents(song),
    ]);
  }

  function removeSongFromUserHistory(song) {
    const filter = {};
    filter[`listen.${song._id}`] = { $gt: 0 };
    const update = { $unset: {} };
    update.$unset[`listen.${song._id}`] = true;
    return d10.mcol(d10.COLLECTIONS.USER_HISTORY).updateMany(filter, update);
  }

  function removeSongFromRpl(song) {
    const filter = { songs: song._id };
    const update = { $unset: { 'songs.$[element]': true } };
    const arrayFilters = [{ element: song._id }];
    return d10.mcol(d10.COLLECTIONS.USER_HISTORY).updateMany(filter, update, { arrayFilters });
  }

  function updateSongInEvents(song) {
    const filter = { song: song._id };
    const update = { $set: { orphan: true, document: song } };
    return d10.mcol(d10.COLLECTIONS.USER_HISTORY).updateMany(filter, update);
  }

  app.get('/api/album/byName/:album', request => albumGet(request));

  function albumGet(request) {
    if (!request.params.album || !request.params.album.length) {
      return d10.realrest.err(400, 'Album name cannot be empty', request.ctx);
    }

    d10.mcol(d10.COLLECTIONS.ALBUMS).findOne({ _id: request.params.album })
      .then((album) => {
        if (!album) {
          return d10.realrest.err(404, 'Not Found', request.ctx);
        }
        return d10.realrest.success(album, request.ctx);
      })
      .catch(err => d10.realrest.err(500, err, request.ctx));
  }

  app.get('/api/album/firstLetter', (request) => {
    d10.mcol(d10.COLLECTIONS.ALBUMS).aggregate([
      {
        $group: {
          _id: { $substrCP: ['$_id', 0, 1] },
          value: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]).toArray()
      .then(res => res.map(r => ({ key: r._id, value: r.value })))
      .then(response => d10.realrest.success(response, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  });

  app.get('/api/genres/available', request => d10.mcol(d10.COLLECTIONS.SONGS).aggregate([
    {
      $group: {
        _id: '$genre',
        count: { $sum: 1 },
      },
    },
  ]).toArray()
    .then((result) => {
      const response = result.map(res => ({ key: [res._id], value: res.count }));
      d10.realrest.success(response, request.ctx);
    })
    .catch(err => d10.realrest.err(423, err, request.ctx)));

  app.get('/api/genre/gotAlbums/:genre', (request) => {
    d10.realrest.err(400, new Error('REST API not supported'), request.ctx);
  });

  function isGenreValid(genre) {
    return d10.config.allowCustomGenres === true
      || (genre && d10.config.genres.indexOf(genre) >= 0);
  }

  app.get('/api/genre/resume/:genre', (request) => {
    if (!isGenreValid(request.params.genre)) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }

    function getAlbums(genre) {
      return d10.mcol(d10.COLLECTIONS.ALBUMS).countDocuments({ genres: genre })
        .catch((err) => {
          debug('getAlbum failed ', err);
          throw err;
        });
    }

    function getArtists(genre) {
      return d10.mcol(d10.COLLECTIONS.ARTISTS).countDocuments({ genres: genre })
        .catch((err) => {
          debug('getArtists failed ', err);
          throw err;
        });
    }

    function getSongInfos(genre) {
      return d10.mcol(d10.COLLECTIONS.SONGS).aggregate([
        { $match: { genre } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            duration: { $sum: '$duration' },
          },
        },
      ]).toArray()
        .then((result) => {
          if (!result || !result.length) {
            throw new Error('Unknown genre in database');
          }
          return result[0];
        })
        .catch((err) => {
          debug('getSongInfos failed ', err);
          throw err;
        });
    }

    const galp = getAlbums(request.params.genre);
    const garp = getArtists(request.params.genre);
    const gsip = getSongInfos(request.params.genre);
    galp.catch(e => debug('galp err', e));
    garp.catch(e => debug('garp err', e));
    gsip.catch(e => debug('gsip err', e));
    Promise.all([
      galp,
      garp,
      gsip,
    ]).then(responses => d10.realrest.success({
      albums: responses[0],
      artists: responses[1],
      songs: responses[2],
    }, request.ctx)).catch((err) => {
      d10.realrest.err(423, err, request.ctx);
    });
  });

  app.get('/api/genres/date/:genre', (request) => {
    if (!isGenreValid(request.params.genre)) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }

    const { genre } = request.params;

    d10.mcol(d10.COLLECTIONS.SONGS).aggregate([
      { $match: { genre } },
      {
        $group: {
          _id: '$date',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
      .then(cursor => cursor.toArray())
      .then(resp => d10.realrest.success(resp, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  });

  app.get('/api/genres/date-artist/:genre', (request) => {
    d10.realrest.err(400, new Error('REST API not supported'), request.ctx);
  });
}; // exports.api

function getUnusedImages(doc) {
  const keys = [];
  const usage = {};
  const filenames = {};
  if (doc.images) {
    doc.images.forEach((v) => {
      keys.push(v.sha1);
      filenames[v.sha1] = v.filename;
    });
  }
  if (!keys.length) {
    return Promise.resolve([]);
  }

  return d10.mcol(d10.COLLECTIONS.SONGS).find({ 'images.sha1': { $in: keys } })
    .then(response => response || [])
    .then((songs) => {
      songs.forEach(song => song.images.forEach((v) => {
        if (usage[v.sha1]) usage[v.sha1]++;
        else usage[v.sha1] = 1;
      }));
      const back = [];
      keys.forEach((v) => {
        if (!usage[v]) {
          back.push({ sha1: v, filename: filenames[v] });
        }
      });
      return back;
    });
}

function removeSongFile(id) {
  return new Promise((resolve, reject) => {
    const internId = id.substr(2);
    const file = `${d10.config.audio.dir}/${internId.substr(0, 1)}/aa${internId}.ogg`;
    fs.unlink(file, (err) => {
      if (err) {
        debug('Unable to unlink song file ', file);
        reject(err);
      } else resolve();
    });
  });
}

function removeUnusedImages(images) {
  const actions = [];
  images.forEach((i) => {
    if (i.filename && i.filename.length) {
      actions.push(new Promise((resolve, reject) => {
        const imgPath = `${d10.config.images.dir}/${i.filename}`;
        fs.unlink(imgPath, (err) => {
          if (err) {
            debug('Unable to unlink image ', imgPath);
            reject(err);
          } else resolve();
        });
      }));
    }
  });
  return Promise.all(actions);
}
