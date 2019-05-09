/* eslint-disable prefer-destructuring */
/* eslint-disable no-restricted-globals */
const d10 = require('./d10');

const debug = d10.debug('d10:d10.router.api.listing');
// const artists = require('./d10.artists');
const users = require('./d10.users');
// const { getAndParseByAlbum } = require('./rest-helpers');

function validGenre(genre) {
  return d10.config.allowCustomGenres === true || d10.config.genres.indexOf(genre) >= 0;
}

exports.api = function api(app) {
  const { d10View } = d10.dbp;

  app.get('/api/artist', request => artistSearch('artist/search', request));
  app.get('/api/album', request => albumSearch('album/search/search', request));
  app.get('/api/artistsListing', request => artistTokenized('artist/tokenized', request));
  app.get('/api/genresResume', request => genreArtist('genre/artist', request));
  app.get('/api/list/artists', 
  request => artistBaseName('artist/', request));
  app.get('/api/list/creations',
    gotd10QueryMiddleware,
    mayHaveStartKeyAndDocId,
    listByCreation);
  app.get('/api/list/hits',
    gotd10QueryMiddleware,
    mayHaveStartKeyAndDocId,
    listByHits);
  app.get('/api/list/creations/mergeAlbums', mixedAlbumsSongsHandler);
  app.get('/api/list/genres',
    gotd10QueryMiddleware,
    mayHaveStartKeyAndDocId,
    request => genreName('genre/name', request));
  app.get('/api/own/list/titles',
    gotd10QueryMiddleware,
    mayHaveStartKeyAndDocId,
    request => titleName(`${request.ctx.user._id}/title_name`, request));
  app.get('/api/list/titles',
    gotd10QueryMiddleware,
    mayHaveStartKeyAndDocId,
    request => titleName('title/name', request));
  app.get('/api/list/albumnames', request => albumName('album/name', request));
  app.get('/api/list/albums', request => albums(request));
  app.get('/api/list/genres/artists/:genre',
    gotd10QueryMiddleware,
    mayHaveStartKeyAndDocId,
    request => genreArtists('genre/artists', request));
  app.get('/api/list/genres/albums/:genre',
    gotd10QueryMiddleware,
    mayHaveStartKeyAndDocId,
    request => genreAlbums('genre/albums', request));
  app.get('/api/list/genres/dateArtist/:genre', genreDateArtist);
  app.get('/api/list/s_user',
    gotd10QueryMiddleware,
    mayHaveStartKeyAndDocId,
    userSongs);
  app.get('/api/list/likes',
    gotd10QueryMiddleware,
    mayHaveStartKeyAndDocId,
    getLikes);
  app.get('/api/list/genres/albumsSongs/:genre',
    gotd10QueryMiddleware,
    mayHaveStartKeyAndDocId,
    request => genreAlbumsSongs('genre/albums', request));
  app.get('/api/list/artists/albums/:artist', request => artistAlbums('artist/albums', request));
  app.get('/api/list/artists/songsByAlbum/:artist', request => artistSongsOrderedByAlbums('artist/songsOrderedByAlbums', request));
  app.get('/api/list/artists/genres/:artist', request => artistGenres('artist/genres', request));
  app.get('/api/list/artists/byGenreYear/:genre/:artist', request => artistGenreSongs(request));
  app.get('/api/list/albums/artists/:album', request => albumArtists('album/artists', request));
  app.get('/api/list/mixed/songs/creation', mixedAlbumsSongsHandler);

  function artistSearch(view, request) {
    const q = d10.ucwords(request.query.start);

    return d10.mcol(d10.COLLECTIONS.SONGS).aggregate([
      { $project: { tokenartists: true } },
      { $unwind: '$tokenartists' },
      { $match: { tokenartists: { $regex: `^${q}` } } },
      {
        $group: {
          _id: null,
          artists: { $addToSet: '$tokenartists' }
        },
      },
    ])
      .then((doc) => {
        doc.artists.sort();
        return doc.artists;
      })
      .then(artists => d10.realrest.success(artists, request.ctx))
      .catch(() => d10.realrest.success([], request.ctx));
  }

  function albumSearch(view, request) {
    const q = d10.ucwords(request.query.start);

    return d10.mcol(d10.COLLECTIONS.SONGS).find({ album: { $regex: `^${q}` } }, { album: 1, _id: 0 })
      .then(resp => resp.map(doc => doc.album))
      .then(albums => d10.realrest.success(albums, request.ctx))
      .catch(() => d10.realrest.success([], request.ctx));
  }

  function gotd10QueryMiddleware(request, response, next) {
    // eslint-disable-next-line no-param-reassign
    request.d10query = {};
    next();
  }

  function mayHaveStartStringMiddleware(request, response, next) {
    if (!request.d10query) {
      // eslint-disable-next-line no-param-reassign
      request.d10query = {};
    }

    const query = {};

    if (request.query.start && request.query.start.length) {
      const q = d10.ucwords(request.query.start);
      query.startkey = [q];
      query.endkey = [d10.nextWord(q)];
    }
    // eslint-disable-next-line no-param-reassign
    request.d10query = { ...request.d10query, ...query };

    next();
  }

  function mayHaveStartKeyAndDocId(request, response, next) {
    if (!request.d10query) {
      // eslint-disable-next-line no-param-reassign
      request.d10query = {};
    }

    const query = {};

    if (request.query.startkey) {
      query.startkey = JSON.parse(request.query.startkey);
      if (request.query.startkey_docid) {
        query.startkey_docid = request.query.startkey_docid;
      }
    }
    // eslint-disable-next-line no-param-reassign
    request.d10query = { ...request.d10query, ...query };

    next();
  }

  app.get('/api/genre', (request) => {
    if (request.query.start && request.query.start.length) {
      const reg = new RegExp(request.query.start, 'i');
      const resp = d10.config.genres.filter(genre => genre.search(reg) === 0);
      d10.realrest.success(resp, request.ctx);
    } else {
      d10.realrest.success(d10.config.genres, request.ctx);
    }
  });

  function artistTokenized(view, request) {
    const query = { ...request.d10query, group: true, group_level: 1 };

    if (request.query.limit) {
      const limit = parseInt(request.query.limit, 10);
      if (!isNaN(limit)) {
        query.limit = limit;
      }
    }
    listPromiseRespond(d10View(view, query), request.ctx);
  }

  function genreArtist(view, request) {
    return d10.mcol(d10.COLLECTIONS.SONGS).aggregate([
      {
        $group: {
          _id: '$genre',
          arts: { $addToSet: { $arrayElemAt: ['$tokenartists', 0] } },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          count: 1,
          artistCount: { $size: '$arts' },
          artists: { $slice: ['$arts', 3] },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray()
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  function artistBaseName(view, request) {
    const query = {};
    if (request.query.artist && request.query.artist.length) {
      query.tokenartists = request.query.artist;
    }
    const offset = request.query.offset ||  0;
    return d10.mcol(d10.COLLECTIONS.SONGS).find(query)
      .sort({ artist: -1, title: -1 })
      .skip(offset)
      .limit(d10.config.rpp)
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  function listByCreation(request, response) {
    if (request.query.genre) {
      if (!validGenre(request.query.genre)) {
        return d10.realrest.err(428, request.query.genre, request.ctx);
      }
      return tsCreationGenre(request, response);
    }

    return tsCreationName(request, response);
  }

  function tsCreationGenre(request) {
    if (!request.query.genre || !validGenre(request.query.genre)) {
      return d10.realrest.err(428, request.query.genre, request.ctx);
    }

    const offset = request.query.offset || 0;
    return d10.mcol(d10.COLLECTIONS.SONGS).find({ genre: request.query.genre })
      .sort({ ts_creation: -1, tokentitle: -1 })
      .skip(offset)
      .limit(d10.config.rpp)
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  function tsCreationName(request) {
    const offset = request.query.offset ? Number(request.query.offset) : 0;

    return d10.mcol(d10.COLLECTIONS.SONGS).find({})
      .sort({ ts_creation: -1, tokentitle: -1 })
      .skip(offset)
      .limit(d10.config.rpp)
      .toArray()
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  function mixedAlbumsSongsHandler(request) {
    d10.realrest.err(400, 'not implemented', request.ctx)
    /*
    const couchQuery = getCouchQuery(request.query);
    if (!couchQuery) {
      return d10.realrest.err(428, request.query.genre, request.ctx);
    }

    const ignoredAlbums = request.query.ignoredAlbums
      ? JSON.parse(request.query.ignoredAlbums)
      : [];

    return getAndParseByAlbum(couchQuery, ignoredAlbums)
      .then(response => d10.realrest.success(response, request.ctx))
      .catch(e => d10.realrest.err(500, e, request.ctx));
    */
  }

  function listByHits(request) {
    const offset = request.query.offset ? Number(request.query.offset) : 0;
    return d10.mcol(d10.COLLECTIONS.SONGS).find({})
      .sort({ hits: -1, tokentitle: -1 })
      .skip(offset)
      .limit(d10.config.rpp)
      .toArray()
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  function genreName(view, request) {
    if (!request.query.genre || !validGenre(request.query.genre)) {
      return d10.realrest.err(428, request.query.genre, request.ctx);
    }
    const offset = request.query.offset ? Number(request.query.offset) : 0;
    return d10.mcol(d10.COLLECTIONS.SONGS).find({})
      .sort({ genre: -1, tokentitle: -1 })
      .skip(offset)
      .limit(d10.config.rpp)
      .toArray()
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  function titleName(view, request) {
    const query = {};
    const offset = request.query.offset ? Number(request.query.offset) : 0;
    if (request.query.title && request.query.title.length) {
      query.title = request.query.title;
    }
    const cursor = d10.mcol(d10.COLLECTIONS.SONGS).find(query)
      .sort({ title: -1, artist: -1 })
      .skip(offset);
    if (!request.query.full) {
      cursor.limit(d10.config.rpp);
    }
    return cursor.toArray()
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  function albums(request) {
    const offset = request.query.offset ? Number(request.query.offset) : 0;
    const limit = d10.config.rpp;
    const query = {};
    const idQueries = [];
    if (request.query.genre && validGenre(request.query.genre)) {
      query.genres = request.query.genre;
    }
    if (request.query.start) {
      idQueries.push({ $gte: request.query.start });
    }
    if (request.query.stop) {
      idQueries.push({ $lt: request.query.stop });
    }
    if (idQueries.length > 1) {
      query.$and = idQueries.map(q => ({ _id: q }));
    } else if (idQueries.length === 1) {
      query._id = idQueries[0];
    }
    d10.mcol(d10.COLLECTIONS.ALBUMS).find(query)
      .sort({ _id: 1 }).skip(offset)
      .limit(limit)
      .toArray()
      .then(response => response || [])
      .then(response => d10.realrest.success(response, request.ctx))
      .catch(e => d10.realrest.err(500, e, request.ctx));
  }

  function albumName(view, request) {
    const query = {};
    const offset = request.query.offset || 0;
    if (request.query.album) {
      query.album = request.query.album;
    }
    const cursor = d10.mcol(d10.COLLECTIONS.SONGS).find(query)
      .sort({ album: -1, tracknumber: 1 })
      .skip(offset);
    if (!request.query.full) {
      cursor.limit(d10.config.rpp);
    }
    cursor.toArray()
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  function userSongs(request) {
    const offset = Number(request.query.offset) || 0;
    d10.mcol(d10.COLLECTIONS.SONGS).find({ user: request.ctx.user._id })
      .sort({ name: -1 })
      .skip(offset)
      .limit(d10.config.rpp)
      .toArray()
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  function getLikes(request) {
    const keys = request.ctx.user.preferences.likes ? Object.keys(request.ctx.user.preferences.likes) : [];
    d10.mcol(d10.COLLECTIONS.SONGS).find({ _id: { $in: keys } })
      .toArray()
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  function genreArtists(view, request) {
    if (!request.params.genre || !validGenre(request.params.genre)) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }
    return d10.mcol(d10.COLLECTIONS.SONGS).distinct('tokenartists', { genre: request.params.genre })
      .then((docs) => {
        docs.sort();
        if (request.query.offset) {
          docs.splice(0, request.query.offset);
        }
        const response = docs.slice(0, d10.config.rpp);
        return d10.realrest.success(response, request.ctx);
      })
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  function genreAlbums(view, request) {
    if (!request.params.genre || !validGenre(request.params.genre)) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }
    const offset = request.query.offset ? Number(request.query.offset) : 0;
    const aggregationQuery = [
      { $match: { genre: request.params.genre } },
      { $group: { _id: '$album', count: { $sum: 1 } } },
    ];
    if (offset) {
      aggregationQuery.push({ $skip: offset });
    }
    aggregationQuery.push({ $limit: d10.config.rpp });

    return d10.mcol(d10.COLLECTIONS.SONGS)
      .aggregate(aggregationQuery)
      .toArray()
      .then((docs) => {
        const output = docs.map(doc => ({ album: doc._id, count: doc.count }));
        d10.realrest.success(output, request.ctx);
      })
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  function genreAlbumsSongs(view, request) {
    if (!request.params.genre
      || !validGenre(request.params.genre)) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }
    return d10.mcol(d10.COLLECTIONS.SONGS).find({ genre: request.params.genre })
      .sort({ album: -1, tracknumber: 1 })
      .toArray()
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  function genreDateArtist(request) {
    if (!request.params.genre) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }
    return d10.realrest.err(400, 'Not implemented', request.ctx);
  }

  function artistAlbums(view, request) {
    if (!request.params.artist) {
      return d10.realrest.err(428, request.params.artist, request.ctx);
    }
    return d10.mcol(d10.COLLECTIONS.SONGS).distinct('album', { tokenartists: request.params.artist })
      .sort()
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  function artistSongsOrderedByAlbums(view, request) {
    if (!request.params.artist) {
      return d10.realrest.err(428, request.params.artist, request.ctx);
    }

    return d10.mcol(d10.COLLECTIONS.SONGS).find({ tokenartists: request.params.artist })
      .sort({ album: -1, tracknumber: 1 })
      .toArray()
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));      
  }

  function artistGenres(view, request) {
    if (!request.params.artist) {
      return d10.realrest.err(428, request.params.artist, request.ctx);
    }

    return d10.mcol(d10.COLLECTIONS.SONGS).distinct('genre', { tokenartists: request.params.artist })
      .sort()
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  function artistGenreSongs(request) {
    if (!request.params.genre) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }
    if (!request.params.artist) {
      return d10.realrest.err(428, request.params.artist, request.ctx);
    }

    const genre = request.params.genre;
    const artist = request.params.artist;
    const limit = d10.config.rpp;
    const offset = request.query.offset || 0;

    return d10.mcol(d10.COLLECTIONS.SONGS).find({ genre, tokenartists: artist })
      .sort({ tokentitle: -1 })
      .skip(offset)
      .limit(limit)
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  function albumArtists(view, request) {
    if (!request.params.album) {
      debug('no album');
      return d10.realrest.err(428, request.params.album, request.ctx);
    }
    const album = request.params.album;
    const offset = request.query.offset ? Number(request.query.offset) : 0;

    return d10.mcol(d10.COLLECTIONS.ARTISTS).find({ album })
      .sort({ _id: 1 })
      .offset(offset)
      .limit(d10.config.rpp)
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  }

  function listPromiseRespond(promise, context) {
    return promise
      .then(resp => d10.realrest.success(resp.rows, context))
      .catch((err) => {
        debug('error: ', err);
        return d10.realrest.err(423, err, context);
      });
  }

  app.get('/api/list/artist/hits', (request) => {
    const query = {};
    if (request.query.genre) {
      if (!validGenre(request.query.genre)) {
        return d10.realrest.err(428, request.query.genre, request.ctx);
      }
      query.genre = request.query.genre;
    }
    if (!request.query.artist) {
      debug('no artist');
      return d10.realrest.err(428, request.query.artist, request.ctx);
    }
    query.tokenartists = request.query.artist;
    const offset = request.query.offset || 0;
    const limit = d10.config.rpp;
    return d10.mcol(d10.COLLECTIONS.SONGS).find(query).sort({ hits: -1 })
      .skip(offset)
      .limit(limit)
      .toArray()
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  });

  app.get('/api/genre/artistsByHits/:genre', (request) => {
    if (!validGenre(request.params.genre)) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }
    return d10.realrest.err(400, 'REST endpoint not supported', request.ctx);
  });

  app.get('/api/genre/albumsByHits/:genre', (request) => {
    if (!validGenre(request.params.genre)) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }
    return d10.realrest.err(400, 'REST endpoint not supported', request.ctx);
  });

  app.get('/api/genre/songsByHits/:genre', (request) => {
    if (!validGenre(request.params.genre)) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }
    const genre = request.params.genre;
    const offset = request.query.offset || 0;
    return d10.mcol(d10.COLLECTIONS.SONGS).find({ genre }).sort({ hits: -1 }).skip(offset)
      .limit(d10.config.rpp)
      .then(docs => d10.realrest.success(docs, request.ctx))
      .catch(err => d10.realrest.err(423, err, request.ctx));
  });

  app.get('/api/own/list/mixed/lastPlayed', (request) => {
    const requestLength = d10.config.rpp;
    const opts = {
      offset: request.query.offset || 0,
      limit: requestLength,
    };

    users.getListenedSongsByDate(request.ctx.user._id, opts, (err, hits) => {
      if (err) {
        return d10.realrest.err(423, err, request.ctx);
      }
      if (!hits.length) {
        return d10.realrest.success([], request.ctx);
      }

      return d10.mcol(d10.COLLECTIONS.SONGS).find({ _id: { $in: hits } })
        .then(docs => d10.realrest.success(docs, request.ctx))
        .catch(err2 => d10.realrest.err(423, err2, request.ctx));
    });
  });

  // eslint-disable-next-line consistent-return
  app.get('/api/own/list/genre/lastPlayed/:genre', (request) => {
    if (!validGenre(request.params.genre)) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }
    const genre = request.params.genre;
    const responseLength = d10.config.rpp + 1;
    const requestLength = d10.config.rpp * 3;
    const responses = [];
    const opts = {
      offset: request.query.offset || 0,
      limit: requestLength,
    };
    let realOffset = opts.offset;

    function fetchLastPlayed() {
      // eslint-disable-next-line consistent-return
      users.getListenedSongsByDate(request.ctx.user._id, opts, (err, hits) => {
        if (err) {
          return d10.realrest.err(423, err, request.ctx);
        }
        if (!hits.length) {
          return d10.realrest.success(responses, request.ctx);
        }
        // eslint-disable-next-line consistent-return
        d10.mcol(d10.COLLECTIONS.SONGS).find({ _id: { $in: hits }, genre })
          .then((songs) => {
            songs.forEach((song) => {
              if (responses.length < responseLength) {
                responses.push(song);
                realOffset += 1;
              }
            });

            if (responses.length === responseLength) {
              return d10.realrest.success({ songs: responses, nextOffset: realOffset }, request.ctx);
            }

            if (hits.rows.length < requestLength) {
              return d10.realrest.success({ songs: responses, nextOffset: null }, request.ctx);
            }

            return fetchLastPlayed();
          })
          .catch(err2 => d10.realrest.err(423, err2, request.ctx));
      });
    }

    fetchLastPlayed();
  });
}; // exports.api
