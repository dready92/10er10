/* eslint-disable prefer-destructuring */
/* eslint-disable consistent-return */
const fs = require('fs');
const promisify = require('util').promisify;
const files = require('./files');
const gu = require('./graphicsUtils');
const d10 = require('./d10');

const debug = d10.debug('d10:d10.router.images');

/*
"images" : [
        {
            "filename" : "122kliin4vo3p8dfa9bj3eo9ndu8l7k.jpg",
            "sha1" : "dd03f9df0e3b6024c8403a79e26ca98ee2e1d274",
            "alternatives" : {
                "200" : {
                    "width" : 200,
                    "height" : 200
                },
                "250" : {
                    "width" : 250,
                    "height" : 250
                },
                "300" : {
                    "width" : 300,
                    "height" : 300
                }
            }
        }
    ],
*/

exports.api = function api(app) {
  app.delete('/api/songImage/:id/:filename', (request) => {
    const songId = request.params.id;
    const filename = request.params.filename;

    return Promise.all([
      d10.mcol(d10.COLLECTIONS.SONGS).findOne({ _id: songId }),
      d10.mcol(d10.COLLECTIONS.SONGS).find({ 'images.filename': filename }).toArray(),
    ])
      .then(([doc, used]) => {
        if (doc.user !== request.ctx.user._id && !request.ctx.user.superman) {
          debug('DELETE', request.url, request.ctx.user._id, 'Not allowed to delete ', doc._id);
          return d10.realrest.err(403, 'Forbidden', request.ctx);
        }
        const saneUsed = used || [];
        if (!saneUsed.length) {
          // image unknown in datastore
          return d10.realrest.err(404, 'image unknown', request.ctx);
        }
        const isInDoc = saneUsed.filter(song => song._id === songId).length;
        if (!isInDoc) {
          // image not in the list of images for this doc
          return d10.realrest.success(doc, request.ctx);
        }
        const image = saneUsed[0].images.filter(img => img.filename === filename).pop();
        if (!image) {
          debug('image ', filename, ' not found in song ', songId);
          return d10.realrest.err(404, 'image unknown', request.ctx);
        }

        // remove image from documens
        return d10.mcol(d10.COLLECTIONS.SONGS).updateOne(
          { _id: songId },
          {
            $pull: {
              'images.filename': filename,
            },
          },
        ).then(updateResponse => ({
          image,
          deleteFiles: saneUsed.length > 1,
          response: updateResponse,
        }));
      })
      .then((response) => {
        if (!response) {
          return null;
        }

        const image = response.image;

        d10.realrest.success(response.image, request.ctx);

        //
        // Following is a background processing job.
        //

        if (!response.deleteFiles) {
          debug('Not deleting image files. End now');
          return null;
        }
        deleteImageFiles(image).then(() => {
          debug(`All images deleted successfully [${image.filename}]`);
        }).catch(() => {
          debug('Failed to delete some image files');
        });
      })
      .catch(err => d10.realrest.err(500, err, request.ctx));
  });

  function deleteImageFiles(image) {
    const alternatives = image.alternatives;
    const filenames = [image.filename];
    if (alternatives) {
      Object.keys(alternatives).forEach((s) => {
        filenames.push(gu.getAlternateFileName(image.filename, alternatives[s]));
      });
    }

    const promises = filenames.map(filename => new Promise((resolve, reject) => {
      const filefull = `${d10.config.images.dir}/${filename}`;
      debug(`Warning: deleting ${filefull}`);
      fs.unlink(filefull, (err) => {
        if (err) {
          debug('Warning: unexpected: image unlink failed ', filefull, err);
          reject(err);
        } else {
          resolve(true);
        }
      });
    }));

    return Promise.all(promises);
  }

  app.post('/api/songImage/:id', (request) => {
    if (!request.query.filename || !request.query.filename.length
      || !request.query.filesize || !request.query.filesize.length) {
      return d10.realrest.err(427, 'filename and filesize arguments required', request.ctx);
    }
    privAddimage(request.query.filename, request.query.filesize, [request.params.id], request)
      .then((update) => {
        debug('Image update complete ', update.dbresponse);
        d10.realrest.success(update.image, request.ctx);
      })
      .catch((err) => {
        d10.realrest.err(err.code || 500, err, request.ctx);
      });
  });

  app.post('/api/songImage', (request) => {
    debug(request.url, 'START of process');
    if (!request.query.filename || !request.query.filename.length
      || !request.query.filesize || !request.query.filesize.length
      || !request.query.ids || !Array.isArray(request.query.ids) || !request.query.ids.length) {
      return d10.realrest.err(427, 'filename, filesize and ids arguments required', request.ctx);
    }
    privAddimage(request.query.filename, request.query.filesize, request.query.ids, request)
      .then((update) => {
        debug('Image update complete ', update.dbresponse);
        d10.realrest.success(update.image, request.ctx);
      })
      .catch((err) => {
        d10.realrest.err(err.code || 500, err, request.ctx);
      });
  });

  function privAddimage(filename, filesize, ids, inputStream) {
    return Promise.all([
      d10.mcol(d10.COLLECTIONS.SONGS).find({ _id: { $in: ids } }).toArray()
        .then((songs) => {
          if (!songs || songs.length !== ids.length) {
            const err = new Error('bad list of songs');
            err.code = 404;
            throw err;
          }
          return songs;
        }),
      processImageUpload2(inputStream, filename, filesize),
    ])
      .then(([, imageInfos]) => {
        let imageDoc;
        if (!imageInfos.isNew) {
          imageDoc = imageInfos.image;
        } else {
          imageDoc = {
            filename: imageInfos.filename,
            sha1: imageInfos.sha1,
            alternatives: imageInfos.alternatives,
          };
        }
        return d10.mcol(d10.COLLECTIONS.SONGS)
          .updateMany({ _id: { $in: ids } }, { $push: { images: imageDoc } })
          .catch((err) => {
            debug('Failed to record documents with new image', err);
            // eslint-disable-next-line no-param-reassign
            err.code = 500;
            throw err;
          })
          .then(dbresponse => ({ image: imageDoc, dbresponse }));
      });
  }

  function resizeImage2(filename) {
    const tmpfile = `${d10.config.images.tmpdir}/${filename}`;
    return promisify(gu.resizeImage)(tmpfile, d10.config.images.dir, filename)
      .catch((err) => {
        // eslint-disable-next-line no-param-reassign
        err.code = 500;
        throw err;
      });
  }

  function processImageUpload2(request, filename, filesize) {
    const imagefile = `${d10.uid()}.${filename.split('.').pop()}`;
    const tmpfile = `${d10.config.images.tmpdir}/${imagefile}`;
    return promisify(files.writeStream)(request, tmpfile)
      .catch((err) => {
        // eslint-disable-next-line no-param-reassign
        err.code = 500;
        throw err;
      })
      .then(() => promisify(fs.stat)(tmpfile)
        .catch((err) => {
          // eslint-disable-next-line no-param-reassign
          err.code = 500;
          throw err;
        })
        .then((stat) => {
          if (stat.size !== filesize) {
            const e = new Error('filesystem error (filesize does not match)');
            e.code = 500;
            throw e;
          }
        }))
      .then(() => promisify(files.sha1_file)(tmpfile)
        .then(sha1 => sha1.split(' ', 2).shift()))
      .then(sha1 => d10.mcol(d10.COLLECTIONS.SONGS).findOne({ 'images.sha1': sha1 })
        .then((song) => {
          if (song) {
            const image = song.images.filter(img => img.sha1 === sha1).pop();
            return {
              filename: image.filename, sha1, isNew: false, image,
            };
          }

          return resizeImage2(imagefile)
            .then(alternatives => ({
              filename: imagefile,
              sha1,
              isNew: true,
              alternatives,
            }));
        }));
  }
};
