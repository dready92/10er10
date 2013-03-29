var d10 = require ("../../d10");
var debug = d10.debug("d10:song-processor:task-create-document");
var gu = require("../../graphicsUtils");

exports = module.exports = function createDocumentTask(then) {
  var resp = this.tasks.oggLength.response, duration = 0;
  var sha1 = this.tasks.sha1File.response;
  var songId = this.id;
  if ( 
    Object.prototype.toString.call(resp) === '[object Array]' &&
    resp.length > 2 && 
    !isNaN(parseFloat(resp[1])) && 
    !isNaN(parseFloat(resp[2])) 
  ) {
    duration = parseFloat(resp[1])*60 + parseFloat(resp[2]);
  } else {
    duration = this.tasks.oggLength.response;
  }
  
  var doc = {
    _id: this.id,
    filename: this.songFilename,
    sha1: sha1,
    user: this.userId,
    reviewed: false,
    valid: false,
    ts_creation: new Date().getTime(),
    hits: 0,
    duration: duration
  };
  if ( this.tasks.moveAlternativeFile.response ) {
    doc.sourceFile = this.tasks.moveAlternativeFile.response;
  }
  for ( var index in this.tasks.cleanupTags.response ) {
    var k = index.toLowerCase(),
      v = this.tasks.cleanupTags.response[index];
    if ( k == "date" || k == "tracknumber" ) {
      doc[k] = parseFloat(v);
      if ( isNaN(doc[k]) )    doc[k]=0;
    } else {
      doc[k] = v;
    }
  }
  if ( typeof doc.title == "string" && doc.title.length &&
    typeof doc.artist == "string" && doc.artist.length ) {
    doc.valid = true;
  }
  
  // test for tracknumber and get it from filename if possible
  if ( doc.tracknumber == 0 ) {
    var tracknumberFromFilename = doc.filename.match(/^[0-9]+/);
    if ( tracknumberFromFilename ) {
      doc.tracknumber = parseInt( tracknumberFromFilename[0] , 10);
    }
  }
  
//                          return then(null,doc);
  var recordDoc = function() {
    d10.couch.d10.view("song/sha1",{key: sha1}, function(err,resp) {
      if ( err ) {
        return then(501);
      } else if (!resp.rows || resp.rows.length) {
        return then(433);
      }
      d10.couch.d10.storeDoc(doc,function(err,resp) {
        if ( err ) { then(err); }
        else {
          doc._rev = resp.rev;
          then(null,doc);
        }
      });
    });
  };

  if ( this.tasks.fileMeta.response && this.tasks.fileMeta.response.PICTURES && this.tasks.fileMeta.response.PICTURES.length ) {
      gu.imageFromMeta(this.tasks.fileMeta.response,function(err,resp) {
        debug(songId,"imageFromMeta response",err,resp);
        if ( !err ) {
          doc.images = [ resp ];
        }
        recordDoc();
      });
  } else {
    recordDoc();
  }
};