const fs = require('fs');
const events = require('events');
const stream = require('stream');
const util = require('util');
const crypto = require('crypto');

function fileWriter(path) {
  events.EventEmitter.call(this);

  const that = this;

  let ival = false;
  let buf = [];
  let descriptor = null;
  let isClosed = false;
  let closeCallback = null;
  let writtenBytes = 0;
  let inWrite = false;
  this.open = function open() {
    fs.open(path, 'w', '0644', (err, fd) => {
      if (err) {
        return;
      }
      descriptor = fd;
      fireInterval();
    });
  };

  this.abort = function abort() {
    if (descriptor) {
      fs.close(descriptor);
      descriptor = null;
    }
  };

  this.close = function close(callback) {
    isClosed = true;
    closeCallback = callback;
  };

  this.write = function write(chunk) { buf.push(chunk); };

  this.bytesWritten = function bytesWritten() { return writtenBytes; };

  function fireInterval() {
    if (!descriptor) return;
    ival = setInterval(() => {
      if (inWrite) return;
      if (buf.length) {
        let size = 0;
        buf.forEach((v) => { size += v.length; });

        const b = Buffer.alloc(size);
        let offset = 0;

        buf.forEach((v) => {
          v.copy(b, offset, 0, v.length);
          offset += v.length;
        });
        buf = [];
        inWrite = true;
        fs.write(descriptor, b, 0, b.length, null, (e, bc) => {
          if (e) {
            inWrite = false;
            return;
          }
          writtenBytes += bc;
          inWrite = false;
          that.emit('data', b);
        });
      } else if (isClosed) {
        fs.close(descriptor, function onClose() {
          if (closeCallback) { closeCallback.call(this, writtenBytes); }
          clearInterval(ival);
          that.emit('end');
        });
      }
    }, 100);
  }
};

exports.fileWriter = fileWriter;

// inherit events.EventEmitter
exports.fileWriter.super_ = events.EventEmitter;
exports.fileWriter.prototype = Object.create(events.EventEmitter.prototype, {
  constructor: {
    value: fileWriter,
    enumerable: false,
  },
});

exports.bufferSum = function bufferSum(buffers) {
  let size = 0;
  let offset = 0;
  buffers.forEach((v) => { size += v.length; });
  const b = Buffer.alloc(size);
  buffers.forEach((v) => {
    v.copy(b, offset, 0, v.length);
    offset += v.length;
  });
  return b;
};


function md5FileInternal(filename, callback) {
  const sum = crypto.createHash('md5');
  const s = fs.ReadStream(filename);
  s.on('data', (d) => { sum.update(d); });
  s.on('end', () => { callback(null, sum.digest('hex')); });
}

exports.md5_file = md5FileInternal;

function sha1FileInternal(filename, callback) {
  const shasum = crypto.createHash('sha1');
  const s = fs.ReadStream(filename);
  s.on('data', (d) => { shasum.update(d); });
  s.on('end', () => { callback(null, shasum.digest('hex')); });
}

exports.sha1_file = sha1FileInternal;

exports.fileCache = function fileCache(options) {
  const cache = {
    files: {},
    stats: {},
  };

  const settings = { bypass: false, ...options };
  function cacheEntry(data) {
    return { data, timestamp: new Date().getTime() };
  }
  function CachedReadStream(data) {
    let pause = true;
    const d = data.slice();
    const that = this;
    this.setEncoding = function setEncoding() {};
    this.readable = true;
    this.destroy = function destroy() {};
    this.pause = function onpause() { pause = true; };
    this.resume = function onresume() { pause = false; process.nextTick(sendOne); };
    function sendOne() {
      if (pause) return null;
      if (d.length) {
        that.emit('data', d.shift());
        if (d.length) return process.nextTick(sendOne);
        that.emit('end');
        that.emit('close');
      }
      return null;
    }
    this.resume();
  }
  util.inherits(CachedReadStream, stream.Stream);

  function dupReadStream(file, key, optss) {
    const localstream = fs.createReadStream(file, optss);
    if (settings.bypass) return localstream;
    const data = [];
    localstream.on('data', (d) => { data.push(d); });
    localstream.on('close', () => { cache.files[key] = cacheEntry(data); });
    return localstream;
  }

  return {
    createReadStream(file, opts) {
      // eslint-disable-next-line no-param-reassign
      opts = opts || {};
      let key = file;
      if (options.start) { key += `^s${opts.start}`; }
      if (options.end) { key += `^e${opts.end}`; }
      if (cache.files[key]) {
        return new CachedReadStream(cache.files[key].data);
      }
      return dupReadStream(file, key, options);
    },
    stat(file, then) {
      if (cache.stats[file]) {
        then.apply(this, cache.stats[file].data);
        return;
      }
      fs.stat(file, function onstat(...args) {
        const entry = cacheEntry(Array.prototype.slice.call(args));
        then.apply(this, entry.data);
        if (!settings.bypass) {
          cache.stats[file] = entry;
        }
      });
    },
    readFile(file, e, c) {
      const callback = c || e;
      if (!cache.files[file]) {
        // eslint-disable-next-line no-inner-declarations
        function then(err, data) {
          process.nextTick(() => {
            callback.call(this, err, data);
          });
          if (!settings.bypass) {
            cache.files[file] = cacheEntry({ data, err });
          }
        }
        if (c) fs.readFile(file, e, then);
        else fs.readFile(file, then);
      } else {
        process.nextTick(function onNextTick() {
          callback.call(this, cache.files[file].data.err, cache.files[file].data.data);
        });
      }
    },
    getCache() { return cache; },
  };
};


exports.writeStream = function writeStream(outputstream, filename, then) {
  const writer = fs.createWriteStream(filename);
  writer.on('close', then);
  writer.on('error', then);
  outputstream.pipe(writer);
};
