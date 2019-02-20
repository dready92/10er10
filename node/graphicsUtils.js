const gm = require('gm');
const fs = require('fs');
const d10 = require('./d10');

const files = require('./files');

function getResizeSize(size, newLength, onlyDownScale) {
  if (onlyDownScale && size.width < newLength && size.height < newLength) {
    return false;
  }
  let newH;
  let newW;
  if (size.height > size.width) {
    newH = newLength;
    newW = size.width / size.height * newH;
  } else {
    newW = newLength;
    newH = size.height / size.width * newW;
  }
  newH = Math.round(newH);
  newW = Math.round(newW);
  if (!newH || !newW) {
    return false;
  }

  return { width: newW, height: newH };
}

function splitFileAndExtension(filename) {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex < 0) {
    return false;
  }
  return {
    name: filename.substr(0, dotIndex),
    extension: filename.substr((dotIndex + 1)),
  };
}

function recordAlternateSizes(tmpfile, targetdir, targetfile, size, onOtherSizesWritten) {
  const jobs = [];
  const targetFileAndExtension = splitFileAndExtension(targetfile);
  if (!targetFileAndExtension) {
    return onOtherSizesWritten();
  }

  d10.config.images.sizeSteps.forEach((step) => {
    const newSize = getResizeSize(size, step, true);
    if (newSize) {
      jobs.push((then) => {
        const targetfileName = exports.getAlternateFileName(targetfile, newSize);
        gm(tmpfile)
          .resize(newSize.width, newSize.height)
          .write(`${targetdir}/${targetfileName}`, (err) => {
            if (err) {
              return then('image manipulation error (writing modified image)');
            }
            return then(null, newSize, step);
          });
      });
    }
  });

  if (!jobs.length) {
    return onOtherSizesWritten();
  }

  const available = {};

  function loopMe() {
    if (!jobs.length) {
      return onOtherSizesWritten(null, available);
    }
    const job = jobs.pop();
    job((err, resp, step) => {
      if (!err && resp && step) {
        available[step] = resp;
      }
      loopMe();
    });
    return null;
  }

  loopMe();

  return null;
}

exports.getAlternateFileName = (filename, size) => {
  const targetFileAndExtension = splitFileAndExtension(filename);
  if (!targetFileAndExtension) {
    return false;
  }
  // somefile.250x245.jpg
  const targetfileName = `${targetFileAndExtension.name
  }.${
    size.width}x${size.height
  }.${targetFileAndExtension.extension}`;
  return targetfileName;
};

exports.resizeImage = (tmpfile, targetdir, targetfile, cb) => {
  gm(tmpfile).size((err, size) => {
    if (err) {
      cb('image manipulation error (get image size failed)');
      return;
    }
    if (!size.width || !size.height) {
      cb('image manipulation error (get image size returns null)');
    }
    let newH; let
      newW;
    if (size.height > size.width) {
      newH = d10.config.images.defaultSize;
      newW = size.width / size.height * newH;
    } else {
      newW = d10.config.images.defaultSize;
      newH = size.height / size.width * newW;
    }
    newH = Math.round(newH);
    newW = Math.round(newW);
    if (!newH || !newW) {
      cb('image manipulation error (new image size returns null)');
    }

    const onOtherSizesWritten = (_err, sizes) => {
      gm(tmpfile)
        .resize(newW, newH)
        .write(`${targetdir}/${targetfile}`, (err2) => {
          if (err2) {
            return cb('image manipulation error (writing modified image)');
          }
          return cb(null, sizes);
        });
    };

    recordAlternateSizes(tmpfile, targetdir, targetfile, size, onOtherSizesWritten);
  });
};

exports.imageFromMeta = (meta, then) => {
  if (meta && meta.PICTURES && meta.PICTURES.length) {
    const imgId = d10.uid();
    const imgName = `${imgId}.${meta.PICTURES[0].format}`;
    const imgTmp = `${d10.config.images.tmpdir}/${imgName}`;
    fs.writeFile(imgTmp, meta.PICTURES[0].data, (err) => {
      if (err) { then(err); }
      files.sha1_file(imgTmp, (err2, sha1) => {
        if (err2) { then(err2); }
        const sha1Value = sha1.split(' ', 2).shift();
        d10.couch.d10.view('images/sha1', { key: sha1Value }, (err3, view) => {
          if (err3) { return then(err2); }
          if (view.rows.length) {
            return then(null, { filename: view.rows[0].value, sha1: sha1Value });
          }
          exports.resizeImage(
            imgTmp,
            d10.config.images.dir,
            imgName,
            (err4, alternatives) => {
              if (err4) { return then(err); }
              return then(null, {
                filename: imgName,
                sha1: sha1Value,
                alternatives,
              });
            },
          );
        });
      });
    });
  } else {
    then({ message: 'no picture' });
  }
};
