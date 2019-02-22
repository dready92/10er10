const d10 = require('../../d10');
const audioUtils = require('../../audioFileUtils');

module.exports = function oggLengthTask(job) {
  return new Promise((resolve, reject) => {
    const file = audioUtils.isOggFileType(job.tasks.fileType.response) ? job.fileName : job.oggName;
    audioUtils.oggLength(`${d10.config.audio.tmpdir}/${file}`, (err, len) => {
      if (err) {
        reject(err);
      } else {
        let parsedLen = len;
        if (len && len.length && len.length > 2) {
          parsedLen = 60 * parseInt(len[1], 10);
          parsedLen += parseInt(len[2], 10);
        }

        resolve(parsedLen);
      }
    });
  });
};
