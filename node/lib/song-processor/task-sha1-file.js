const d10 = require('../../d10');
const files = require('../../files');

exports = module.exports = function sha1FileTask(job) {
  return new Promise((resolve, reject) => {
    files.sha1_file(`${d10.config.audio.tmpdir}/${job.fileName}`, (err, resp) => {
      if (err) {
        reject(err);
      } else {
        resolve(resp.split(' ', 2).shift());
      }
    });
  });
};
