var config = require("../config");

if ( process.argv.length > 3 && process.argv[3] == "-p" ) {
        config.production = true;
        config.port = 8124;
        config.couch = config.couch_prod;
} else {
        config.couch = config.couch_dev;
}


var d10 = require("../d10"),
	users = require("../d10.users");

	var successCount = 0, ignoredCount = 0,  failed = [];
	
var endOfRun = function() {

	console.log("end of run : ",successCount," success, ",ignoredCount," ignored");
	if ( failed.length ) {
		console.log("Errors encountered on docs : ",failed);
	}
};

setTimeout(function() {

	d10.couch.d10.getAllDocs({ startkey:"aa",endkey:"ab", inclusive_end:false, include_docs:true},function(err,source) {
		if ( err ) {
			return console.log("failed",err);
		}

		console.log(source.rows.length,"songs to parse");

		

		var parseOne = function() {
			if ( !source.rows.length ) {
				return endOfRun();
			}

			var sourceDoc = source.rows.pop().doc;
			
			d10.couch.d10wi.getDoc(sourceDoc._id,function(err,targetDoc) {
				if ( err ) {
					targetDoc = {_id: sourceDoc._id, hits: sourceDoc.hits ? sourceDoc.hits:0 };
				} else {
					if ( sourceDoc.hits > targetDoc.hits ) {
						targetDoc.hits = sourceDoc.hits;
					} else {
						// ignore this one
						ignoredCount++;
						return parseOne();
					}
				}
				
				d10.couch.d10wi.storeDoc(targetDoc,function(err,resp) {
					if ( err ) {
						console.log(err);
						failed.push(sourceDoc._id);
					} else {
						successCount++;
					}
					parseOne();
				});
			});
			

		};
		parseOne();
	});





},5000);


console.log("Duplicating songs hits...");
console.log("Hit <Crtl>+C to cancel or wait 5 secs");



