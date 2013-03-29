var d10 = require ("../../d10");

exports = module.exports = function cleanupTagsTask (then) {
  if ( !this.tasks.fileMeta.response ) { this.tasks.fileMeta.response={}; }
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