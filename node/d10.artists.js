var d10 = require ("./d10");

exports.getSongsByHits = function(artist, callback, options) {
  var rpp = d10.config.rpp+1;
  var viewName = options.genre ? "genre/artist-hits" : "artist/hits";
  var query = {
    reduce: false,
    descending: true,
    include_docs: true,
    startkey: options.startkey ? options.startkey : [artist, {}],
    endkey: [artist],
    limit: rpp
  };
  if ( options.startkey_docid ) {
    query.startkey_docid = options.startkey_docid;
  }
  if ( options.genre ) {
	  query.startkey = options.startkey ? options.startkey : [options.genre, artist, {}];
	  query.endkey = [options.genre, artist];
  }
  
  
  d10.couch.d10.view(viewName,query,callback);
};

