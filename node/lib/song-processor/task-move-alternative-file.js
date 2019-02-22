const fs = require('fs');

const d10 = require('../../d10');

const debug = d10.debug('d10:song-processor:task-move-alternative-file');

module.exports = function moveAlternativeFileTask(job) {
  // eslint-disable-next-line consistent-return
  return new Promise((resolve, reject) => {
    if (!d10.config.audio.keepOriginalFile) {
      return resolve();
    }

    const tmpFile = `${d10.config.audio.tmpdir}/${job.fileName}`;
    const { id } = job;
    const fileType = job.tasks.fileType.response;
    let alternativeExtension = null;
    debug(job.id, 'file type : ', fileType);
    if (fileType === 'audio/mpeg') {
      alternativeExtension = 'mp3';
    } else if (fileType === 'audio/mp4' || fileType === 'audio/x-m4a') {
      alternativeExtension = 'm4a';
    }
    if (!alternativeExtension) {
      return resolve();
    }
    const targetFile = `${d10.config.audio.dir}/${id[2]}/${id}.${alternativeExtension}`;
    debug(job.id, 'moveAlternativeFile : ', tmpFile, ' -> ', targetFile);
    fs.rename(tmpFile, targetFile, (err) => {
      if (err) {
        return reject(err);
      }
      return resolve({ type: fileType, extension: alternativeExtension });
    });
  });
};
