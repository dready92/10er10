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
        responseDocs = {};
        var keys=[];
        resp.rows.forEach(function(v) {
            keys.push(v.key);
            responseDocs[v.key] = {d10wi: v.doc};
        });
        d10.couch.d10.getAllDocs({keys: keys, include_docs: true},function(err,resp) {
            if ( err ) { return then(err); }
            resp.rows.forEach(function(v) {
                responseDocs[v.key].d10 = v.doc;
            });
            return then(null, responseDocs, responseData);
        });

	});
};

var processAndRecordDocs = function(data, then) {
	var docs = [];
	for ( var k in data ) {
		if ( data[k].d10 && data[k].d10.hits != data[k].d10wi.hits ) {
			data[k].d10.hits = data[k].d10wi.hits ? data[k].d10wi.hits : 0;
			docs.push(data[k].d10);
		}
	}
	if ( !docs.length ) {
		return then();
	}
	d10.couch.d10.storeDocs(docs,function(err,resp) {
		if ( err ) { return then(err) }
        console.log("updateSongsHits: updated "+docs.length+" doc(s)");
		return then();
	});
};

var pump = function(data, callback) {
	getSongs(data,function(err,docs,nextData) {
		if ( err ) {
			console.log("updateSongsHits: error: ",err);
			return callback(err);
		}
		processAndRecordDocs(docs,function(err) {
			if ( err ) {
				console.log("updateSongsHits: error: ",err);
				return callback(err);
			}
			if ( nextData ) {
				return pump(nextData,callback);
			}
			return callback();
		});
	});
};


exports = module.exports = function(then) {
	pump(null,then);
};
