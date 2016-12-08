var d10 = require("../../d10"),
    audioUtils = require('../../audioFileUtils'),
    debug = d10.debug("d10:song-processor:task-move-file"),
    fs = require("fs")
    ;


exports = module.exports = function moveFileTask (then) {
  var c = this.id[2],
    job = this,
    filename = this.oggName,
    tmpFile = d10.config.audio.tmpdir+"/"+this.fileName,
    sourceFile = d10.config.audio.tmpdir+"/";
    sourceFile+= audioUtils.isOggFileType(this.tasks.fileType.response) ? this.fileName : this.oggName ;
  debug(job.id,"moveFile : ",sourceFile," -> ",d10.config.audio.dir+"/"+c+"/"+filename);
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
      debug(job.id,"moveFile", err);
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
