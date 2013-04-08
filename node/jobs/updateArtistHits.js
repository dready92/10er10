var d10 = require("../d10");
var debug = d10.debug("d10:updateArtistHits");
var tokenizer = require("../artistToken").tokenize;

var getSongs = function(data, then) {
	var rpp = 100;
	var query = {
		include_docs: true,
		startkey: "aa",
		endkey: "ab",
		inclusive_end: false,
		limit: rpp
	};
	if ( data && data.startkey ) {
		query.startkey = data.startkey;
	}
	d10.couch.d10.getAllDocs(query, function(err,resp) {
		var responseData = null;
		if ( err ) { return then(err); }
		if ( resp.rows.length == rpp ) {
			var lastRow = resp.rows.pop();
			responseData = {startkey: lastRow.key};
        }
        return then(null, resp.rows, responseData);
	});
};

var pump = function(data, callback) {
  
	var artistDoc = {_id: "artistHits", artistsGenres: {}};
	
	var processSongs = function(err,rows,nextData) {
		if ( err ) {
			debug("error: ",err);
			return callback(err);
		}
		
		rows.forEach(function(row) {
			if (!row.doc.valid || !row.doc.reviewed || !row.doc.hits ) {
				return;
			}
			var artists = tokenizer(row.doc).artists;
			artists.forEach(function(artist) {
				if ( !  (row.doc.genre in artistDoc.artistsGenres) ) {
					debug("creating genre ",row.doc.genre);
					artistDoc.artistsGenres[row.doc.genre] = {};
				}
				if ( artist in artistDoc.artistsGenres[row.doc.genre] ) {
					artistDoc.artistsGenres[row.doc.genre][artist]+=row.doc.hits;
				} else {
					artistDoc.artistsGenres[row.doc.genre][artist]=row.doc.hits;
				}
			});
		});
		debug("parsed ",rows.length, "nextData: ",nextData);
		
		if ( nextData ) {
			return getSongs(nextData,processSongs);
		}
		
		debug(artistDoc);
		d10.couch.d10.overwriteDoc(artistDoc, function(err,resp) {
			if ( err ) 	debug(err);
			callback();
		});
	};
	getSongs(data,processSongs);
};


exports = module.exports = function(then) {
	pump(null,then);
};
