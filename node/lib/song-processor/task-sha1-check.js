const d10 = require('../../d10');


exports = module.exports = function sha1CheckTask(job) {
  // eslint-disable-next-line consistent-return
  return new Promise((resolve, reject) => {
    if (job.tasks.sha1File.err) {
      return reject(job.tasks.sha1File.err);
    } else if (!job.tasks.sha1File.response || !job.tasks.sha1File.response.length) {
      return reject('Sha1 not available');
    }
    d10.couch.d10.view('song/sha1', { key: job.tasks.sha1File.response }, (err, resp) => {
      if (err) {
        reject(501);
      } else if (!resp.rows || resp.rows.length) {
        reject(433);
      } else {
        resolve();
      }
    });
  });
};
