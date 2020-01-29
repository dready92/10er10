const d10 = require('../../d10');


module.exports = function sha1CheckTask(job) {
  // eslint-disable-next-line consistent-return
  return new Promise((resolve, reject) => {
    if (job.tasks.sha1File.err) {
      return reject(job.tasks.sha1File.err);
    }
    if (!job.tasks.sha1File.response || !job.tasks.sha1File.response.length) {
      // eslint-disable-next-line prefer-promise-reject-errors
      return reject('Sha1 not available');
    }
    const sha1 = job.tasks.sha1File.response;

    const sha1checksongs = d10.mcol(d10.COLLECTIONS.SONGS).countDocuments({ sha1File: sha1 });
    const sha1checkstaging = d10.mcol(d10.COLLECTIONS.SONGS_STAGING).countDocuments({ sha1File: sha1 });

    Promise.all([sha1checksongs, sha1checkstaging])
      .then(([count1, count2]) => {
        if (count1 || count2) {
          // eslint-disable-next-line prefer-promise-reject-errors
          reject(433);
        } else {
          resolve();
        }
      })
      // eslint-disable-next-line prefer-promise-reject-errors
      .catch(() => reject(501));
  });
};
