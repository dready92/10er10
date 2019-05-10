const bodyParser = require('body-parser');
const rpl = require('./d10.rpl');
const d10 = require('./d10');

const jsonParserMiddleware = bodyParser.json();

exports.api = function api(app) {
  app.get('/api/plm/pl*', (request) => {
    rpl.playlistAndSongs(request.ctx.user, `pl${request.params[0]}`, (err, playlist) => {
      if (err) {
        return d10.realrest.err(423, null, request.ctx);
      }
      return d10.realrest.success(playlist, request.ctx);
    });
  });

  app.put('/api/plm/update', jsonParserMiddleware, (request) => {
    if (!request.body.playlist) {
      return d10.realrest.err(427, 'playlist parameter is empty', request.ctx);
    }
    let songs = request.body.songs || [];
    if (!Array.isArray(songs)) {
      songs = [songs];
    }

    const user = request.ctx.user;
    const playlists = user.playlists || [];
    const playlist = playlists.filter(pl => pl._id === request.body.playlist).pop();
    if (!playlist) {
      return d10.realrest.err(423, 'Playlist unknown', request.ctx);
    }

    return rpl.update(user, playlist, songs, (err2, response) => {
      if (!err2) {
        return d10.realrest.success(response, request.ctx);
      }
      return d10.realrest.err(423, err2, request.ctx);
    });
  });


  app.put('/api/plm/append/pl:id', jsonParserMiddleware, (request) => {
    if (!request.body.song) {
      return d10.realrest.err(427, 'song parameter is empty', request.ctx);
    }

    return d10.couch.d10.getDoc(`pl${request.params.id}`, (err, playlist) => {
      if (err) {
        return d10.realrest.err(423, err, request.ctx);
      }
      if (playlist.user !== request.ctx.user._id) {
        return d10.realrest.err(403, null, request.ctx);
      }
      return rpl.append(request.ctx.user, playlist, request.body.song, (err2, resp) => {
        if (!err2) {
          return d10.realrest.success({ playlist: resp.playlist, song: resp.song }, request.ctx);
        }
        return d10.realrest.err(423, null, request.ctx);
      });
    });
  });

  app.put('/api/plm/create', jsonParserMiddleware, (request) => {
    if (!request.body.name || !request.body.name.length) {
      return d10.realrest.err(427, 'name parameter missing', request.ctx);
    }
    let songs = request.body.songs || [];
    if (Object.prototype.toString.call(songs) !== '[object Array]') {
      songs = [songs];
    }
    return rpl.create(request.ctx.user, request.body.name, songs,
      (err, playlist) => {
        if (err) {
          d10.realrest.err(423, err, request.ctx);
        } else {
          d10.realrest.success(playlist, request.ctx);
        }
      });
  });

  app.put('/api/plm/rename/pl:id', jsonParserMiddleware, (request) => {
    if (!request.body.name || !request.body.name.length) {
      return d10.realrest.err(427, 'name parameter missing', request.ctx);
    }
    return rpl.rename(request.ctx.user, `pl${request.params.id}`, request.body.name,
      (err, playlist) => {
        if (err) {
          d10.realrest.err(423, err, request.ctx);
        } else {
          d10.realrest.success(playlist, request.ctx);
        }
      });
  });

  app.delete('/api/plm/pl:id', (request) => {
    const playlistId = `pl${request.params.id}`;
    d10.couch.d10.getDoc(playlistId, (err, playlist) => {
      if (err) {
        d10.realrest.err(423, err, request.ctx);
      }
      if (playlist.user != request.ctx.user._id) {
        return d10.realrest.err(403, '', request.ctx);
      }
      return d10.couch.d10.deleteDoc(playlist, (err2) => {
        if (err2) {
          return d10.realrest.err(423, err2, request.ctx);
        }
        return d10.realrest.success(playlist, request.ctx);
      });
    });
  });
};
