const d10 = require('../../d10');
const EventEmitter = require('events').EventEmitter;
const taskOggEncode = require('./task-ogg-encode');
const taskFileType = require('./task-file-type');
const taskFileMeta = require('./task-file-meta');
const taskOggLength = require('./task-ogg-length');
const taskSha1File = require('./task-sha1-file');
const taskSha1Check = require('./task-sha1-check');
const taskCleanupTags = require('./task-cleanup-tags');
const taskMoveAlternativeFile = require('./task-move-alternative-file');
const taskMoveFile = require('./task-move-file');
const taskApplyTagsToFile = require('./task-apply-tags-to-file');
const taskCreateDocument = require('./task-create-document');

const debug = d10.debug('d10:song-processor:job');

class Job {
  constructor(userId, songId, songFilename, songFilesize, readableStream, emitter) {
    this.userId = userId;
    this.id = songId;
    this.songFilename = songFilename;
    this.songFilesize = songFilesize;
    this.readableStream = readableStream;
    this.emitter = emitter;
    this.internalEmitter = new EventEmitter();
    this.fileName = `${this.id}.mp3`;
    this.oggName = `${this.id}.ogg`;
    this.fileSha1 = null;
    this.oggLength = null;
    this.fileWriter = null;
    this.spawns = [];
    this.requestEnd = false;
    this.decoder = null;
    this.oggWriter = null;
    this.bufferJoin = 8;
    this.inputFileBuffer = {
      status: true,
      buffer: [],
    };
    this.tasks = {
      oggEncode: { status: null, run: taskOggEncode },
      fileType: { status: null, run: taskFileType },
      fileMeta: { status: null, run: taskFileMeta },
      oggLength: { status: null, run: taskOggLength },
      sha1File: { status: null, run: taskSha1File },
      sha1Check: { status: null, run: taskSha1Check },
      cleanupTags: { status: null, run: taskCleanupTags },
      moveAlternativeFile: { status: null, run: taskMoveAlternativeFile },
      moveFile: { status: null, run: taskMoveFile },
      applyTagsToFile: { status: null, run: taskApplyTagsToFile },
      createDocument: { status: null, run: taskCreateDocument },
    };
    this.queue = [];
    this.callbacks = {};
    this.allCompleteCallbacks = [];
  }

  run(taskName) {
    if (this.canRun(taskName)) {
      this.queue.push(taskName);
      debug(this.id, 'Launch task ', taskName);
      this.tasks[taskName].run.call(this, (err, resp) => {
        this.endOfTask(taskName, err, resp);
      });
    }
  }

  endOfTask(taskName, err, resp) {
    if (err) {
      debug(this.id, 'End of task ', taskName, ' in error:', err);
    } else {
      debug(this.id, 'End of task ', taskName, ' without error');
    }
    const i = this.queue.indexOf(taskName);
    if (i >= 0) {
      this.queue.splice(i, 1);
    }
    this.tasks[taskName].status = false;
    this.tasks[taskName].err = err;
    this.tasks[taskName].response = resp;
    this.internalEmitter.emit(`${taskName}:complete`, err, resp);
    if (this.allCompleteCallbacks.length && !this.running()) {
      this.allCompleteCallbacks.forEach((cb) => {
        cb.call(this);
      });
    }
  }

  complete(task, callback) {
    if (!this.tasks[task]) { return false; }
    if (this.tasks[task].status === false) {
      callback.call(this, this.tasks[task].err, this.tasks[task].response);
    }
    this.internalEmitter.on(`${task}:complete`, callback.bind(this));
    return true;
  }

  running() {
    return Object.keys(this.tasks)
      .filter(taskName => this.tasks[taskName].status === true).length;
  }

  canRun(taskName) {
    return this.tasks[taskName] &&
      this.tasks[taskName].status === null &&
      this.queue.indexOf(taskName) < 0;
  }

  allComplete(callback) {
    if (this.running()) {
      this.allCompleteCallbacks.push(callback);
    } else {
      callback.call(this);
    }
  }
}

module.exports = Job;
