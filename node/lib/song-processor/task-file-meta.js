var d10 = require ("../../d10"),
  audioUtils = require("../../audioFileUtils");

exports = module.exports = function fileMetaTask (then) {
  audioUtils.extractTags(d10.config.audio.tmpdir+"/"+this.fileName,function(err,cb) {
    then(err,cb);
  });
}