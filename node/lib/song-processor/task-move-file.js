const fs = require('fs');
const d10 = require('../../d10');
const audioUtils = require('../../audioFileUtils');

const debug = d10.debug('d10:song-processor:task-move-file');

module.exports = function moveFileTask(job) {
  return new Promise((resolve, reject) => {
    const c = job.id[2];
    const filename = job.oggName;
    let sourceFile = `${d10.config.audio.tmpdir}/`;
    // eslint-disable-next-line max-len
    sourceFile += audioUtils.isOggFileType(job.tasks.fileType.response) ? job.fileName : job.oggName;
    debug(job.id, 'moveFile : ', sourceFile, ' -> ', `${d10.config.audio.dir}/${c}/${filename}`);

    function moveFile() {
      // eslint-disable-next-line consistent-return
      fs.rename(sourceFile, `${d10.config.audio.dir}/${c}/${filename}`, (err, resp) => {
        if (err) {
          return reject(err);
        }
        job.complete('moveAlternativeFile', () => { resolve(resp); });
        job.run('moveAlternativeFile');
      });
    }

    fs.stat(`${d10.config.audio.dir}/${c}`, (err) => {
      if (err) {
        debug(job.id, 'moveFile', err);
      }
      if (err && err.errno !== 2 && err.code !== 'ENOENT') { // err.code == ENOENT = no such file on node > 0.5.10
        reject(err);
      } else if (err) {
        fs.mkdir(`${d10.config.audio.dir}/${c}`, { mode: 0o777 }, (err2) => {
          if (err2) {
            reject(err2);
          } else {
            moveFile();
          }
        });
      } else {
        moveFile();
      }
    });
  });
};
