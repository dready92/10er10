const d10 = require('../../d10');

const debug = d10.debug('d10:song-processor-task-file-type');

module.exports = function fileTypeTask(job) {
  // eslint-disable-next-line consistent-return
  return new Promise((resolve, reject) => {
    if (job.songFilename.match(/mp3$/i)) {
      debug(job.id, 'fileType task returns', 'audio/mpeg');
      return resolve('audio/mpeg');
    }
    d10.fileType(`${d10.config.audio.tmpdir}/${job.fileName}`, (err, type) => {
      if (err) {
        reject(err);
      } else {
        debug(job.id, 'fileType task returns', type);
        resolve(type);
      }
    });
  });
};
