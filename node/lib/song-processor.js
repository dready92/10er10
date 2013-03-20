
function processSong(songId, songFilename, songFilesize, userId readableStream, emitter) {
  
  /* do we already sent back a songProcessor:end event */
  var answered = false;
  var safeErrResp = function(code,data) {
      printEncodingFailure();
      d10.log("debug",songId," sending errorResponse ",code);
      d10.log("debug",songId,data);
      if ( answered ) { return false;}
      answered = true;
      if ( job.requestEnd ) {_sendErr(code,data);}
      else    { readableStream.on("end",function() {_sendErr(code,data)}); }
  };
  
  var _sendErr = function(code, data) {
    emitter.emit(songId+":songProcessor:end",
                 {
                   status: "error",
                   code: code,
                   data: data
                 }
            );
  };

  var safeSuccessResp = function(data) {
    if ( answered ) { return false;}
    answered = true;
    emitter.emit(songId+":songProcessor:end",
                  {
                    status: "success",
                    data: data
                  }
            );
  };

  var bytesCheck = function() {
      var min = 5000;
      d10.log("debug",songId,job.fileWriter.bytesWritten());
      if ( job.fileWriter.bytesWritten() > min ) {
          clearInterval(bytesIval);
          bytesIval = null;
          job.run("fileType");
      }
  };

  var uploadComplete = false, // the flag telling if the data uploaded is complete
      bytesIval = null,   // bytes checker interval
      ; 
  var internalEmitter = new EventEmitter();
  var job = {
      id: songId,
      fileName: songId+".mp3",
      fileType: null,
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
              run: function(then) {
                  d10.log("debug",songId,"-----------------------------------------------");
                  d10.log("debug",songId,"-------      Create OGG encoding        -------");
                  d10.log("debug",songId,"-----------------------------------------------");
                  if ( !job.decoder ) {
                      d10.log("debug",songId,"error: job.decoder not set");
                      then({message: "decoder not initialized"});
                      return ;
                  }
                  var args = d10.config.cmds.oggenc_opts.slice();
                  args.push(d10.config.audio.tmpdir+"/"+this.oggName,"-");

                  job.oggWriter = spawn(d10.config.cmds.oggenc, args);
                  job.oggWriter.on("exit",function(code) {
                      d10.log("debug",songId,"launching oggWriter end of operation callback");
                      then(code ? code : null,null);
                  });
                  job.decoder.on("exit",function() { d10.log("debug","job.decoder exited"); });
                  job.oggWriter.stdin.on("error",function(err) {console.log("Oggwriter error",err);});
                  job.decoder.stdout.pipe(job.oggWriter.stdin);
                  function writeBuffer() {
                      if ( ! job.inputFileBuffer.buffer.length ) {
                          if ( job.requestEnd ) {
                              job.decoder.stdin.end();
                          } else {
                              d10.log("debug",songId,"================= Decoder pumping from request ===============");
                              readableStream.on("error",function(err) {console.log("request error", err);});
                              request.pipe(job.decoder.stdin);
                              job.inputFileBuffer.status = false;
                          }
                          return ;
                      }
                      
                      d10.log("debug",songId,"Size: ",job.inputFileBuffer.buffer.length," bufferJoin: ",job.bufferJoin);
                      var buffer = files.bufferSum(
                          job.inputFileBuffer.buffer.splice(0, job.inputFileBuffer.buffer.length <= job.bufferJoin ? job.inputFileBuffer.buffer.length : job.bufferJoin)
                      );
                      var writeOk = job.decoder.stdin.write(buffer);
                      if ( writeOk ) { writeBuffer(); } 
                      else {
                          job.decoder.stdin.once("drain",function() {writeBuffer();});
                      }
                  };
                  if ( job.tasks.fileType.response != "audio/mp4" ) {// faad does not support stdin streaming
                      writeBuffer();
                  }
              }
          },
          fileType: {
              status: null,
              run: function(then) {
                  if ( songFilename.match(/mp3$/i) ) {
                      job.fileType = "audio/mpeg";
                      return then(null,"audio/mpeg");
                  }
                  d10.fileType(d10.config.audio.tmpdir+"/"+this.fileName, function(err,type) {
                          if ( !err ) {
                              job.fileType = type;
                          }
                          then(err,type);
                      }
                  );
              }
          },
          fileMeta: {
              status: null,
              run: function(then) {
                  audioUtils.extractTags(d10.config.audio.tmpdir+"/"+this.fileName,function(err,cb) {
                      then(err,cb);
                  });
              }
          },
          oggLength: {
              status: null,
              run: function(then) {
                  var file = (this.tasks.fileType.response == "application/ogg" ) ? this.fileName : this.oggName ;
                  audioUtils.oggLength(d10.config.audio.tmpdir+"/"+file,function(err,len) {
                      if ( !err ) {
                          if ( len && len.length && len.length > 2 ) {
                              len = 60*parseInt(len[1],10) + parseInt(len[2],10);
                          }
                      }
                      then(err,len);
                  });
              }
          },
          sha1File: {
              status: null,
              run: function(then) {
                  files.sha1_file(d10.config.audio.tmpdir+"/"+this.fileName, function(err,resp) {
                      if ( !err ) {
                          resp = resp.split(" ",2).shift();
                      }
                      then(err,resp);
                  });
              }
          },
          sha1Check: {
              status: null,
              run: function(then) {
                  if ( this.tasks.sha1File.err ) {
                      return then(err);
                  } else if ( !this.tasks.sha1File.response || !this.tasks.sha1File.response.length ) {
                      return then("Sha1 not available");
                  }
                  d10.couch.d10.view("song/sha1",{key: this.tasks.sha1File.response}, function(err,resp) {
                      if ( err ) {
                          then(501);
                      } else if (!resp.rows || resp.rows.length) {
                          then(433);
                      } else {
                          then(null,null);
                      }
                  });
              }
          },
          cleanupTags: {
              status: null,
              run: function(then) {
  //                      if ( this.tasks.fileMeta.err ) {
  //                          cleanupFileSystem();
  //                          return ;
  //                      }
                  if ( !this.tasks.fileMeta.response ) { this.tasks.fileMeta.response={}; }
                  var tags = {};
                  var that=this;
                  
                  if ( this.tasks.fileMeta.response.GENRE ) {
                      var value = "";
                      d10.config.genres.forEach(function(v,k) {
                          if ( that.tasks.fileMeta.response.GENRE == v.toLowerCase() ) {
                              value=v;
                          }
                      });
                      tags.genre = value.length ? value : that.tasks.fileMeta.response.GENRE ;
                  }
                  
                  ['ALBUM','ARTIST','TITLE'].forEach(function(v,k) {
                      if ( that.tasks.fileMeta.response[v] ) {
                          tags[v] = d10.ucwords(that.tasks.fileMeta.response[v].toLowerCase());
                      }
                  });
                  ['ALBUM','TRACKNUMBER','ARTIST','TITLE','GENRE','DATE'].forEach(function(v,k) {
                      if ( that.tasks.fileMeta.response[v] ) { tags[v] = that.tasks.fileMeta.response[v]; }
                      else { tags[v] = null }
                  });
                  then(null,tags);
              }
          },
          moveAlternativeFile: {
            status: null,
            run: function(then) {
              
              if ( !d10.config.audio.keepOriginalFile ) {
                return then();
              }
              
              var c = this.id[2],
              filename = this.oggName,
              tmpFile = d10.config.audio.tmpdir+"/"+this.fileName,
              id = this.id,
              fileType = this.tasks.fileType.response,
              alternativeExtension = null;
              d10.log("debug",songId,"file type : ",fileType);
              if ( fileType == "audio/mpeg" ) {
                alternativeExtension = "mp3";
              } else if ( fileType == "audio/mp4" ) {
                alternativeExtension = "m4a";
              }
              if ( !alternativeExtension ) {
                return then();
              }
              var targetFile = d10.config.audio.dir+"/"+id[2]+"/"+id+"."+alternativeExtension;
              d10.log("debug",songId,"moveAlternativeFile : ",tmpFile," -> ",targetFile);
              fs.rename(
                tmpFile,
                targetFile,
                function(err,resp) {
                  if ( err ) {
                    return then(err);
                  }
                  return then(null, {type: fileType, extension: alternativeExtension});
                }
              );
            }
          },
          moveFile: {
              status: null,
              run: function(then) {
                  var c = this.id[2],
                      filename = this.oggName,
                      tmpFile = d10.config.audio.tmpdir+"/"+this.fileName,
                      id = this.id,
                      sourceFile = d10.config.audio.tmpdir+"/";
                      sourceFile+= (this.tasks.fileType.response == "application/ogg" ) ? this.fileName : this.oggName ;
                  d10.log("debug",songId,"moveFile : ",sourceFile," -> ",d10.config.audio.dir+"/"+c+"/"+filename);
                  var moveFile = function() {
                      fs.rename(
                          sourceFile,
                          d10.config.audio.dir+"/"+c+"/"+filename,
                          function(err,resp) {
                            if ( err ) {
                              return then(err);
                            }
                            job.complete("moveAlternativeFile",function() {
                              then(err,resp);
                            });
                            job.run("moveAlternativeFile");
                          }
                      );
                      
                  };
                  
                  fs.stat(d10.config.audio.dir+"/"+c,function(err,stat) {
                      if ( err ) {
                          d10.log("debug",songId,"moveFile", err);
                      }
                      if ( err && err.errno != 2 && err.code != "ENOENT" ) { // err.code == ENOENT = no such file on node > 0.5.10
                          then(err);
                      } else if ( err ) {
                          fs.mkdir(d10.config.audio.dir+"/"+c,0775, function(err,stat) {
                              if ( err ) {
                                  then(err);
                              } else {
                                  moveFile();
                              }
                          });
                      } else {
                          moveFile();
                      }
                  });
              }
          },
          applyTagsToFile: {
              status: null,
              run: function(then) {
                  var c = this.id[2];
                  audioUtils.setOggtags(d10.config.audio.dir+"/"+c+"/"+this.oggName,this.tasks.cleanupTags.response,function(err,cb) {
                      then(err,cb);
                  });
              }
          },
          createDocument: {
              status: null,
              run: function(then) {
                  
                  var resp = this.tasks.oggLength.response, duration = 0;
                  var sha1 = this.tasks.sha1File.response;
                  if ( 
                      Object.prototype.toString.call(resp) === '[object Array]' &&
                      resp.length > 2 && 
                      !isNaN(parseFloat(resp[1])) && 
                      !isNaN(parseFloat(resp[2])) 
                  ) {
                      duration = parseFloat(resp[1])*60 + parseFloat(resp[2]);
                  } else {
                      duration = this.tasks.oggLength.response;
                  }
                  
                  var doc = {
                      _id: this.id,
                      filename: songFilename,
                      sha1: sha1,
                      user: userId,
                      reviewed: false,
                      valid: false,
                      ts_creation: new Date().getTime(),
                      hits: 0,
                      duration: duration
                  };
                  if ( this.tasks.moveAlternativeFile.response ) {
                    doc.sourceFile = this.tasks.moveAlternativeFile.response;
                  }
                  for ( var index in this.tasks.cleanupTags.response ) {
                      var k = index.toLowerCase(),
                          v = this.tasks.cleanupTags.response[index];
                      if ( k == "date" || k == "tracknumber" ) {
                          doc[k] = parseFloat(v);
                          if ( isNaN(doc[k]) )    doc[k]=0;
                      } else {
                          doc[k] = v;
                      }
                  }
                  if ( typeof doc.title == "string" && doc.title.length &&
                      typeof doc.artist == "string" && doc.artist.length ) {
                      doc.valid = true;
                  }
                  
                  // test for tracknumber and get it from filename if possible
                  if ( doc.tracknumber == 0 ) {
                      var tracknumberFromFilename = doc.filename.match(/^[0-9]+/);
                      if ( tracknumberFromFilename ) {
                          doc.tracknumber = parseInt( tracknumberFromFilename[0] , 10);
                      }
                  }
                  
  //                          return then(null,doc);
                  var recordDoc = function() {
                    d10.couch.d10.view("song/sha1",{key: sha1}, function(err,resp) {
                        if ( err ) {
                            then(501);
                        } else if (!resp.rows || resp.rows.length) {
                            then(433);
                        } else {
                          d10.couch.d10.storeDoc(doc,function(err,resp) {
                            if ( err ) { then(err); }
                            else {
                              doc._rev = resp.rev;
                              then(null,doc);
                            }
                          });
                        }
                    });
                      
                  };

                  if ( this.tasks.fileMeta.response && this.tasks.fileMeta.response.PICTURES && this.tasks.fileMeta.response.PICTURES.length ) {
                      gu.imageFromMeta(this.tasks.fileMeta.response,function(err,resp) {
                          d10.log("debug",songId,"imageFromMeta response",err,resp);
                          if ( !err ) {
                              doc.images = [ resp ];
                          }
                          recordDoc();
                      });
                  } else {
                      recordDoc();
                  }
              }
          }
      },
      queue: [],
      run: function(taskName) {
          if ( this.tasks[taskName] && this.tasks[taskName].status === null &&  this.queue.indexOf(taskName) < 0 ) {
              this.queue.push(taskName);
              d10.log("debug",songId,"Launch task ", taskName);
              this.tasks[taskName].run.call(this, function(err,resp) { job.endOfTask.call(job,taskName,err,resp); });
          }
      },
      endOfTask: function(taskName, err,resp) {
          if ( err ) {
            d10.log("debug",songId, "End of task ",taskName," in error:", err);
          } else {
            d10.log("debug",songId, "End of task ",taskName," without error:");
          }
          var i = this.queue.indexOf(taskName);
          if ( i >= 0 ) {
              this.queue.splice(i,1);
          }
          this.tasks[taskName].status = false;
          this.tasks[taskName].err = err;
          this.tasks[taskName].response = resp;
          internalEmitter.emit(taskName+":complete",[err,resp]);
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
          internalEmitter.on(task+":complete",cb);
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
      d10.log("debug",songId,"--------- Encoding failure ----------");
      for ( var i in job.tasks ) {
          d10.log("debug", songId, i, job.tasks[i].err ? job.tasks[i].err : "");
      }
      d10.log("debug",songId,"-------------------------------------");

  };

  //      d10.log("debug","filename : ",job.fileName,"ogg name : ",job.oggName);
  job.complete("oggEncode",function(err,resp) {
      if ( err ) {
          d10.log("debug",songId,"SEVERE: error on oggEncode task",err);
          job.allComplete(function() { safeErrResp(422,err); });
      } else {
          internalEmitter.emit("oggAvailable",[]);
      }
  });
  job.complete("fileType",function(err,resp) {
      d10.log("debug",songId,"filetype complete : ",resp);
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
      } else if ( resp == "audio/mp4" ) {
          d10.log("debug",songId, "It's m4a, will launch decoder later");
      } else {
          job.inputFileBuffer.status = false;
          job.inputFileBuffer.buffer = [];
          if ( resp != "application/ogg" ) {
              job.allComplete(function() { safeErrResp(415,resp); });
          }
      }
  });

  readableStream.on("uploadCompleteAndFileTypeAvailable", function() {
      if ( job.tasks.fileType.response == "audio/mp4" ) {
          var args = d10.config.cmds.faad_opts.join("\n").split("\n");
          args.push(d10.config.audio.tmpdir+"/"+job.fileName);
          job.decoder = spawn(d10.config.cmds.faad, args);
          job.decoder.stderr.on('data', function (data) {
              d10.log("debug",songId,'stderr: ' + data);
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
          fs.unlink(d10.config.audio.tmpdir+"/"+job.fileName);
          job.complete("oggEncode",function() {fs.unlink(d10.config.audio.tmpdir+"/"+job.oggName);});
          if ( job.oggWriter && job.oggWriter.kill ) {
            job.oggWriter.kill();
          }
          return ;
      }
  });
  job.complete("moveFile",function(err,resp) {
  //          d10.log("debug","moveFile finished");
      if ( err ) {
          return safeErrResp(432,err);
      }
      if ( job.tasks.fileType.response != "application/ogg" ) { // if the file is not an ogg we move it
          d10.log("debug",songId, "unlink file ",d10.config.audio.tmpdir+"/"+job.fileName);
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
    d10.log("debug",songId,"db document recorded, sending success");
    safeSuccessResp(resp);
  });


  internalEmitter.once("oggAvailable",function() {
      d10.log("debug",songId,"OGG FILE IS AVAILABLE ! ");
      job.run("oggLength");
      var steps = ["oggLength","sha1File","fileMeta"],
          complete = 0,
          onAllComplete = function() {
              if ( job.tasks.sha1File.err ) {
                  safeErrResp(503,job.tasks.sha1File.err);
              } else if ( job.tasks.oggLength.err || job.tasks.oggLength.response == 0 ) {
                  safeErrResp(436,job.tasks.oggLength.err);
              } else {
                  d10.log("debug",songId,"GOT EVERYTHING I NEED TO PROCEED WITH RECORDING OF THE SONG");
                  
                  job.complete("sha1Check",function(err,resp) {
                      d10.log("debug",songId,"sha1check is complete, let's go recording the song !");
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
      d10.log("debug",songId,"request ERROR !");
      d10.log("debug",songId,arguments);
      cleanupFileSystem();
  });

  readableStream.on("close",function(){
      d10.log("debug",songId,"request CLOSE !");
      d10.log("debug",songId);
      if ( ! job.requestEnd ) {
        cleanupFileSystem();
      }
  });
/*
  request.connection.on("error",function(){
      d10.log("debug",songId,"request connection ERROR !");
      d10.log("debug",songId,arguments);
  });
*/
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
  /*
  request.connection.on("close",function(err){
      d10.log("debug",songId,"request connection CLOSE !");
      d10.log("debug",songId,arguments);
      d10.log("debug",songId,"requestEnd",job.requestEnd);
      if ( job.requestEnd === false ) {
          // client connection failed to send us the complete data
          cleanupFileSystem();
      }
  });
  */
  readableStream.on("end",function() {
      job.requestEnd = true;
      d10.log("debug",songId,"got request end");
      if ( bytesIval ) { clearInterval(bytesIval); }
      if ( job.fileWriter  ) {
          if ( job.tasks.fileType.status === null ) {
              job.fileWriter.close(function() {
                  d10.log("debug",songId,"launching fileType job after filewriter close");
                  job.run("fileType");
              });
          } else {
              job.fileWriter.close();
          }
      } else {
        safeErrResp(400, "Nothing sent");
      }
  });

  readableStream.on("data",function(chunk) {
      
      if ( !job.fileWriter  ) {
          
          d10.log("debug",songId,"creating fileWriter");
          job.fileWriter  = new files.fileWriter(d10.config.audio.tmpdir+"/"+job.fileName);
          d10.log("debug",songId,"settings bytescheck interval");
          bytesIval = setInterval(bytesCheck,500);
          d10.log("debug",songId,"interval = ", bytesIval);
          job.fileWriter.open();

          job.fileWriter.on("end", function() {
              if ( parseInt(songFilesize) != job.fileWriter.bytesWritten() ) {
                  return safeErrResp(421, songFilesize+" != "+n);
              }
              job.bufferJoin = 20;
              
              if ( job.tasks.fileType.status === false &&
                    supportedAudioTypes.indexOf(job.tasks.fileType.response) < 0  ) {
                      return ;
              }
              job.run("sha1File");
              job.run("fileMeta");
              uploadComplete = true;
              if ( job.tasks.fileType.status === null ) {
                  job.complete("fileType",function(err,resp) {
                      internalEmitter.emit("uploadCompleteAndFileTypeAvailable");
                      if (  job.tasks.fileType.response == "application/ogg" ) { 
                        job.internalEmitter("oggAvailable",[]); 
                      }
                  });
              } else {
                  if ( job.tasks.fileType.response == "application/ogg" ) { 
                    job.internalEmitter("oggAvailable",[]);
                  }
                  internalEmitter.emit("uploadCompleteAndFileTypeAvailable");
              }
              d10.log("debug",songId,"fileWriter end event");
          });
      }
      if ( job.inputFileBuffer.status ) { job.inputFileBuffer.buffer.push(chunk); }
      job.fileWriter.write(chunk);
  });