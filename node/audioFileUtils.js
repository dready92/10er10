/* eslint-disable consistent-return */
const { exec } = require('child_process');
const fs = require('fs');
const musicmetadata = require('musicmetadata');
const d10 = require('./d10');

const debug = d10.debug('d10:audioFileUtils');

exports.oggLength = function oggLength(file, cb) {
  exec(`${d10.config.cmds.ogginfo} ${file}`, { maxBuffer: 2000 * 1024 }, (err, stdout) => {
    if (stdout.length) {
      const back = stdout.match(/Playback length: ([0-9]+)m:([0-9]+)/);
      if (!back) {
        cb('no match');
        return;
      }
      if (back.length > 2) {
        return cb(null, back);
      }
    }
    if (err !== null) {
      return cb(err);
    }
    return cb('no match');
  });
};

exports.extractTags = function extractTags(file, cb) {
  const stream = fs.createReadStream(file);
  const back = {
    ALBUM: '', ARTIST: '', TRACKNUMBER: '', TITLE: '', GENRE: '', DATE: '', PICTURES: [],
  };

  musicmetadata(stream, {}, (err, result) => {
    if (err) {
      return cb(err);
    }

    debug(`[${file}] debug id3tags: `);
    Object.keys(result).forEach((r) => {
      if (r !== 'picture') {
        debug(r, result[r]);
      }
    });

    if (result.picture && Array.isArray(result.picture) && result.picture.length) {
      debug('this song got picture');
    }

    if (result.artist && Array.isArray(result.artist) && result.artist.length) {
      back.ARTIST = result.artist.pop();
    }
    if (result.title) {
      back.TITLE = result.title;
    }
    if (result.album) {
      back.ALBUM = result.album;
    }
    if (result.track && result.track.no) {
      back.TRACKNUMBER = result.track.no;
    }
    if (result.genre && Array.isArray(result.genre) && result.genre.length) {
      back.GENRE = result.genre.pop();
    }
    if (result.year) {
      back.DATE = result.year;
    }
    if (result.picture && Array.isArray(result.picture) && result.picture.length) {
      back.PICTURES = result.picture;
    }
    return cb(null, back);
  });
};

exports.escapeShellArg = function escapeShellArg(s) {
  return `'${s.replace(/'/g, "'\\''")}'`;
};

exports.setOggtags = function setOggtags(file, tags, cb) {
  if (!d10.count(tags)) {
    return cb(null, tags);
  }
  const args = [];
  Object.keys(tags).forEach(index => args.push(`-t ${exports.escapeShellArg(`${index}=${tags[index]}`)}`));
  exec(`${d10.config.cmds.vorbiscomment} -w ${args.join(' ')} ${file}`, (err) => {
    if (err) {
      return cb(err);
    }
    cb(null, tags);
  });
};

exports.isOggFileType = function isOggFileType(mimeType) {
  return mimeType === 'application/ogg' || mimeType === 'audio/ogg';
};
