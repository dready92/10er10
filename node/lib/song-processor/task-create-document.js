const d10 = require('../../d10');
const gu = require('../../graphicsUtils');

const debug = d10.debug('d10:song-processor:task-create-document');

exports = module.exports = function createDocumentTask(job) {
  return new Promise((resolve, reject) => {

    const resp = job.tasks.oggLength.response;
    let duration = 0;
    const sha1 = job.tasks.sha1File.response;
    const songId = job.id;
    if (
      Object.prototype.toString.call(resp) === '[object Array]' &&
      resp.length > 2 &&
      !isNaN(parseFloat(resp[1])) &&
      !isNaN(parseFloat(resp[2]))
    ) {
      duration = parseFloat(resp[1]) * 60;
      duration += parseFloat(resp[2]);
    } else {
      duration = job.tasks.oggLength.response;
    }

    const doc = {
      _id: job.id,
      filename: job.songFilename,
      sha1,
      user: job.userId,
      reviewed: false,
      valid: false,
      ts_creation: new Date().getTime(),
      hits: 0,
      duration,
    };
    if (job.tasks.moveAlternativeFile.response) {
      doc.sourceFile = job.tasks.moveAlternativeFile.response;
    }

    Object.keys(job.tasks.cleanupTags.response).forEach((prop) => {
      const k = prop.toLowerCase();
      const v = job.tasks.cleanupTags.response[prop];
      if (k === 'date' || k === 'tracknumber') {
        doc[k] = parseFloat(v);
        if (isNaN(doc[k])) doc[k] = 0;
      } else {
        doc[k] = v;
      }
    });

    if (typeof doc.title === 'string' && doc.title.length &&
      typeof doc.artist === 'string' && doc.artist.length) {
      doc.valid = true;
    }

    // test for tracknumber and get it from filename if possible
    if (doc.tracknumber === 0) {
      const tracknumberFromFilename = doc.filename.match(/^[0-9]+/);
      if (tracknumberFromFilename) {
        doc.tracknumber = parseInt(tracknumberFromFilename[0], 10);
      }
    }

  //                          return then(null,doc);
    function recordDoc() {
      // eslint-disable-next-line consistent-return
      d10.couch.d10.view('song/sha1', { key: sha1 }, (err, resp2) => {
        if (err) {
          return reject(501);
        } else if (!resp2.rows || resp2.rows.length) {
          return reject(433);
        }
        d10.couch.d10.storeDoc(doc, (err2, resp4) => {
          if (err2) {
            reject(err2);
          } else {
            doc._rev = resp4.rev;
            resolve(doc);
          }
        });
      });
    }

    if (job.tasks.fileMeta.response &&
      job.tasks.fileMeta.response.PICTURES &&
      job.tasks.fileMeta.response.PICTURES.length) {
      gu.imageFromMeta(job.tasks.fileMeta.response, (err, resp2) => {
        debug(songId, 'imageFromMeta response', err, resp2);
        if (!err) {
          doc.images = [resp2];
        }
        recordDoc();
      });
    } else {
      recordDoc();
    }
  });
};
