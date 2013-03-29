var d10 = require("../../d10");
var debug = d10.debug("d10:song-processor-task-file-type");

exports = module.exports = function fileTypeTask (then) {
  if ( this.songFilename.match(/mp3$/i) ) {
    debug(this.id, "fileType task returns",  "audio/mpeg");
    return then(null,"audio/mpeg");
  }
  d10.fileType(d10.config.audio.tmpdir+"/"+this.fileName, function(err,type) {
    debug(this.id, "fileType task returns", type);
    then(err,type);
  });
};