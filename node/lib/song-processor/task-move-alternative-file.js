var d10 = require ("../../d10");
var debug=d10.debug("d10:song-processor:task-move-alternative-file");
var fs = require("fs");

exports = module.exports = function moveAlternativeFileTask (then) {

  if ( !d10.config.audio.keepOriginalFile ) {
    return then();
  }

  var c = this.id[2],
  filename = this.oggName,
  tmpFile = d10.config.audio.tmpdir+"/"+this.fileName,
  id = this.id,
  fileType = this.tasks.fileType.response,
  alternativeExtension = null;
  debug(this.id,"file type : ",fileType);
  if ( fileType == "audio/mpeg" ) {
    alternativeExtension = "mp3";
  } else if ( fileType == "audio/mp4" ) {
    alternativeExtension = "m4a";
  }
  if ( !alternativeExtension ) {
    return then();
  }
  var targetFile = d10.config.audio.dir+"/"+id[2]+"/"+id+"."+alternativeExtension;
  debug(this.id,"moveAlternativeFile : ",tmpFile," -> ",targetFile);
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