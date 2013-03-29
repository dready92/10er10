var d10 = require ("../../d10");


exports = module.exports = function sha1CheckTask(then) {
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