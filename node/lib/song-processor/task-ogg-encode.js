var d10 = require ("../../d10"),
  debug = d10.debug("d10:song-processor:task-ogg-encode"),
  spawn = require('child_process').spawn,
  files = require("../../files");

exports = module.exports = function oggEncodeTask(then) {
  var job = this;
  var oggWriterError=false;
  var bytesEncodedCount = 0;
  debug(job.id,"-----------------------------------------------");
  debug(job.id,"-------      Create OGG encoding        -------");
  debug(job.id,"-----------------------------------------------");
  if ( !job.decoder ) {
    debug(job.id,"error: job.decoder not set");
    then({message: "decoder not initialized"});
    return ;
  }
  var args = d10.config.cmds.oggenc_opts.slice();
  args.push(d10.config.audio.tmpdir+"/"+this.oggName,"-");

  job.oggWriter = spawn(d10.config.cmds.oggenc, args);
  job.oggWriter.on("exit",function(code) {
    debug(job.id,"launching oggWriter end of operation callback");
    var error = oggWriterError ? true : null;
    if ( !error ) {
      error = code ? code : null;
    }
    then(error,null);
  });
  job.decoder.on("exit",function() { debug("job.decoder exited"); });
  job.oggWriter.stdin.on("error",function(err) {
    debug(job.id,"Oggwriter error",err);
    oggWriterError=true;
  });
  job.decoder.stdout.pipe(job.oggWriter.stdin);

  if (job.tasks.fileType.response !== "audio/mp4" && job.tasks.fileType.response !== "audio/x-m4a") {// faad does not support stdin streaming
    writeBuffer();
  }

  function sendProgressEvent() {
    debug("Encoded: ",bytesEncodedCount," out of ",job.songFilesize);
    job.emitter.emit("progress",{
      userId: job.userId,
      songId: job.id,
      total: job.songFilesize,
      complete: bytesEncodedCount
    });
  };

  function writeBuffer() {
    if ( ! job.inputFileBuffer.buffer.length ) {
      if ( job.requestEnd ) {
        job.decoder.stdin.end();
      } else {
        debug(job.id,"================= Decoder pumping from request ===============");
        job.readableStream.on("error",function(err) {debug(job.id,"request error", err);});
        job.readableStream.pipe(job.decoder.stdin);
        job.inputFileBuffer.status = false;
      }
      return ;
    }

    debug(job.id,"Size: ",job.inputFileBuffer.buffer.length," bufferJoin: ",job.bufferJoin);
    var buffer = files.bufferSum(
      job.inputFileBuffer.buffer.splice(0, job.inputFileBuffer.buffer.length <= job.bufferJoin ? job.inputFileBuffer.buffer.length : job.bufferJoin)
    );
    bytesEncodedCount+=buffer.length;
    var writeOk = job.decoder.stdin.write(buffer);
    if ( writeOk ) {
      writeBuffer();
      sendProgressEvent();
    }
    else {
      job.decoder.stdin.once("drain",function() {
        writeBuffer();
        sendProgressEvent();
      });
    }
  };

}
