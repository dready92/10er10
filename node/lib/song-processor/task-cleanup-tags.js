const d10 = require('../../d10');

exports = module.exports = function cleanupTagsTask(job) {
  return new Promise((resolve) => {
    if (!job.tasks.fileMeta.response) {job.tasks.fileMeta.response = {}; }
    const tags = {};

    if (job.tasks.fileMeta.response.GENRE) {
      let value = '';
      d10.config.genres.forEach((v) => {
        if (job.tasks.fileMeta.response.GENRE === v.toLowerCase()) {
          value = v;
        }
      });
      tags.genre = value.length ? value : job.tasks.fileMeta.response.GENRE;
    }

    ['ALBUM', 'ARTIST', 'TITLE'].forEach((v) => {
      if (job.tasks.fileMeta.response[v]) {
        tags[v] = d10.ucwords(job.tasks.fileMeta.response[v].toLowerCase());
      }
    });
    ['ALBUM', 'TRACKNUMBER', 'ARTIST', 'TITLE', 'GENRE', 'DATE'].forEach((v) => {
      if (job.tasks.fileMeta.response[v]) {
        tags[v] = job.tasks.fileMeta.response[v];
      } else {
        tags[v] = null;
      }
    });
    resolve(tags);
  });
};
