var d10 = require ("../d10"),
    querystring = require("querystring"),
    fs = require("fs"),
    files = require("../files"),
    when = require("../when"),
    audioUtils = require("../audioFileUtils"),
    gu = require("../graphicsUtils"),
    spawn = require('child_process').spawn,
    exec = require('child_process').exec,
    EventEmitter = require("events").EventEmitter,
    debug = d10.debug("d10:song-processor");

function processSong(songId, songFilename, songFilesize, userId, readableStream, emitter) {

  /* do we already sent back a songProcessor:end event */
  var answered = false;
  var safeErrResp = function(code,data) {
      printEncodingFailure();
      debug(songId," sending errorResponse ",code);
      debug(songId,data);
      if ( answered ) { return false;}
      answered = true;
      if ( job.requestEnd ) {_sendErr(code,data);}
      else    { readableStream.on("end",function() {_sendErr(code,data)}); }
  };

  var _sendErr = function(code, data) {
    emitter.emit("end",
                 {
                   userId: userId,
                   songId: songId,
                   status: "error",
                   code: code,
                   data: data
                 }
            );
  };

  var safeSuccessResp = function(data) {
    if ( answered ) { return false;}
    answered = true;
    emitter.emit("end",
                  {
                    userId: userId,
                    songId: songId,
                    status: "success",
                    data: data,
                    code: 200
                  }
            );
  };

  var bytesCheck = function() {
      var min = 5000;
      debug(songId,job.fileWriter.bytesWritten());
      if ( job.fileWriter.bytesWritten() > min ) {
          clearInterval(bytesIval);
          bytesIval = null;
          job.run("fileType");
      }
  };

  var uploadComplete = false, // the flag telling if the data uploaded is complete
      bytesIval = null   // bytes checker interval
      ;
  var internalEmitter = new EventEmitter();
  var job = {
      readableStream: readableStream,
      id: songId,
      userId: userId,
      songFilename: songFilename,
      songFilesize: songFilesize,
      emitter: emitter,
      fileName: songId+".mp3",
      fileSha1: null,
      oggName: songId+".ogg",
      oggLength: null,
      fileWriter: null,
      spawns: [],
      requestEnd: false,
      decoder: null,
      oggWriter: null,
      bufferJoin: 8,
      inputFileBuffer: {status: true, buffer: []},
      tasks: {
          oggEncode: {
              status: null, // null (rien), true (running) or false (stopped)
              run: require("./song-processor/task-ogg-encode")
          },
          fileType: {
              status: null,
              run: require("./song-processor/task-file-type")
          },
          fileMeta: {
              status: null,
              run: require("./song-processor/task-file-meta")
          },
          oggLength: {
              status: null,
              run: require("./song-processor/task-ogg-length")
          },
          sha1File: {
              status: null,
              run: require("./song-processor/task-sha1-file")
          },
          sha1Check: {
              status: null,
              run: require("./song-processor/task-sha1-check")
          },
          cleanupTags: {
              status: null,
              run: require("./song-processor/task-cleanup-tags")
          },
          moveAlternativeFile: {
            status: null,
            run: require("./song-processor/task-move-alternative-file")
          },
          moveFile: {
              status: null,
              run: require("./song-processor/task-move-file")
          },
          applyTagsToFile: {
              status: null,
              run: require("./song-processor/task-apply-tags-to-file")
          },
          createDocument: {
              status: null,
              run: require("./song-processor/task-create-document")
          }
      },
      queue: [],
      run: function(taskName) {
          if ( this.tasks[taskName] && this.tasks[taskName].status === null &&  this.queue.indexOf(taskName) < 0 ) {
              this.queue.push(taskName);
              debug(songId,"Launch task ", taskName);
              this.tasks[taskName].run.call(this, function(err,resp) { job.endOfTask.call(job,taskName,err,resp); });
          }
      },
      endOfTask: function(taskName, err,resp) {
          if ( err ) {
            debug(songId, "End of task ",taskName," in error:", err);
          } else {
            debug(songId, "End of task ",taskName," without error");
          }
          var i = this.queue.indexOf(taskName);
          if ( i >= 0 ) {
              this.queue.splice(i,1);
          }
          this.tasks[taskName].status = false;
          this.tasks[taskName].err = err;
          this.tasks[taskName].response = resp;
          internalEmitter.emit(taskName+":complete",err,resp);
          if ( this.allCompleteCallbacks.length && !this.running() ) {
              while ( cb = this.allCompleteCallbacks.shift() ) {
                  cb.call(this);
              }
          }
      },
      callbacks: {},
      complete: function(task, cb) {
          if ( !this.tasks[task] ) { return false; }
          if ( this.tasks[task].status === false ) {
              cb.call(this,this.tasks[task].err, this.tasks[task].response);
          }
          internalEmitter.on(task+":complete",cb.bind(this));
      },
      running: function() {
          var count = 0;
          for ( var t in this.tasks ) {
              if ( this.tasks[t].status === true ) count++;
          }
          return count;
      },
      allCompleteCallbacks: [],
      allComplete: function(cb) {
          if ( this.running() ) {
              this.allCompleteCallbacks.push(cb);
          } else {
              cb.call(this);
          }
      }
  };

  var printEncodingFailure = function() {
      debug(songId,"--------- Encoding failure ----------");
      for ( var i in job.tasks ) {
          debug(songId, i, job.tasks[i].err ? job.tasks[i].err : "");
      }
      debug(songId,"-------------------------------------");

  };

  job.complete("oggEncode",function(err,resp) {
      if ( err ) {
          debug(songId,"SEVERE: error on oggEncode task",err);
          job.allComplete(function() { safeErrResp(422,err); });
      } else {
          internalEmitter.emit("oggAvailable",[]);
      }
  });
  job.complete("fileType",function(err,resp) {
      debug(songId,"filetype complete : ",resp);
      if ( err ) {
          job.allComplete(function() { safeErrResp(421,err); });
      }
      if ( resp == "audio/mpeg" ) {
          job.decoder = spawn(d10.config.cmds.lame, d10.config.cmds.lame_opts);
          job.spawns.push(job.decoder);
          job.run("oggEncode");
  //              job.run("fileMeta");
      } else if ( resp == "audio/x-flac" ) {
          job.decoder = spawn(d10.config.cmds.flac, d10.config.cmds.flac_opts);
          job.spawns.push(job.decoder);
          job.run("oggEncode");
      } else if (resp === "audio/mp4" || resp === "audio/x-m4a") {
          debug(songId, "It's m4a, will launch decoder later");
      } else {
          job.inputFileBuffer.status = false;
          job.inputFileBuffer.buffer = [];
          if ( !audioUtils.isOggFileType(resp) ) {
              job.allComplete(function() { safeErrResp(415,resp); });
          }
      }
  });

  internalEmitter.on("uploadCompleteAndFileTypeAvailable", function() {
      if (job.tasks.fileType.response === "audio/mp4" || job.tasks.fileType.response === "audio/x-m4a") {
          var args = d10.config.cmds.faad_opts.join("\n").split("\n");
          args.push(d10.config.audio.tmpdir+"/"+job.fileName);
          job.decoder = spawn(d10.config.cmds.faad, args);
          job.decoder.on('error', (data) => {
              debug(songId, 'error: ' + data);
          });
          job.decoder.stderr.on('data', function (data) {
              debug(songId,'stderr: ' + data);
          });
          job.spawns.push(job.decoder);
          job.run("oggEncode");
      }
  });

  job.complete("sha1File",function(err,resp) {
      if ( err ) {
          return safeErrResp(433,err);
      }
      job.run("sha1Check");
  });

  job.complete("sha1Check",function(err,resp) {
      if ( err ) {
          safeErrResp(433,err);
          fs.unlink(d10.config.audio.tmpdir+"/"+job.fileName, () => {});
          job.complete("oggEncode",function() {fs.unlink(d10.config.audio.tmpdir+"/"+job.oggName, () => {});});
          if ( job.oggWriter && job.oggWriter.kill ) {
            job.oggWriter.kill();
          }
          return ;
      }
  });
  job.complete("moveFile",function(err,resp) {
      if ( err ) {
          return safeErrResp(432,err);
      }
      if ( !audioUtils.isOggFileType(job.tasks.fileType.response) ) { // if the file is not an ogg we move it
          debug(songId, "unlink file ",d10.config.audio.tmpdir+"/"+job.fileName);
          fs.unlink(d10.config.audio.tmpdir+"/"+job.fileName,function()  {});
      }
      if ( job.tasks.fileMeta.status === null ) {
          job.complete("fileMeta",function() {  job.run("cleanupTags"); });
      } else {
          job.run("cleanupTags");
      }
  });

  job.complete("cleanupTags",function(err,resp) {
      job.run("createDocument");
      job.run("applyTagsToFile");
  });

  job.complete("createDocument",function(err,resp) {
    if ( err ) {
      safeErrResp(432,err);
      cleanupFileSystem();
      return;
    }
    debug(songId,"db document recorded, sending success");
    safeSuccessResp(resp);
  });


  internalEmitter.once("oggAvailable",function() {
      debug(songId,"OGG FILE IS AVAILABLE ! ");
      job.run("oggLength");
      var steps = ["oggLength","sha1File","fileMeta"],
          complete = 0,
          onAllComplete = function() {
              if ( job.tasks.sha1File.err ) {
                  safeErrResp(503,job.tasks.sha1File.err);
              } else if ( job.tasks.oggLength.err || job.tasks.oggLength.response == 0 ) {
                  safeErrResp(436,job.tasks.oggLength.err);
              } else {
                  debug(songId,"GOT EVERYTHING I NEED TO PROCEED WITH RECORDING OF THE SONG");

                  job.complete("sha1Check",function(err,resp) {
                      debug(songId,"sha1check is complete, let's go recording the song !");
                      if ( !err ){
                          job.run("moveFile");
                      }
                  });
                  job.run("sha1Check");
              }
          };
      steps.forEach(function(v,k) {
          if ( job.tasks[v].status === false ) {
              complete++;
          } else {
              job.complete(v,function() {
                  complete++;
                  if ( complete == steps.length ) {
                      onAllComplete();
                  }
              });
              if ( job.tasks[v].status === null ) {
                  job.run(v);
              }

          }
      });
      if ( complete == steps.length ) {
          onAllComplete();
      }
  });

  readableStream.on("error",function(){
      debug(songId,"request ERROR !");
      cleanupFileSystem();
  });

  readableStream.on("close",function(){
      debug(songId,"request CLOSE !");
      if ( ! job.requestEnd ) {
        cleanupFileSystem();
      }
  });
  var cleanupFileSystem = function() {
      if ( job.spawns.length ) {
          var j;
          while ( j = job.spawns.pop() ) {
              try {
                  j.kill();
              } catch(e) {}
          }
      }

      if ( job.oggWriter ) {
          job.oggWriter.kill();
      }
      fs.unlink(d10.config.audio.tmpdir+"/"+job.oggName);
      fs.unlink(d10.config.audio.tmpdir+"/"+job.fileName);
  };

  readableStream.on("end",function() {
      job.requestEnd = true;
      debug(songId,"got readableStream end");
      if ( bytesIval ) { clearInterval(bytesIval); }
      if ( job.fileWriter  ) {
          if ( job.tasks.fileType.status === null ) {
              job.fileWriter.close(function() {
                  debug(songId,"launching fileType job after filewriter close");
                  job.run("fileType");
              });
          } else {
              job.fileWriter.close();
          }
          emitter.emit("uploadEnd",
                {
                  userId: userId,
                  songId: songId
                }
          );
      } else {
        safeErrResp(400, "Nothing sent");
      }
  });

  readableStream.on("data",function(chunk) {
      if ( !job.fileWriter  ) {

          debug(songId,"creating fileWriter");
          job.fileWriter  = new files.fileWriter(d10.config.audio.tmpdir+"/"+job.fileName);
          debug(songId,"settings bytescheck interval");
          bytesIval = setInterval(bytesCheck,500);
          job.fileWriter.open();

          job.fileWriter.on("end", function() {
              debug(songId,"fileWriter end event");
              if ( parseInt(songFilesize) != job.fileWriter.bytesWritten() ) {
                  return safeErrResp(421, songFilesize+" != "+n);
              }
              job.bufferJoin = 20;

              job.run("sha1File");
              job.run("fileMeta");
              uploadComplete = true;
              if ( job.tasks.fileType.status === null ) {
                  job.complete("fileType",function(err,resp) {
                      internalEmitter.emit("uploadCompleteAndFileTypeAvailable");
                      if ( audioUtils.isOggFileType(job.tasks.fileType.response) ) {
                        internalEmitter.emit("oggAvailable",[]);
                      }
                  });
              } else {
                  if ( audioUtils.isOggFileType(job.tasks.fileType.response) ) {
                    internalEmitter.emit("oggAvailable",[]);
                  }
                  internalEmitter.emit("uploadCompleteAndFileTypeAvailable");
              }
          });
      }
      if ( job.inputFileBuffer.status ) { job.inputFileBuffer.buffer.push(chunk); }
      job.fileWriter.write(chunk);
  });
};

exports = module.exports = processSong;
