var d10 = require("../d10");
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
  
	var artistDoc = {_id: "artistHits", artists: {}, artistsGenres: {}};
	
	var processSongs = function(err,rows,nextData) {
		if ( err ) {
			console.log("updateArtistHits: error: ",err);
			return callback(err);
		}
		
		rows.forEach(function(row) {
			if (!row.doc.valid || !row.doc.reviewed || !row.doc.hits ) {
				return;
			}
			var artists = tokenizer(row.doc).artists;
			artists.forEach(function(artist) {
				if ( artist in artistDoc.artists ) {
					artistDoc.artists[artist]+=row.doc.hits;
				} else {
					artistDoc.artists[artist]=row.doc.hits;
				}
				if ( !  (row.doc.genre in artistDoc.artistsGenres) ) {
					console.log("creating genre ",row.doc.genre);
					artistDoc.artistsGenres[row.doc.genre] = {};
				}
				if ( artist in artistDoc.artistsGenres[row.doc.genre] ) {
					artistDoc.artistsGenres[row.doc.genre][artist]+=row.doc.hits;
				} else {
					artistDoc.artistsGenres[row.doc.genre][artist]=row.doc.hits;
				}
			});
		});
		console.log("parsed ",rows.length, "nextData: ",nextData);
		
		if ( nextData ) {
			return getSongs(nextData,processSongs);
		}
		
		console.dir(artistDoc);
		d10.couch.d10.overwriteDoc(artistDoc, function(err,resp) {
			console.log(err);
			callback();
		});
	};
	getSongs(data,processSongs);
};


exports = module.exports = function(then) {
	pump(null,then);
};
