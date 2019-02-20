const fs = require('fs');
const { spawn } = require('child_process');
const d10 = require('../d10');
const files = require('../files');
const audioUtils = require('../audioFileUtils');
const Job = require('./song-processor/job');

const debug = d10.debug('d10:song-processor');

function processSong(songId, songFilename, songFilesize, userId, readableStream, emitter) {
  /* do we already sent back a songProcessor:end event */
  let answered = false;
  function safeErrResp(code, data) {
    job.dumpTasksStatus();
    debug(songId, ' sending errorResponse ', code);
    debug(songId, data);
    if (answered) { return false; }
    answered = true;
    if (job.requestEnd) {
      sendErr(code, data);
    } else {
      readableStream.on('end', () => sendErr(code, data));
    }

    return true;
  }

  function sendErr(code, data) {
    emitter.emit('end', {
      userId,
      songId,
      status: 'error',
      code,
      data,
    });
  }

  function safeSuccessResp(data) {
    if (answered) { return false; }
    answered = true;
    emitter.emit('end', {
      userId,
      songId,
      status: 'success',
      data,
      code: 200,
    });

    return true;
  }

  function bytesCheck() {
    const min = 5000;
    debug(songId, job.fileWriter.bytesWritten());
    if (job.fileWriter.bytesWritten() > min) {
      clearInterval(bytesIval);
      bytesIval = null;
      job.run('fileType');
    }
  }

  let bytesIval = null; // bytes checker interval

  const job = new Job(userId, songId, songFilename, songFilesize, readableStream, emitter);

  job.complete('oggEncode', (err) => {
    if (err) {
      debug(songId, 'SEVERE: error on oggEncode task', err);
      job.allComplete(() => safeErrResp(422, err));
    } else {
      job.internalEmitter.emit('oggAvailable', []);
    }
  });
  job.complete('fileType', (err, resp) => {
    debug(songId, 'filetype complete : ', resp);
    if (err) {
      job.allComplete(() => { safeErrResp(421, err); });
    }
    if (resp === 'audio/mpeg') {
      job.decoder = spawn(d10.config.cmds.lame, d10.config.cmds.lame_opts);
      job.addChildProcess(job.decoder);
      job.run('oggEncode');
      //              job.run("fileMeta");
    } else if (resp === 'audio/x-flac') {
      job.decoder = spawn(d10.config.cmds.flac, d10.config.cmds.flac_opts);
      job.addChildProcess(job.decoder);
      job.run('oggEncode');
    } else if (resp === 'audio/mp4' || resp === 'audio/x-m4a') {
      debug(songId, "It's m4a, will launch decoder later");
    } else {
      job.inputFileBuffer.status = false;
      job.inputFileBuffer.buffer = [];
      if (!audioUtils.isOggFileType(resp)) {
        job.allComplete(() => { safeErrResp(415, resp); });
      }
    }
  });

  job.internalEmitter.on('uploadCompleteAndFileTypeAvailable', () => {
    if (job.tasks.fileType.response === 'audio/mp4' || job.tasks.fileType.response === 'audio/x-m4a') {
      const args = d10.config.cmds.faad_opts.join('\n').split('\n');
      args.push(`${d10.config.audio.tmpdir}/${job.fileName}`);
      job.decoder = spawn(d10.config.cmds.faad, args);
      job.decoder.on('error', (data) => {
        debug(songId, `error: ${data}`);
      });
      job.decoder.stderr.on('data', (data) => {
        debug(songId, `stderr: ${data}`);
      });
      job.addChildProcess(job.decoder);
      job.run('oggEncode');
    }
  });

  // eslint-disable-next-line consistent-return
  job.complete('sha1File', (err) => {
    if (err) {
      return safeErrResp(433, err);
    }
    job.run('sha1Check');
  });

  job.complete('sha1Check', (err) => {
    if (err) {
      safeErrResp(433, err);
      fs.unlink(`${d10.config.audio.tmpdir}/${job.fileName}`, () => {});
      job.complete('oggEncode', () => { fs.unlink(`${d10.config.audio.tmpdir}/${job.oggName}`, () => {}); });
      if (job.oggWriter && job.oggWriter.kill) {
        job.oggWriter.kill();
      }
    }
  });
  // eslint-disable-next-line consistent-return
  job.complete('moveFile', (err) => {
    if (err) {
      return safeErrResp(432, err);
    }
    if (!audioUtils.isOggFileType(job.tasks.fileType.response)) {
      // if the file is not an ogg we move it
      debug(songId, 'unlink file ', `${d10.config.audio.tmpdir}/${job.fileName}`);
      fs.unlink(`${d10.config.audio.tmpdir}/${job.fileName}`, () => {});
    }
    if (job.tasks.fileMeta.status === null) {
      job.complete('fileMeta', () => { job.run('cleanupTags'); });
    } else {
      job.run('cleanupTags');
    }
  });

  job.complete('cleanupTags', () => {
    job.run('createDocument');
    job.run('applyTagsToFile');
  });

  job.complete('createDocument', (err, resp) => {
    if (err) {
      safeErrResp(432, err);
      cleanupFileSystem();
      return;
    }
    debug(songId, 'db document recorded, sending success');
    safeSuccessResp(resp);
  });


  job.internalEmitter.once('oggAvailable', () => {
    debug(songId, 'OGG FILE IS AVAILABLE ! ');
    job.run('oggLength');
    const steps = ['oggLength', 'sha1File', 'fileMeta'];
    let complete = 0;
    function onAllComplete() {
      if (job.tasks.sha1File.err) {
        safeErrResp(503, job.tasks.sha1File.err);
      } else if (job.tasks.oggLength.err || job.tasks.oggLength.response === 0) {
        safeErrResp(436, job.tasks.oggLength.err);
      } else {
        debug(songId, 'GOT EVERYTHING I NEED TO PROCEED WITH RECORDING OF THE SONG');

        job.complete('sha1Check', (err) => {
          debug(songId, "sha1check is complete, let's go recording the song !");
          if (!err) {
            job.run('moveFile');
          }
        });
        job.run('sha1Check');
      }
    }
    steps.forEach((v) => {
      if (job.tasks[v].status === false) {
        // eslint-disable-next-line no-plusplus
        complete++;
      } else {
        job.complete(v, () => {
          // eslint-disable-next-line no-plusplus
          complete++;
          job.dumpTasksStatus();
          if (complete === steps.length) {
            onAllComplete();
          }
        });
        if (job.tasks[v].status === null) {
          job.run(v);
        }
      }
    });
    if (complete === steps.length) {
      onAllComplete();
    }
  });

  readableStream.on('error', () => {
    debug(songId, 'request ERROR !');
    cleanupFileSystem();
  });

  readableStream.on('close', () => {
    debug(songId, 'request CLOSE !');
    if (!job.requestEnd) {
      cleanupFileSystem();
    }
  });

  function cleanupFileSystem() {
    job.clearProcesses();
    fs.unlink(`${d10.config.audio.tmpdir}/${job.oggName}`, () => {});
    fs.unlink(`${d10.config.audio.tmpdir}/${job.fileName}`, () => {});
  }

  readableStream.on('end', () => {
    job.requestEnd = true;
    debug(songId, 'got readableStream end');
    if (bytesIval) { clearInterval(bytesIval); }
    if (job.fileWriter) {
      if (job.tasks.fileType.status === null) {
        job.fileWriter.close(() => {
          debug(songId, 'launching fileType job after filewriter close');
          job.run('fileType');
        });
      } else {
        job.fileWriter.close();
      }
      emitter.emit('uploadEnd',
        {
          userId,
          songId,
        });
    } else {
      safeErrResp(400, 'Nothing sent');
    }
  });

  readableStream.on('data', (chunk) => {
    if (!job.fileWriter) {
      debug(songId, 'creating fileWriter');
      // eslint-disable-next-line new-cap
      job.fileWriter = new files.fileWriter(`${d10.config.audio.tmpdir}/${job.fileName}`);
      debug(songId, 'settings bytescheck interval');
      bytesIval = setInterval(bytesCheck, 500);
      job.fileWriter.open();

      // eslint-disable-next-line consistent-return
      job.fileWriter.on('end', () => {
        debug(songId, 'fileWriter end event');
        if (parseInt(songFilesize, 10) !== job.fileWriter.bytesWritten()) {
          return safeErrResp(421, `${songFilesize} != ${job.fileWriter.bytesWritten()}`);
        }
        job.bufferJoin = 20;

        job.run('sha1File');
        job.run('fileMeta');
        if (job.tasks.fileType.status === null) {
          job.complete('fileType', () => {
            job.internalEmitter.emit('uploadCompleteAndFileTypeAvailable');
            if (audioUtils.isOggFileType(job.tasks.fileType.response)) {
              job.internalEmitter.emit('oggAvailable', []);
            }
          });
        } else {
          if (audioUtils.isOggFileType(job.tasks.fileType.response)) {
            job.internalEmitter.emit('oggAvailable', []);
          }
          job.internalEmitter.emit('uploadCompleteAndFileTypeAvailable');
        }
      });
    }
    if (job.inputFileBuffer.status) { job.inputFileBuffer.buffer.push(chunk); }
    job.fileWriter.write(chunk);
  });
}

module.exports = processSong;
