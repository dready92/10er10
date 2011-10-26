var fixDoc = function(doc, couchd10, ucwords) {
	var title = ucwords(doc.title),
		artist = ucwords(doc.artist),
		album = ucwords(doc.album);
	if ( title != doc.title || artist != doc.artist || album != doc.album ) {
		doc.title = title;
		doc.artist = artist;
		doc.album = album;
		return function(then) {
			console.log("Fix song",doc._id,doc.title,doc.artist,doc.album);
			couchd10.storeDoc(doc, function(err,resp) {
				if ( err ) {
					console.log("Warning: unable to fix case for song ",doc,err,resp);
				}
				then();
			});
		};
	}
};


exports.fixSongFieldsCase = function(couchd10, ucwords, then) {
	couchd10.getAllDocs(
		{
			startkey: "aa",
			endkey: "ab",
			inclusive_end: false,
			include_docs: true
		},
		function(err,resp) {
			if ( err ) {
				console.log("ERROR: can't get songs list from database: ",err,resp);
				return ;
			}
			var toFix = [];
			console.log(resp.rows.length + " songs to check");
			resp.rows.forEach(function(v,k) {
				var fix = fixDoc(v.doc, couchd10, ucwords);
				if(fix) {
					toFix.push(fix);
				}
			});
			if ( toFix.length ) {
				console.log(toFix.length + " songs to fix");
				var fixNext = function() {
					if ( toFix.length ) {
						var fix = toFix.pop();
						fix(fixNext);
					} else {
						return then();
					}
				};
				fixNext();
			} else {
				return then();
			}
		}
	);
	
	
};
