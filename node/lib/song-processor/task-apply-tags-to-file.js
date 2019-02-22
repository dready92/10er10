const d10 = require('../../d10');
const audioUtils = require('../../audioFileUtils');

const debug = d10.debug('d10:song-processor:task-apply-tags-to-file');

module.exports = function applyTagsToFileTask(job) {
  return new Promise((resolve, reject) => {
    const c = job.id[2];
    debug(job.id, 'Applying tags to ogg file');
    audioUtils.setOggtags(`${d10.config.audio.dir}/${c}/${job.oggName}`, job.tasks.cleanupTags.response, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
