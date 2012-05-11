var d10 = require("../d10");


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
	d10.couch.d10wi.getAllDocs(query, function(err,resp) {
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
  
	var artistDoc = {_id: "artistHits"};
	
	getSongs(data,function(err,docs,nextData) {
		if ( err ) {
			console.log("updateArtistHits: error: ",err);
			return callback(err);
		}
		if ( nextData ) {
			return getSongs(nextData,callback);
		}
		return callback();
	});
};


exports = module.exports = function(then) {
	pump(null,then);
};
