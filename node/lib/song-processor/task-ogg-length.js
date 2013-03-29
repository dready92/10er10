var d10 = require ("../../d10"),
  audioUtils = require("../../audioFileUtils");

exports = module.exports = function oggLengthTask (then) {
  var file = (this.tasks.fileType.response == "application/ogg" ) ? this.fileName : this.oggName ;
  audioUtils.oggLength(d10.config.audio.tmpdir+"/"+file,function(err,len) {
    if ( !err ) {
      if ( len && len.length && len.length > 2 ) {
        len = 60*parseInt(len[1],10) + parseInt(len[2],10);
      }
    }
    then(err,len);
  });
};