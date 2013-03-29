var d10 = require ("../../d10"),
  files = require("../../files");

exports = module.exports = function sha1FileTask(then) {
  files.sha1_file(d10.config.audio.tmpdir+"/"+this.fileName, function(err,resp) {
    if ( !err ) {
      resp = resp.split(" ",2).shift();
    }
    then(err,resp);
  });
};