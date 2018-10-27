const d10 = require('./d10');

module.exports.getAndParseByAlbum = getAndParseByAlbum;

function fetchView(view, couchQuery) {
  return new Promise((resolve, reject) => {
    d10.couch.d10.view(view, couchQuery, (err, response) => {
      if (err) {
        return reject(err);
      }
      return resolve(response.rows);
    });
  });
}

function getAndParseByAlbum(couchQuery, ignoredAlbums = []) {
  const view = couchQuery.view;
  delete couchQuery.view;
  const expectedResultsCount = couchQuery.limit - 1;
  const fetchResults = expectedResultsCount * 30 + 1;
  const albumMaxTTL = 40; // number of songs from hte latest song of this album found until we can forget this album
  let albums = {};
  const byAlbum = [];
  const nextQuery = {};
  let totalReached = 0;

  couchQuery.limit = fetchResults;

  return fetchView(view, couchQuery)
    .then((rows) => {
      if (rows.length === fetchResults) {
        rows.pop();
      }
      rows.forEach((row) => {
        const song = row.doc;
        if (song.album) {
          /* This song is part of an album
            *
            */

          if (ignoredAlbums.indexOf(song.album) < 0) {
            const album = getAlbum(song.album, albums);
            if (album.isNew) {
              album.isNew = false;
              if (!totalReached) {
                byAlbum.push(album);
              }
            }
            album.ttl = 0;
            album.songs.push(song);
          }
        } else {
          /* This song is not part of an album
            *
            */

          if (!totalReached) {
            byAlbum.push(orphan(song));
            albums = incrementAndExpiresAlbumTTL(albums, albumMaxTTL);
          }
        }

        if (byAlbum.length === expectedResultsCount) {
          if (totalReached === 0) {
            nextQuery.ignoredAlbums = Object.keys(albums);
            nextQuery.startkey = row.key;
            if (row.id) {
              nextQuery.startkey_docid = row.id;
            }
          }

          totalReached = 1;
        }
      });

      return {
        rows: byAlbum,
        nextQuery,
      };
    });

  function incrementAndExpiresAlbumTTL(albumList, albumMaxTTL) {
    const response = { ...albumList };
    Object.keys(response).map(name => response[name])
      .forEach((album) => {
        album.ttl += 1;
        if (album.ttl > albumMaxTTL) {
          delete response[album.name];
        }
      });

    return response;
  }

  function getAlbum(name, albumList) {
    if (albums[name]) {
      return albums[name];
    }
    const album = {
      name,
      ttl: 0,
      songs: [],
      isNew: true,
    };
    albumList[name] = album;

    return album;
  }

  function orphan(song) {
    return {
      name: '',
      songs: [song]
    };
  }
}
