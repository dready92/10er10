const d10 = require('./d10');

const debug = d10.debug('d10:rpl');

exports.playlistAndSongs = function playlistAndSongs(user, playlistId, then) {
  d10.mcol(d10.COLLECTIONS.USERS).findOne({ _id: user._id })
    .then((dbuser) => {
      if (!dbuser || !dbuser.playlists) {
        throw new Error('User or playlist not found');
      }
      const playlist = dbuser.playlists.filter(pl => pl._id === playlistId).pop();
      if (!playlist) {
        throw new Error('Playlist not found');
      }
      return getSongs(playlist);
    })
    .catch(() => then(8));

  function getSongs(playlist) {
    if (!playlist.songs || !playlist.songs.length) {
      return then(null, playlist);
    }

    return d10.mcol(d10.COLLECTIONS.SONGS).find({ _id: { $in: playlist.songs } })
      .toArray()
      .then((songs) => {
        const playlistBack = { ...playlist, songs: d10.orderedList(playlist.songs, songs) };
        then(null, playlistBack);
      });
  }
};

exports.update = function update(user, playlist, songs, then) {
  if (!playlist._id.length || playlist._id.substr(0, 2) !== 'pl') {
    return then(8);
  }

  return fetchSongs().then(songDetails => d10.mcol(d10.COLLECTIONS.USERS).updateOne(
    { _id: user._id },
    { $set: { 'playlists.$[element].songs': songs } },
    { arrayFilters: [{ 'element._id': playlist._id }] },
  )
    .then(() => songDetails)
    .catch((err) => {
      // eslint-disable-next-line no-param-reassign
      err.code = 4;
      throw err;
    }))
    .then((songDetails) => {
      const updatedPlaylist = { ...user.playlists[playlist._id], songs };
      then(null, { playlist: updatedPlaylist, songs: songDetails });
    })
    .catch((err) => {
      then(err.code || 10);
    });

  function fetchSongs() {
    if (songs.length) {
      return d10.mcol(d10.COLLECTIONS.SONGS).find({ _id: { $in: songs } }).toArray()
        .then((dbsongs) => {
          if (!dbsongs || !dbsongs.length || dbsongs.length !== songs.length) {
            const err = new Error('Songs from datastore differ from song ids');
            err.code = 8;
            throw err;
          }
        });
    }
    return Promise.resolve([]);
  }
};

exports.append = function append(user, playlist, songId, then) {
  if (!playlist._id.length || playlist._id.substr(0, 2) !== 'pl'
    || !songId.length || songId.substr(0, 2) !== 'aa'
  ) {
    return then(8);
  }

  return d10.mcol(d10.COLLECTIONS.SONGS).findOne({ _id: songId })
    .then((song) => {
      if (!song) {
        const e = new Error('song not found');
        e.code = 8;
        throw e;
      }
      return song;
    })
    .then(song => d10.mcol(d10.COLLECTIONS.USERS).updateOne(
      { _id: user._id },
      { $push: { 'playlists.$[element].songs': songId } },
      { arrayFilters: [{ 'element._id': playlist._id }] },
    )
      .then(() => song)
      .catch((err) => {
        // eslint-disable-next-line no-param-reassign
        err.code = 4;
        throw err;
      }))
    .then((song) => {
      const updatedPlaylist = { ...playlist };
      updatedPlaylist.songs = [...playlist.songs, songId];
      then(null, { playlist: updatedPlaylist, song });
    })
    .catch((err) => {
      then(err.code || 10);
    });
};

exports.create = function create(user, name, songs, then) {
  const existing = user.playlists.filter(playlist => playlist.name === name).length;
  if (existing) {
    return then(430);
  }

  return d10.mcol(d10.COLLECTIONS.SONGS)
    .find({ _id: { $in: songs } }).toArray()
    .then((existingSongs) => {
      const existingSongIds = existingSongs.map(s => s._id);
      const okSongIds = songs.filter(songId => existingSongIds.includes(songId));
      return okSongIds;
    })
    .then((songIds) => {
      const playlist = {
        _id: `pl${d10.uid()}`,
        name,
        songs: songIds,
      };

      return d10.mcol(d10.COLLECTIONS.USERS).updateOne(
        { _id: user._id },
        { $push: { playlists: playlist } },
      )
        .then(() => playlist);
    })
    .then((playlist) => {
      if (!playlist.songs.length) {
        return [];
      }
      return d10.mcol(d10.COLLECTIONS.SONGS).find({ _id: { $in: playlist.songs } }).toArray()
        .then(response => ({ songs: response, playlist }));
    })
    .then((response) => {
      const updatedPlaylist = {
        playlist: response.playlist,
        songs: d10.orderedList(response.playlist.songs, response.songs),
      };
      return then(null, updatedPlaylist);
    })
    .catch((err) => {
      debug('Error on playlist creation ', err);
      then(423);
    });
};

exports.rename = function rename(user, playlistId, name, then) {
  const existing = user.playlists.filter(pl => pl.name === name).length;
  if (existing) {
    return then(430);
  }

  return d10.mcol(d10.COLLECTIONS.USERS).updateOne(
    { _id: user._id },
    { $set: { 'playlists.$[element].name': name } },
    { arrayFilters: [{ 'element._id': playlistId }] },
  )
    .then(() => {
      const playlist = user.playlists.filter(pl => pl._id === playlistId).pop();
      const updatedPlaylist = { ...playlist, name };
      return then(null, updatedPlaylist);
    })
    .catch((err) => {
      debug('troubles renaming an rpl ', err);
      return then(423);
    });
};
