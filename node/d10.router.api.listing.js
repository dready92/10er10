const d10 = require('./d10');

const debug = d10.debug('d10:d10.router.api.listing');
const artists = require('./d10.artists');
const users = require('./d10.users');
const getAndParseByAlbum = require('./rest-helpers').getAndParseByAlbum;

function validGenre(genre) {
  return d10.config.allowCustomGenres === true || d10.config.genres.indexOf(genre) >= 0;
}

exports.api = function api(app) {
  app.get('/api/title',
    gotd10QueryMiddleware,
    mayHaveStartStringMiddleware,
    request => titleSearch('title/search/search', request));
  app.get('/api/artist',
    gotd10QueryMiddleware,
    mayHaveStartStringMiddleware,
    request => artistSearch('artist/search', request));
  app.get('/api/album', request => albumSearch('album/search/search', request));
  app.get('/api/artistsListing',
    gotd10QueryMiddleware,
    mayHaveStartKeyAndDocId,
    request => artistTokenized('artist/tokenized', request));
  app.get('/api/genresResume', request => genreArtist('genre/artist', request));
  app.get('/api/list/artists',
    gotd10QueryMiddleware,
    mayHaveStartKeyAndDocId,
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
  app.get('/api/list/albums', request => albumName('album/name', request));
  app.get('/api/list/genres/artists/:genre',
    gotd10QueryMiddleware,
    mayHaveStartKeyAndDocId,
    request => genreArtists('genre/artists', request));
  app.get('/api/list/genres/albums/:genre',
    gotd10QueryMiddleware,
    mayHaveStartKeyAndDocId,
    request => genreAlbums('genre/albums', request));
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
  app.get('/api/list/albums/artists/:album', request => albumArtists('album/artists', request));
  app.get('/api/list/mixed/songs/creation', mixedAlbumsSongsHandler);

  function titleSearch(view, request) {
    const query = { ...request.d10query, inclusive_end: false };
    d10.couch.d10.list(view, query, (err, resp) => {
      if (err) {
        d10.realrest.success([], request.ctx);
      } else {
        d10.realrest.success(resp.titles, request.ctx);
      }
    });
  }

  function artistSearch(view, request) {
    const query = { ...request.d10query, group: true };

    d10.couch.d10.view(view, query, (err, resp) => {
      if (err) {
        d10.realrest.success([], request.ctx);
      } else {
        const buffer = {};
        const back = [];

// remove doubles
        resp.rows.forEach((row) => {
          buffer[row.key[1]] = { text: row.key[1], json: row.key[1] };
        });
        Object.keys(buffer).forEach(key => back.push(buffer[key]));
        d10.realrest.success(back, request.ctx);
      }
    });
  }

  function albumSearch(view, request) {
    const query = { inclusive_end: false };
    if (request.query.start && request.query.start.length) {
      const q = d10.ucwords(request.query.start);
      query.startkey = [q];
      query.endkey = [d10.nextWord(q)];
    }
    d10.couch.d10.list(view, query, (err, resp) => {
      if (err) {
        d10.realrest.success([], request.ctx);
      } else {
        d10.realrest.success(resp.albums, request.ctx);
      }
    });
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
    d10.couch.d10.view(view, query, listDefaultCallback.bind(request.ctx));
  }

  function genreArtist(view, request) {
    const query = { group: true, group_level: 1 };
    d10.couch.d10.view(view, query, listDefaultCallback.bind(request.ctx));
  }

  function artistBaseName(view, request) {
    const query = { ...request.d10query, include_docs: true, limit: d10.config.rpp + 1 };
    let viewPart = 'basename';
    if (request.query.artist && request.query.artist.length) {
      viewPart = 'name';
      query.reduce = false;
      query.endkey = [request.query.artist, []];
      if (!query.startkey) {
        query.startkey = [request.query.artist];
      }
    }

    d10.couch.d10.view(view + viewPart, query, listDefaultCallback.bind(request.ctx));
  }

  function listByCreation(request, response) {
    if (request.query.genre) {
      if (!validGenre(request.query.genre)) {
        return d10.realrest.err(428, request.query.genre, request.ctx);
      }
      return tsCreationGenre('genre/creation', request, response);
    }

    return tsCreationName('ts_creation/name', request, response);
  }

  function tsCreationGenre(view, request) {
    const query = {
      ...request.d10query,
      include_docs: true,
      descending: true,
      limit: d10.config.rpp + 1,
      endkey: request.query.genre,
    };
    if (!query.startkey) {
      query.startkey = [request.query.genre, {}];
    }
    d10.couch.d10.view(view, query, listDefaultCallback.bind(request.ctx));
  }

  function tsCreationName(view, request) {
    const query = {
      ...request.d10query,
      include_docs: true,
      reduce: false,
      descending: true,
      limit: d10.config.rpp + 1,
    };
    d10.couch.d10.view(view, query, listDefaultCallback.bind(request.ctx));
  }

  function getCouchQuery(query) {
    const couchQuery = { include_docs: true, descending: true, limit: d10.config.rpp + 1 };
    if (query.genre) {
      if (!validGenre(query.genre)) {
        return false;
      }
      couchQuery.genre = query.genre;
      couchQuery.view = 'genre/creation';
      couchQuery.endkey = couchQuery.genre;
    } else {
      couchQuery.view = 'ts_creation/name';
      couchQuery.reduce = false;
    }
    if (query.startkey) {
      couchQuery.startkey = JSON.parse(query.startkey);
      if (query.startkey_docid) {
        couchQuery.startkey_docid = query.startkey_docid;
      }
    }

    if (couchQuery.genre && !couchQuery.startkey) {
      couchQuery.startkey = [couchQuery.genre, {}];
    }

    return couchQuery;
  }

  function mixedAlbumsSongsHandler(request) {
    const couchQuery = getCouchQuery(request.query);
    if (!couchQuery) {
      return d10.realrest.err(428, request.query.genre, request.ctx);
    }

    const ignoredAlbums = request.query.ignoredAlbums ?
                          JSON.parse(request.query.ignoredAlbums) :
                          [];

    return getAndParseByAlbum(couchQuery, ignoredAlbums)
      .then(response => d10.realrest.success(response, request.ctx))
      .catch(e => d10.realrest.err(500, e, request.ctx));
  }

  function listByHits(request) {
    const query = {
      ...request.d10query,
      reduce: false,
      descending: true,
      limit: d10.config.rpp + 1,
    };
    d10.couch.d10wi.view('hits/name', query, (err, resp) => {
      if (err) {
        return d10.realrest.err(423, request.params.sort, request.ctx);
      }
      const keys = Object.keys(resp.rows)
        .map(k => resp.rows[k].id);
      return d10.couch.d10.getAllDocs({ keys, include_docs: true }, (err2, resp2) => {
        if (err2) {
          return d10.realrest.err(423, request.params.sort, request.ctx);
        }
        const back = [];
        resp.rows.forEach((v, i) => {
          back.push({
            id: v.id,
            key: v.key,
            doc: resp2.rows[i].doc,
          });
        });
        return d10.realrest.success(back, request.ctx);
      });
    });
  }

  function genreName(view, request) {
    if (!request.query.genre || !validGenre(request.query.genre)) {
      return d10.realrest.err(428, request.query.genre, request.ctx);
    }
    const query = {
      ...request.d10query,
      include_docs: true,
      reduce: false,
      limit: d10.config.rpp + 1,
      endkey: [request.query.genre, {}],
    };
    if (!query.startkey) {
      query.startkey = [request.query.genre];
    }
    return d10.couch.d10.view(view, query, listDefaultCallback.bind(request.ctx));
  }

  function titleName(view, request) {
    const query = {
      ...request.d10query,
      include_docs: true,
      reduce: false,
      limit: d10.config.rpp + 1,
    };
    if (request.query.title && request.query.title.length) {
      query.endkey = [request.query.title, []];
      if (!query.startkey) {
        query.startkey = [request.query.title];
      }
    }
    d10.couch.d10.view(view, query, listDefaultCallback.bind(request.ctx));
  }

  function albumName(view, request) {
    const query = {
      ...request.d10query,
      include_docs: true,
      reduce: false,
    };
    if (!request.query.full) {
      query.limit = d10.config.rpp + 1;
    }
    if (request.query.album && request.query.album.length) {
      query.endkey = [request.query.album, []];
      if (!query.startkey) {
        query.startkey = [request.query.album];
      }
    }
    if (request.query.endkey) {
      query.endkey = JSON.parse(request.query.endkey);
    }
    d10.couch.d10.view(view, query, listDefaultCallback.bind(request.ctx));
  }

  function userSongs(request) {
    const query = {
      ...request.d10query,
      include_docs: true,
      startkey: [request.ctx.user._id],
      endkey: [request.ctx.user._id, []],
      limit: d10.config.rpp + 1,
    };

    d10.couch.d10.view('s_user/name', query, listDefaultCallback.bind(request.ctx));
  }

  function getLikes(request) {
    const query = {
      ...request.d10query,
      endkey: [request.ctx.user._id, []],
      limit: d10.config.rpp + 1,
    };
    if (request.query.startkey) {
      query.startkey = JSON.parse(request.query.startkey);
      if (request.query.startkey_docid) {
        query.startkey_docid = request.query.startkey_docid;
      }
    }

    d10.couch.d10wi.view('s_user_likes/name', query, (err, resp) => {
      if (err) {
        return d10.realrest.err(423, err, request.ctx);
      }
      const keys = Object.keys(resp.rows).map(k => resp.rows[k].value);

      return d10.couch.d10.getAllDocs({ include_docs: true, keys }, (err2, resp2) => {
        if (err2) {
          return d10.realrest.err(423, err2, request.ctx);
        }
        const back = [];
        resp.rows.forEach((v, k) => {
          back.push(
            { doc: resp2.rows[k].doc, key: v.key },
          );
        });
        return d10.realrest.success(back, request.ctx);
      });
    });
  }

  function genreArtists(view, request) {
    if (!request.params.genre || !validGenre(request.params.genre)) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }
    const query = {
      ...request.d10query,
      endkey: [request.params.genre, []],
      group: true,
      group_level: 2,
    };
    if (!query.startkey) {
      query.startkey = [request.params.genre];
    }
    return d10.couch.d10.view(view, query, listDefaultCallback.bind(request.ctx));
  }

  function genreAlbums(view, request) {
    if (!request.params.genre || !validGenre(request.params.genre)) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }

    const query = {
      startkey: [request.params.genre],
      endkey: [request.params.genre, []],
      group: true,
      group_level: 2,
    };

    return d10.couch.d10.view(view, query, listDefaultCallback.bind(request.ctx));
  }

  function genreAlbumsSongs(view, request) {
    if (!request.params.genre ||
      !validGenre(request.params.genre)) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }
    const opts = {
      ...request.d10query,
      endkey: [request.params.genre, []],
      reduce: false,
      include_docs: true,
      limit: d10.config.rpp + 1,
    };
    if (!opts.startkey) {
      opts.startkey = [request.params.genre];
    }
    return d10.couch.d10.view(view, opts, listDefaultCallback.bind(request.ctx));
  }

  function artistAlbums(view, request) {
    if (!request.params.artist) {
      return d10.realrest.err(428, request.params.artist, request.ctx);
    }
    const query = {
      startkey: [request.params.artist],
      endkey: [request.params.artist, []],
      group: true,
      group_level: 2,
    };

    return d10.couch.d10.view(view, query, listDefaultCallback.bind(request.ctx));
  }

  function artistSongsOrderedByAlbums(view, request) {
    if (!request.params.artist) {
      return d10.realrest.err(428, request.params.artist, request.ctx);
    }

    const query = {
      startkey: [request.params.artist],
      endkey: [request.params.artist, []],
      include_docs: true,
    };

    return d10.couch.d10.view(view, query, listDefaultCallback.bind(request.ctx));
  }

  function artistGenres(view, request) {
    if (!request.params.artist) {
      return d10.realrest.err(428, request.params.artist, request.ctx);
    }

    const query = {
      startkey: [request.params.artist],
      endkey: [request.params.artist, []],
      group: true,
      group_level: 2,
    };
    return d10.couch.d10.view(view, query, listDefaultCallback.bind(request.ctx));
  }

  function albumArtists(view, request) {
    if (!request.params.album) {
      debug('no album');
      return d10.realrest.err(428, request.params.album, request.ctx);
    }

    const query = {
      startkey: [request.params.album],
      endkey: [request.params.album, []],
      group: true,
      group_level: 2,
    };

    return d10.couch.d10.view(view, query, listDefaultCallback.bind(request.ctx));
  }


  function listDefaultCallback(err, resp) {
    if (err) {
      debug('error: ', err);
      return d10.realrest.err(423, err, this);
    }
    return d10.realrest.success(resp.rows, this);
  }

  app.get('/api/list/artist/hits', (request) => {
    let startkey;
    let startkeyDocid;

    const opts = {};
    if (request.query.genre) {
      if (!validGenre(request.query.genre)) {
        return d10.realrest.err(428, request.query.genre, request.ctx);
      }
      opts.genre = request.query.genre;
    }

    if (!request.query.artist) {
      debug('no artist');
      return d10.realrest.err(428, request.query.artist, request.ctx);
    }
    const artist = request.query.artist;
    if (request.query.startkey) {
      startkey = JSON.parse(request.query.startkey);
      if (request.query.startkey_docid) {
        startkeyDocid = request.query.startkey_docid;
      }
    }
    opts.startkey = startkey;
    opts.startkey_docid = startkeyDocid;

    return artists.getSongsByHits(artist, listDefaultCallback.bind(request.ctx), opts);
  });

  app.get('/api/genre/artistsByHits/:genre', (request) => {
    if (!validGenre(request.params.genre)) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }
    const opts = { descending: true, endkey: [request.params.genre] };
    if (request.query.startkey) {
      opts.startkey = JSON.parse(request.query.startkey);
      if (request.query.startkey_docid) {
        opts.startkey_docid = request.query.startkey_docid;
      }
    } else {
      opts.startkey = [request.params.genre, {}];
    }
    return d10.couch.d10.view('artistHits/artists', opts, listDefaultCallback.bind(request.ctx));
  });

  app.get('/api/genre/albumsByHits/:genre', (request) => {
    if (!validGenre(request.params.genre)) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }
    const opts = { descending: true, endkey: [request.params.genre] };
    if (request.query.startkey) {
      opts.startkey = JSON.parse(request.query.startkey);
      if (request.query.startkey_docid) {
        opts.startkey_docid = request.query.startkey_docid;
      }
    } else {
      opts.startkey = [request.params.genre, {}];
    }

    return d10.couch.d10.view('albumHits/albums', opts, (err, list) => {
      if (err || !list.rows.length) {
        return listDefaultCallback.call(request.ctx, err, list);
      }
      const albumSongs = {};
      const keys = [];
      list.rows.forEach((row) => {
        albumSongs[row.key[2]] = [];
        // eslint-disable-next-line no-param-reassign
        row.value = albumSongs[row.key[2]];
        keys.push(row.key[2]);
      });
      debug('going to second view', { reduce: false, include_docs: true, keys });
      return d10.couch.d10.view('album/album', { reduce: false, include_docs: true, keys }, (err2, docs) => {
        if (err2) {
          return listDefaultCallback.call(request.ctx, err2, docs);
        }
        docs.rows.forEach((row) => { albumSongs[row.doc.album].push(row.doc); });
        return listDefaultCallback.call(request.ctx, err, list);
      });
    });
  });

  app.get('/api/genre/songsByHits/:genre', (request) => {
    if (!validGenre(request.params.genre)) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }
    const opts = { include_docs: true, descending: true, endkey: [request.params.genre] };
    if (request.query.startkey) {
      opts.startkey = JSON.parse(request.query.startkey);
      if (request.query.startkey_docid) {
        opts.startkey_docid = request.query.startkey_docid;
      }
    } else {
      opts.startkey = [request.params.genre, {}];
    }

    return d10.couch.d10.view('genre/song-hits', opts, listDefaultCallback.bind(request.ctx));
  });

  app.get('/api/own/list/mixed/lastPlayed', (request) => {
    const requestLength = d10.config.rpp;
    const opts = {
      reduce: false,
      descending: true,
      include_docs: true,
      startkey: request.query.startkey ?
        JSON.parse(request.query.startkey) :
        [request.ctx.user._id, {}],
      endkey: [request.ctx.user._id],
      limit: requestLength,
    };

    if (request.query.startkey_docid) {
      opts.startkey_docid = request.query.startkey_docid;
    }

    users.getListenedSongsByDate(request.ctx.user._id, opts, (err, hits) => {
      if (err) {
        return d10.realrest.err(423, err, request.ctx);
      }
      if (!hits.rows.length) {
        return d10.realrest.success([], request.ctx);
      }
      const ids = hits.rows.map(row => row.value);

      return d10.couch.d10.getAllDocs({ include_docs: true, keys: ids }, (err2, docs) => {
        if (err2) {
          return d10.realrest.err(423, err2, request.ctx);
        }
        const response = hits.rows.map((row) => {
          const element = { ...row };
          element.song = docs.rows.find(song => song.doc._id === row.value).doc;
          return element;
        });

        return d10.realrest.success(response, request.ctx);
      });
    });
  });

  // eslint-disable-next-line consistent-return
  app.get('/api/own/list/genre/lastPlayed/:genre', (request) => {
    if (!validGenre(request.params.genre)) {
      return d10.realrest.err(428, request.params.genre, request.ctx);
    }
    const responseLength = d10.config.rpp + 1;
    const requestLength = d10.config.rpp * 3;
    const responses = [];
    const opts = {
      reduce: false,
      descending: true,
      endkey: [request.ctx.user._id],
      limit: requestLength,
    };
    if (request.query.startkey) {
      opts.startkey = JSON.parse(request.query.startkey);
      if (request.query.startkey_docid) {
        opts.startkey_docid = request.query.startkey_docid;
      }
    } else {
      opts.startkey = [request.ctx.user._id, {}];
    }

    function fetchLastPlayed() {
      // eslint-disable-next-line consistent-return
      users.getListenedSongsByDate(request.ctx.user._id, opts, (err, hits) => {
        if (err) {
          return d10.realrest.err(423, err, request.ctx);
        }
        if (!hits.rows.length) {
          return d10.realrest.success(responses, request.ctx);
        }
        const ids = hits.rows.map(row => row.value);
        // eslint-disable-next-line consistent-return
        d10.couch.d10.getAllDocs({ include_docs: true, keys: ids }, (err2) => {
          if (err2) {
            return d10.realrest.err(423, err2, request.ctx);
          }
          const docHash = {};
          Object.keys(hits.rows)
            .filter(i => samegenreFilter(hits.rows[i]))
            .forEach((i) => {
              if (responses.length < responseLength) {
                responses.push({
                  doc: docHash[hits.rows[i].value],
                  id: hits.rows[i].id,
                  key: hits.rows[i].key,
                  value: hits.rows[i].value,
                });
              }
            });

          if (responses.length === responseLength) {
            return d10.realrest.success(responses, request.ctx);
          }

          if (hits.rows.length < requestLength) {
            return d10.realrest.success(responses, request.ctx);
          }

          opts.startkey = hits.rows[(hits.rows.length - 1)].key;
          opts.startkey_docid = hits.rows[(hits.rows.length - 1)].id;
          fetchLastPlayed();

          function samegenreFilter(row) {
            return row.value in docHash && docHash[row.value].genre === request.params.genre;
          }
        });
      });
    }

    fetchLastPlayed();
  });
}; // exports.api
