const d10 = require('../../d10');
const audioUtils = require('../../audioFileUtils');

module.exports = function fileMetaTask(job) {
  return new Promise((resolve, reject) => {
    audioUtils.extractTags(`${d10.config.audio.tmpdir}/${job.fileName}`, (err, cb) => {
      if (err) {
        reject(err);
      } else {
        resolve(cb);
      }
    });
  });
};
