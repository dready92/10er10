var d10 = require ("../../d10");
var debug = d10.debug("d10:song-processor:task-apply-tags-to-file");
var audioUtils = require("../../audioFileUtils");


exports = module.exports = function applyTagsToFileTask (then) {
  var c = this.id[2];
  debug(this.id,"Applying tags to ogg file");
  audioUtils.setOggtags(d10.config.audio.dir+"/"+c+"/"+this.oggName,this.tasks.cleanupTags.response,function(err,cb) {
    then(err,cb);
  });
}