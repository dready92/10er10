const fs = require('fs');
const promisify = require('util').promisify;

const d10 = require('./d10');

const stat = promisify(fs.stat);

module.exports = function configChecker() {
  const bPromise = checkBinaries();
  const dPromise = checkDirectories();

  return Promise.all([bPromise, dPromise])
    .then(([bResponse, dResponse]) => {
      const response = {
        success: [],
        errors: [],
      };

      bResponse.forEach((element) => {
        if (element.status === 'OK') {
          response.success.push(element);
        } else {
          response.errors.push(element);
        }
      });
      dResponse.forEach((element) => {
        if (element.status === 'OK') {
          response.success.push(element);
        } else {
          response.errors.push(element);
        }
      });

      return response;
    });
};

function checkBinaries() {
  const binaries = [
    d10.config.cmds.lame,
    d10.config.cmds.oggenc,
    d10.config.cmds.ogginfo,
    d10.config.cmds.flac,
    d10.config.cmds.vorbiscomment,
    d10.config.cmds.faad,
  ];
  const COMPONENT = 'binary';

  const promises = binaries.map(binary => stat(binary)
    .then(() => successResponse(COMPONENT, binary))
    .catch(() => errResponse(COMPONENT, binary, 'not found')));

  return Promise.all(promises);
}

function checkDirectories() {
  const directories = [
    d10.config.audio.tmpdir,
    d10.config.audio.dir,
  ];
  const COMPONENT = 'directory';

  const promises = directories.map(dir => stat(dir)
    .then(() => successResponse(COMPONENT, dir))
    .catch(() => errResponse(COMPONENT, dir, 'not found')));

  return Promise.all(promises);
}


function errResponse(component, label, error) {
  return {
    status: 'ERROR',
    component,
    label,
    error,
  };
}

function successResponse(component, label) {
  return {
    status: 'OK',
    component,
    label,
  };
}
