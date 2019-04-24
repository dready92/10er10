/* eslint-disable no-restricted-globals */
/* eslint-disable no-plusplus */
/* eslint-disable consistent-return */
const bodyParser = require('body-parser');
const fs = require('fs');
const os = require('os');
const d10 = require('./d10');
const dumbRadio = require('./lib/radio/dumb');
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
      .then(resp => d10.realrest.success(resp, request.ctx))
      .catch(err => d10.realrest.err(500, err, request.ctx));
  });

  app.get('/api/song/aa:id', (request) => {
    d10.dbp.d10GetDoc(`aa${request.params.id}`)
      .then(doc => d10.realrest.success(doc, request.ctx))
      .catch(() => d10.realrest.err(404, {
        error: 'Document not found',
        reason: `id aa${request.params.id} not found`,
      }, request.ctx));
  });

  app.get('/api/userinfos', (request) => {
    const p1 = d10.dbp.d10wiGetDoc(request.ctx.user._id.replace(/^us/, 'up'));
    const p2 = d10.dbp.d10View('user/all_infos', {
      key: [request.ctx.user._id.replace(/^us/, ''), 'pl'],
      include_docs: true,
    }).then(data => data.rows.map(v => v.doc));
    Promise.all([p1, p2])
      .then(([preferences, playlists]) => {
        const response = {
          preferences,
          playlists,
          user: request.ctx.user,
        };

        d10.realrest.success(response, request.ctx);
      })
      .catch((err) => {
        d10.realrest.err(423, err, request.ctx);
      });
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

  app.get('/api/length', request => new Promise((resolve, reject) => {
    d10.mcol(d10.COLLECTIONS.SONGS)
      .aggregate([
        {
          $match: {
            reviewed: true,
            valid: true,
          },
        },
        {
          $group: {
            _id: null,
            totalDuration: { $sum: '$duration' },
          },
        },
      ], (err, cursor) => {
        if (err) {
          return reject(err);
        }
        cursor.toArray((err2, documents) => {
          if (err2) {
            return reject(err2);
          }
          if (!documents.length) {
            return resolve(0);
          }
          return resolve(documents[0].totalDuration);
        });
      });
  })
    .then((duration) => {
      d10.realrest.success({ length: duration }, request.ctx);
    })
    .catch((err) => {
      d10.realrest.err(423, err, request.ctx);
    }));

  app.get('/api/serverLoad', (request) => {
    d10.realrest.success({ load: os.loadavg() }, request.ctx);
  });

  app.get('/api/toReview', (request) => {
    d10.dbp.d10View('user/song', { key: [request.ctx.user._id, false] })
      .then(resp => d10.realrest.success({ count: resp.rows.length }, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  });


  app.put('/api/current_playlist', urlencodedParserMiddleware, jsonParserMiddleware, (request) => {
    const data = { ...request.body };

    d10.dbp.d10wiGetDoc(request.ctx.user._id.replace(/^us/, 'up'))
      .then((userPreferences) => {
        if (!data.type) {
          data.type = 'default';
        }
        const actions = [];
        if (data.id) {
          actions.push(d10.dbp.d10GetDoc(data.id)
            .then(() => null)
            .catch(() => {
              throw new Error('doc id is unknown');
            }));
        }
        if (data.list) {
          actions.push(d10.dbp.d10GetAllDocs({ keys: data.list })
            .then((resp) => {
              if (resp.rows.length !== data.list.length) {
                throw new Error('length differs between  user preferences and PUT data');
              }
            }));
        }

        Promise.all(actions)
          .then(() => recordDoc(userPreferences))
          .catch(err => d10.realrest.err(413, err, request.ctx));
      })
      .catch(err => d10.realrest.err(413, err, request.ctx));

    function recordDoc(userPreferences) {
      const preferences = { ...userPreferences };
      preferences.playlist = { ...data };

      return d10.dbp.d10wiStoreDoc(preferences)
        .then(() => d10.realrest.success([], request.ctx));
    }
  });

  app.post('/api/ping', jsonParserMiddleware, (request) => {
    function updateAliveDoc() {
      d10.dbp.trackUpdateDoc(`tracking/ping/${request.ctx.user._id.replace(/^us/, 'pi')}`)
        .catch(err => debug('/api/ping error on db request:', err));
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
        d10.dbp.d10wiGetDoc(id)
          .catch((err) => {
            if (err && err.statusCode && err.statusCode === 404) {
              return null;
            }
            throw err;
          })
          .then((doc) => {
            let updatedDoc;
            if (!doc) {
              updatedDoc = { _id: id, hits: 0 };
            } else {
              updatedDoc = { ...doc };
            }

            if (updatedDoc.hits) {
              updatedDoc.hits++;
            } else {
              updatedDoc.hits = 1;
            }
            return d10.dbp.d10wiStoreDoc(updatedDoc);
          })
          .catch(storeerr => debug('/api/ping error on updateHits db request:', storeerr));
      }

      function updateUserData(id) {
        d10.dbp.d10wiGetDoc(request.ctx.user._id.replace(/^us/, 'pr'))
          .then((doc) => {
            const updatedDoc = { ...doc };
            if (!updatedDoc.listen) updatedDoc.listen = {};
            if (updatedDoc.listen[id]) updatedDoc.listen[id]++;
            else updatedDoc.listen[id] = 1;
            return d10.dbp.d10wiStoreDoc(updatedDoc);
          })
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
        d10.dbp.trackStoreDoc(updatedDoc)
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
    dumbRadio('genre/unsorted', request, response);
  });


  app.post('/api/volume', jsonParserMiddleware, (request) => {
    let volume = (request.body && 'volume' in request.body) ? parseFloat(request.body.volume) : 0;
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(volume)) volume = 0;

    d10.dbp.d10wiGetDoc(`up${request.ctx.user._id.substr(2)}`)
      .then((doc) => {
        const updatedDoc = { ...doc };
        updatedDoc.volume = volume;
        return d10.dbp.d10wiStoreDoc(updatedDoc);
      })
      .then(() => d10.realrest.success({ volume }, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  });


  function updateUserPreferences(userId, onDoc) {
    return d10.dbp.d10wiGetDoc(`up${userId.substr(2)}`)
      .then(onDoc)
      .then(d10.dbp.d10wiStoreDoc);
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

    updateUserPreferences(request.ctx.user._id, docUpdateFn)
      .then(() => d10.realrest.success([], request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  });

  app.put('/api/starring/likes/aa:id', (request) => {
    let star = null;
    d10.dbp.d10GetDoc(`aa${request.params.id}`)
      .then(() => d10.dbp.d10wiGetDoc(`up${request.ctx.user._id.substr(2)}`))
      .then((d) => {
        const doc = { ...d };
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
        return d10.dbp.d10wiStoreDoc(doc);
      })
      .then(() => d10.realrest.success({ id: `aa${request.params.id}`, star }, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  });

  app.put('/api/starring/dislikes/aa:id', (request) => {
    let star = null;
    d10.dbp.d10GetDoc(`aa${request.params.id}`)
      .then(() => d10.dbp.d10wiGetDoc(`up${request.ctx.user._id.substr(2)}`))
      .then((d) => {
        const doc = { ...d };
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
        return d10.dbp.d10wiStoreDoc(doc);
      })
      .then(() => d10.realrest.success({ id: `aa${request.params.id}`, star }, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  });

  app.get('/api/search', (request, response) => {
    songSearch('song/search', request, response);
  });
  function songSearch(view, request) {
    const options = { include_docs: true };
    if (request.query.start) {
      const start = d10.ucwords(request.query.start.replace(/^\s+/, '').replace(/\s+$/, ''));
      const end = d10.nextWord(start);
      options.startkey = start;
      options.endkey = end;
      options.inclusive_end = false;
    }

    d10.dbp.d10View(view, options)
      .then((resp) => {
        const results = { title: [], artist: [], album: [] };
        resp.rows.forEach((v) => {
          const doc = { ...v.doc };
          const { field } = v.value.json;
          if (field === 'album') {
            let put = false;
            for (let i = 0, len = results[field].length; i < len; i++) {
              if (results[field][i].doc[field] === doc[field]) {
                put = true;
                break;
              } else if (results[field][i].doc[field] > doc[field]) {
                put = true;
                results[field].splice(i, 0, { doc, value: v.value });
                break;
              }
            }
            if (!put) {
              results[field].push({ doc, value: v.value });
            }
          } else if (field === 'artist') {
            let put = false;
            for (let i = 0, len = results[field].length; i < len; i++) {
              if (results[field][i].value.json.value === v.value.json.value) {
                put = true;
                break;
              } else if (results[field][i].value.json.value > v.value.json.value) {
                put = true;
                results[field].splice(i, 0, { doc, value: v.value });
                break;
              }
            }
            if (!put) {
              results[field].push({ doc, value: v.value });
            }
          } else {
            let put = false;
            for (let i = 0, len = results[field].length; i < len; i++) {
              if (`${results[field][i].doc[field]} ${results[field][i].doc._id}` === `${doc[field]} ${doc._id}`) {
                put = true;
                break;
              } else if (`${results[field][i].doc[field]} ${results[field][i].doc._id}` > `${doc[field]} ${doc._id}`) {
                put = true;
                results[field].splice(i, 0, { doc, value: v.value });
                break;
              }
            }
            if (!put) {
              results[field].push({ doc, value: v.value });
            }
          }
        });
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
      jobs.push(d10.dbp.d10View('artist/artist', { reduce: false, include_docs: true, keys: artists })
        .then(resp => ({ field: 'artists', results: resp.rows })));
    }
    if (albums.length) {
      jobs.push(d10.dbp.d10View('album/album', { reduce: false, include_docs: true, keys: albums })
        .then(resp => ({ field: 'albums', results: resp.rows })));
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

  app.get('/api/relatedArtists/:artist', (request) => {
    const related = [];
    const relatedHash = {};
    d10.dbp.d10View('artist/related', { key: request.params.artist })
      .then((body) => {
        if (!body.rows.length) {
          return d10.realrest.success({ artists: [], artistsRelated: [] }, request.ctx);
        }
        const relatedKeys = [];
        body.rows.forEach((v) => {
          if (v.value in relatedHash) {
            relatedHash[v.value]++;
          } else {
            relatedHash[v.value] = 1;
          }
          if (related.indexOf(v.value) < 0) {
            related.push(v.value);
          }
          relatedKeys.push(v.value);
        });

        const opts = { keys: relatedKeys };

        return d10.dbp.d10View('artist/related', opts);
      })
      .then((degree2) => {
        const relatedArtists = [];
        const relatedArtistsHash = {};
        degree2.rows.forEach((v) => {
          if (v.value !== request.params.artist && !relatedHash[v.value]) {
            if (v.value in relatedArtistsHash) {
              relatedArtistsHash[v.value]++;
            } else {
              relatedArtistsHash[v.value] = 1;
            }
          }
          if (v.value !== request.params.artist
            && related.indexOf(v.value) < 0
            && relatedArtists.indexOf(v.value) < 0) { relatedArtists.push(v.value); }
        });

        return d10.realrest.success(
          {
            artists: relatedHash,
            artistsRelated: relatedArtistsHash,
          },
          request.ctx,
        );
      })
      .catch(err => d10.realrest.err(427, err, request.ctx));
  });

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
    let references;
    let images;

    d10.dbp.d10GetDoc(`aa${request.params.id}`)
      .catch((err) => {
        d10.realrest.err(423, err, request.ctx);
        return null;
      })
      .then((doc) => {
        if (doc.user !== request.ctx.user._id && !request.ctx.user.superman) {
          return d10.realrest.err(403, 'You are not allowed to delete this song', request.ctx);
        }
        Promise.all([findAllSongReferences(doc._id), getUnusedImages(doc)])
          .then((responses) => {
            // eslint-disable-next-line prefer-destructuring
            references = responses[0];
            // eslint-disable-next-line prefer-destructuring
            images = responses[1];
            const modifiedDocs = removeSongReferences(references);
            return recordModifiedDocs(modifiedDocs);
          })
          .then(() => {
            // do not return promise, this is background task
            Promise.all([
              removeSongFile(doc._id),
              removeUnusedImages(images),
            ])
              .then(err => debug('error garbaging deleted song files', err));

            return d10.realrest.success([], request.ctx);
          })
          .catch(err => d10.realrest.err(423, err, request.ctx));
      });
  });

  app.get('/api/album/firstLetter', (request) => {
    const query = { group: true, group_level: 1 };
    d10.couch.d10.view('album/firstLetter', query, (err, resp) => {
      if (err) {
        debug(err);
        return d10.realrest.err(423, request.params.sort, request.ctx);
      }
      d10.realrest.success(resp.rows, request.ctx);
    });
  });

  app.get('/api/genres/available', (request) => {
    d10.couch.d10.view('genre/name', {
      group: true,
      group_level: 1,
    }, (err, resp) => {
      if (err) {
        debug(err);
        return d10.realrest.err(423, null, request.ctx);
      }
      d10.realrest.success(resp.rows, request.ctx);
    });
  });

  app.get('/api/genre/gotAlbums/:genre', (request) => {
    if (!request.params.genre
      // eslint-disable-next-line no-mixed-operators
      || d10.config.allowCustomGenres === false
       // eslint-disable-next-line no-mixed-operators
       && d10.config.genres.indexOf(request.params.genre) < 0) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }
    d10.couch.d10.view('genre/albums', {
      group: true,
      group_level: 1,
      startkey: [request.params.genre],
      endkey: [request.params.genre, []],
    }, (err, resp) => {
      debug(err, resp);
      if (err) {
        debug(err);
        return d10.realrest.err(423, request.params.genre, request.ctx);
      }
      d10.realrest.success({ albums: !!resp.rows.length }, request.ctx);
    });
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
      const startkey = [genre];
      const endkey = [genre, {}];
      return d10.dbp.d10View('genre/albums', {
        reduce: true, group: true, group_level: 2, startkey, endkey,
      })
        .then((resp) => {
          const albums = new Set();
          resp.rows.forEach(row => albums.add(row.key[1]));
          return albums.size;
        })
        .catch((err) => {
          debug('getAlbum failed ', err);
          throw err;
        });
    }

    function getArtists(genre) {
      const startkey = [genre];
      const endkey = [genre, {}];
      return d10.dbp.d10View('genre/artists', {
        reduce: true, group: true, group_level: 2, startkey, endkey,
      })
        .then((resp) => {
          const artists = new Set();
          resp.rows.forEach(row => artists.add(row.key[1]));
          return artists.size;
        })
        .catch((err) => {
          debug('getArtists failed ', err);
          throw err;
        });
    }

    function getSongInfos(genre) {
      return d10.dbp.d10View('genre/songInfos', {
        reduce: true, group: true, group_level: 1, key: genre,
      })
        .then((resp) => {
          if (!resp.rows.length) {
            throw new Error('Unknown genre in database');
          }
          return resp.rows[0].value;
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
    const query = {
      startkey: [genre],
      endkey: [genre, []],
      group: true,
      group_level: 2,
    };

    /*
      {"rows":[
        {"key":["Pop",2016],"value":1},
        {"key":["Pop",2017],"value":20}
      ]}
    */
    d10.dbp.d10View('genre/date', query)
      .then(resp => resp.rows.map(row => ({ date: row.key[1], count: row.value })))
      .then(resp => d10.realrest.success(resp, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  });

  app.get('/api/genres/date-artist/:genre', (request) => {
    if (!isGenreValid(request.params.genre)) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }

    const { genre } = request.params;
    const query = {
      startkey: [genre],
      endkey: [genre, []],
      group: true,
      group_level: 3,
    };
    if (request.query && request.query.limit) {
      query.limit = request.query.limit;
    }
    if (request.query && request.query.startkey) {
      query.startkey = request.query.startkey;
    } else if (request.query && request.query.startdate) {
      query.startkey.push(request.query.startdate);
    }

    /*
      {"rows":[
        {"key":["Pop",2016,"artist"],"value":1},
        {"key":["Pop",2017,"artist1"],"value":18},
        {"key":["Pop",2017,"artist2"],"value":2}
      ]}
    */
    d10.dbp.d10View('genre/date-artist', query)
      .then(resp => resp.rows.map(row => ({
        date: row.key[1],
        artist: row.key[2],
        count: row.value,
      })))
      .then(resp => d10.realrest.success(resp, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  });
}; // exports.api

function findAllSongReferences(id) {
  const responses = { d10: [], d10wi: [], track: [] };
  const jobs = [
    d10.dbp.d10View('references/songs', { key: id, include_docs: true })
      .then((resp) => { responses.d10 = resp.rows; }),
    d10.dbp.d10wiView('references/songs', { key: id, include_docs: true })
      .then((resp) => { responses.d10wi = resp.rows; }),
    d10.dbp.trackView('references/songs', { key: id, include_docs: true })
      .then((resp) => { responses.track = resp.rows; }),
  ];

  return Promise.all(jobs).then(() => responses);
}

function removeSongReferences(id, responses) {
  const modifiedDocs = { d10: [], d10wi: [], track: [] };
  responses.d10.forEach((v) => {
    if (v.doc._id === id) {
      const modifiedDoc = { ...v.doc, _deleted: true };
      modifiedDocs.d10.push(modifiedDoc);
    } else if (v.doc._id.substr(0, 2) === 'pl' && v.doc.songs) {
      const modifiedDoc = { ...v.doc, songs: [] };
      v.doc.songs.forEach((val) => { if (val !== id) modifiedDoc.songs.push(val); });
      modifiedDocs.d10.push(modifiedDoc);
    }
  });
  responses.d10wi.forEach((v) => {
    if (v.doc._id === id) {
      const modifiedDoc = { ...v.doc, _deleted: true };
      modifiedDocs.d10wi.push(modifiedDoc);
    } else if (v.doc._id.substr(0, 2) === 'pr') {
      const modifiedDoc = { ...v.doc, listen: {} };
      Object.keys(v.doc.listen).filter(key => key !== id)
        .forEach((key) => { modifiedDoc.listen[key] = v.doc.listen[key]; });
      modifiedDocs.d10wi.push(modifiedDoc);
    } else if (v.doc._id.substr(0, 2) === 'up') {
      const modifiedDoc = { ...v.doc, likes: {}, dislikes: {} };
      if (v.doc.likes) {
        Object.keys(v.doc.likes).filter(key => key !== id)
          .forEach((key) => { modifiedDoc.likes[key] = v.doc.dislikes[key]; });
      }
      if (v.doc.dislikes) {
        Object.keys(v.doc.dislikes).filter(key => key !== id)
          .forEach((key) => { modifiedDoc.dislikes[key] = v.doc.dislikes[key]; });
      }
      if (v.doc.playlist && v.doc.playlist.list) {
        const replacement = v.doc.playlist.list.filter(val => val !== id);
        modifiedDoc.playlist.list = replacement;
      }
      modifiedDocs.d10wi.push(v.doc);
    }
  });
  responses.track.forEach((v) => {
    if (v.doc._id.substr(0, 2) === 'pt' && v.doc.song === id) {
      const modifiedDoc = { ...v.doc, _deleted: true };
      modifiedDocs.track.push(modifiedDoc);
    }
  });
  return modifiedDocs;
}

function recordModifiedDocs(modifiedDocs) {
  debug('recordModifiedDocs recording: ', modifiedDocs);
  const jobs = [];
  if (modifiedDocs.d10.length) {
    jobs.push(d10.dbp.d10StoreDocs(modifiedDocs.d10)
      .then(resp => ({ db: 'd10', response: resp })));
  }
  if (modifiedDocs.d10wi.length) {
    jobs.push(d10.dbp.d10wiStoreDocs(modifiedDocs.d10wi)
      .then(resp => ({ db: 'd10wi', response: resp })));
  }
  if (modifiedDocs.track.length) {
    jobs.push(d10.dbp.trackStoreDocs(modifiedDocs.track)
      .then(resp => ({ db: 'track', response: resp })));
  }
  return Promise.all(jobs);
}

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

  return d10.dbp.d10View('images/sha1', { keys })
    .then((resp) => {
      resp.rows.forEach((v) => {
        if (usage[v.key]) usage[v.key]++;
        else usage[v.key] = 1;
      });
      const back = [];
      keys.forEach((v) => {
        if (!usage[v] || usage[v] < 2) {
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
