var config = require("../config"),when = require("../when");

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
	
	
	when ( 
		{
			preferences: function(then) {
				d10.couch.d10.getAllDocs({ startkey:"up",endkey:"uq", inclusive_end:false, include_docs:true},then);
			},
			private: function (then) {
				d10.couch.d10.getAllDocs({ startkey:"pr",endkey:"ps", inclusive_end:false, include_docs:true},then);
			}
		},
		function(errs,success) {
			if ( errs ) {
				console.log("Errors: ",errs);
				return ;
			}
			var rows = [];
			for ( var i in success ) {
				rows = rows.concat(success[i].rows);
			};
			
			var parseOne = function() {
				if ( !rows.length ) {
					return endOfRun();
				}

				var sourceDoc = rows.pop().doc;
				
				d10.couch.d10wi.getDoc(sourceDoc._id,function(err,targetDoc) {
					if ( err ) {
						targetDoc = sourceDoc;
						delete targetDoc._rev;
					} else {
						// ignore this one
						ignoredCount++;
						return parseOne();
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
		}
	);

},5000);


console.log("Migrating userPreferences...");
console.log("Hit <Crtl>+C to cancel or wait 5 secs");



