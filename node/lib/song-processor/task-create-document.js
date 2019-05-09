/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable no-restricted-globals */
const d10 = require('../../d10');
const gu = require('../../graphicsUtils');

const debug = d10.debug('d10:song-processor:task-create-document');

module.exports = function createDocumentTask(job) {
  return new Promise((resolve, reject) => {
    const sha1 = job.tasks.sha1File.response;
    const songId = job.id;

    const doc = buildDoc(songId, job.songFilename, job.userId, {
      oggLength: job.tasks.oggLength.response,
      sha1File: job.tasks.sha1File.response,
      moveAlternativeFile: job.tasks.moveAlternativeFile.response,
      cleanupTags: job.tasks.cleanupTags.response,
    });

    if (job.tasks.fileMeta.response
      && job.tasks.fileMeta.response.PICTURES
      && job.tasks.fileMeta.response.PICTURES.length) {
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

    function recordDoc() {
      // eslint-disable-next-line consistent-return
      const sha1checksongs = d10.mcol(d10.COLLECTIONS.SONGS).countDocuments({ sha1 });
      const sha1checkstaging = d10.mcol(d10.COLLECTIONS.SONGS_STAGING).countDocuments({ sha1 });

      Promise.all([sha1checksongs, sha1checkstaging])
        .then(([count1, count2]) => {
          if (count1 || count2) {
            return reject(433);
          }
          return d10.mcol(d10.COLLECTIONS.SONGS_STAGING).insertOne(doc)
            .then(() => resolve(doc));
        })
        .catch(reject);
    }


  });
};

function buildDoc(songId, songFilename, userId, jobStatus) {
  const oggLength = jobStatus.oggLength;
  const sha1File = jobStatus.sha1File;
  const moveAlternativeFile = jobStatus.moveAlternativeFile;
  const cleanupTags = jobStatus.cleanupTags;

  let duration;
  if (
    Array.isArray(oggLength)
    && oggLength.length > 2
    && !isNaN(parseFloat(oggLength[1]))
    && !isNaN(parseFloat(oggLength[2]))
  ) {
    duration = parseFloat(oggLength[1]) * 60;
    duration += parseFloat(oggLength[2]);
  } else {
    duration = oggLength;
  }

  const doc = {
    _id: songId,
    filename: songFilename,
    sha1File,
    user: userId,
    reviewed: false,
    valid: false,
    ts_creation: new Date().getTime(),
    hits: 0,
    duration,
  };
  if (moveAlternativeFile) {
    doc.sourceFile = moveAlternativeFile;
  }

  Object.keys(cleanupTags).forEach((prop) => {
    const k = prop.toLowerCase();
    const v = cleanupTags[prop];
    if (k === 'date' || k === 'tracknumber') {
      doc[k] = parseFloat(v);
      if (isNaN(doc[k])) doc[k] = 0;
    } else {
      doc[k] = v;
    }
  });

  if (typeof doc.title === 'string' && doc.title.length
    && typeof doc.artist === 'string' && doc.artist.length) {
    doc.valid = true;
  }

  // test for tracknumber and get it from filename if possible
  if (doc.tracknumber === 0) {
    const tracknumberFromFilename = doc.filename.match(/^[0-9]+/);
    if (tracknumberFromFilename) {
      doc.tracknumber = parseInt(tracknumberFromFilename[0], 10);
    }
  }

  return doc;
}
