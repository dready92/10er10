/* eslint-disable no-restricted-globals */
const bodyParser = require('body-parser');
const d10 = require('./d10');
const when = require('./when');
const songProcessorEmitter = require('./lib/song-processor/song-processor-events');
const songProcessor = require('./lib/song-processor');
const artistToken = require('./artistToken');

const debug = d10.debug('d10:d10.router.song');
const jsonParserMiddleware = bodyParser.json();

exports.api = function api(app) {
  app.get('/api/review/list', (request) => {
    d10.mcol(d10.COLLECTIONS.SONGS_STAGING).find({ user: request.ctx.user._id })
      .toArray()
      .then(songs => d10.realrest.success(songs, request.ctx))
      .catch(() => d10.realrest.err(423, d10.http.statusMessage(423), request.ctx.headers));
  });

  app.get('/api/review/aa:id', (request) => {
    const songId = `aa${request.params.id}`;
    Promise.all([
      d10.mcol(d10.COLLECTIONS.SONGS).findOne({ _id: songId }),
      d10.mcol(d10.COLLECTIONS.SONGS_STAGING).findOne({ _id: songId }),
    ])
      .then(([song, songstaging]) => {
        let source;
        if (song) {
          source = song;
        } else if (songstaging) {
          source = songstaging;
        } else {
          const err = new Error('Song not found');
          err.code = 404;
          throw err;
        }
        d10.realrest.success(source, request.ctx);
      })
      .catch(err => d10.realrest.err(err.code || 500, err, request.ctx));
  });

  app.get('/html/my/review', (request, response) => {
    request.ctx.headers['Content-Type'] = 'text/html';
    return d10.mcol(d10.COLLECTIONS.SONGS_STAGING).find({ user: request.ctx.user._id })
      .toArray()
      .then((docs) => {
        response.writeHead(200, request.ctx.headers);
        if (docs && docs.length) {
          d10.lngView(request, 'review/list', { rows: docs }, {}, (data) => {
            response.end(data);
          });
        } else {
          d10.lngView(request, 'review/none', {}, {}, (data) => {
            response.end(data);
          });
        }
      })
      .catch(() => {
        response.writeHead(423, d10.http.statusMessage(423), request.ctx.headers);
        response.end();
      });
  });

  const sanitize = {
    string(s) {
      return d10.ucwords(s.replace(/^\s+/, '').replace(/\s+$/, '').replace(/</g, '').replace(/>/g, '')
        .toLowerCase());
    },
    genre(s) {
      // eslint-disable-next-line no-param-reassign
      s = s.toLowerCase();
      let back = '';
      d10.config.genres.forEach((v) => {
        if (s === v.toLowerCase()) {
          back = v;
        }
      });
      return back;
    },
  };

  // eslint-disable-next-line consistent-return
  app.put('/api/meta/:id', jsonParserMiddleware, (request, response, next) => {
    if (request.params.id.substr(0, 2) !== 'aa') {
      return next();
    }
    const id = request.params.id;

    const fields = {};
    const errors = {};
    fields.title = request.body.title ? sanitize.string(request.body.title) : '';
    fields.artist = request.body.artist ? sanitize.string(request.body.artist) : '';
    if (!d10.config.allowCustomGenres) {
      fields.genre = request.body.genre ? sanitize.genre(request.body.genre) : '';
    } else {
      fields.genre = request.body.genre && request.body.genre.length ? request.body.genre : 'Other';
    }
    when(
      {
        title(cb) {
          if (!fields.title.length) {
            d10.lngView(request, 'inline/review_err_no_title', {}, {}, cb);
          } else {
            cb();
          }
        },
        artist(cb) {
          if (!fields.artist.length) {
            d10.lngView(request, 'inline/review_err_no_artist', {}, {}, cb);
          } else {
            cb();
          }
        },
        genre(cb) {
          if (!fields.genre.length) {
            d10.lngView(request, 'inline/review_err_unknown_genre', {}, {}, cb);
          } else {
            cb();
          }
        },
      },
      (errs, responses) => {
        if (responses.title && responses.title.length) {
          errors.title = responses.title;
        }
        if (responses.artist && responses.artist.length) {
          errors.artist = responses.artist;
        }
        if (responses.genre && responses.genre.length) {
          errors.genre = responses.genre;
        }
        if (d10.count(errors)) {
          d10.realrest.err(412, errors, request.ctx);
          return;
        }
        if (request.body.album) {
          fields.album = sanitize.string(request.body.album);
        } else {
          fields.album = '';
        }
        if (request.body.tracknumber && !isNaN(parseInt(request.body.tracknumber, 10))) {
          fields.tracknumber = parseInt(request.body.tracknumber, 10);
        } else {
          fields.tracknumber = 0;
        }
        if (request.body.date && !isNaN(parseInt(request.body.date, 10))) {
          fields.date = parseInt(request.body.date, 10);
        } else {
          fields.date = 0;
        }

        fields.valid = true;
        fields.reviewed = true;

        Promise.all([
          d10.mcol(d10.COLLECTIONS.SONGS).findOne({ _id: id }),
          d10.mcol(d10.COLLECTIONS.SONGS_STAGING).findOne({ _id: id }),
        ]).then(([songDoc, stagingDoc]) => {
          let sourceIsStaging = null;
          let source;
          if (songDoc) {
            sourceIsStaging = false;
            source = songDoc;
          } else if (stagingDoc) {
            sourceIsStaging = true;
            source = stagingDoc;
          } else {
            d10.realrest.err(404, 'Song not found', request.ctx);
            return null;
          }

          if (source.user !== request.ctx.user._id && !request.ctx.user.superman) {
            debug('debug', request.ctx.user._id, 'Not allowed to edit', source._id);
            d10.realrest.err(403, 'Forbidden', request.ctx);
            return null;
          }
          const doc = { ...source, ...fields };
          const tokens = artistToken.tokenize(doc);
          doc.tokentitle = tokens.title;
          doc.tokenartists = tokens.artists;

          let record;
          if (sourceIsStaging) {
            record = d10.mcol(d10.COLLECTIONS.SONGS).insertOne(doc).then(() => {
              d10.mcol(d10.COLLECTIONS.SONGS_STAGING).deleteOne({ _id: doc._id });
            });
          } else {
            record = d10.mcol(d10.COLLECTIONS.SONGS).updateOne({ _id: doc._id }, { $set: doc })
              .then((updateResponse) => {
                if (!updateResponse.modifiedCount) {
                  throw new Error('update song in SONGS collection: not found');
                }
                return updateResponse;
              });
          }
          return record.then(() => {
            debug('debug', 'storeDoc success');
            d10.realrest.success(doc, request.ctx);
          });
        });
      },
    );
  });


  // eslint-disable-next-line consistent-return
  app.put('/api/song', (request) => {
    if (!request.query.filename || !request.query.filename.length
      || !request.query.filesize || !request.query.filesize.length) {
      return d10.realrest.err(427, 'filename and filesize arguments required', request.ctx);
    }
    let bgencoding = false;
    if (request.query.bgencoding) {
      bgencoding = true;
    }
    const songId = `aa${d10.uid()}`;
    const userId = request.ctx.user._id;
    function onend(data) {
      if (data.userId !== userId || data.songId !== songId) {
        return;
      }
      songProcessorEmitter.removeListener('end', onend);
      if (data.status === 'error') {
        d10.realrest.err(data.code, data.data, request.ctx);
      } else if (data.status === 'success') {
        d10.realrest.success(data.data, request.ctx);
      }
    }
    function onuploadend(data) {
      if (data.userId !== userId || data.songId !== songId) {
        return;
      }
      songProcessorEmitter.removeListener('uploadEnd', onuploadend);
      d10.realrest.success({ id: songId, status: 'uploadEnd' }, request.ctx);
    }

    if (bgencoding) {
      songProcessorEmitter.on('uploadEnd', onuploadend);
    } else {
      songProcessorEmitter.on('end', onend);
    }

    songProcessor(
      songId,
      request.query.filename,
      parseInt(request.query.filesize, 10),
      userId,
      request,
      songProcessorEmitter,
    );
  });
};
