var d10 = require ("./d10");

exports.getSongsByHits = function(artist, callback, startkey, startkey_docid) {
  var rpp = d10.config.rpp+1;
  var query = {
    reduce: false,
    descending: true,
    include_docs: true,
    startkey: startkey ? startkey : [artist, {}],
    endkey: [artist],
    limit: rpp
  };
  if ( startkey_docid ) {
    query.startkey_docid = startkey_docid;
  }
  d10.couch.d10.view("artist/hits",query,callback);
};





