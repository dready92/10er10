var config,
	configParser = require("../configParser"),
	when = require("../when"),
	d10users = require("../d10.users");

exports.createUserDesignDocs = function(couchd10, couchAuth, then) {
	when(
		{
			users: function(cb) {
				findUsers(couchAuth, cb);
			},
			views: function(cb) {
				d10users.getd10Views(couchd10, cb);
			}
		},
		function(err,resp) {
			if ( err ) {
				console.log(err);
				then(err);
			}
			var users = [];
			resp.users.rows.forEach(function(row) {
				users.push(row.id);			
			});
			getUsersDocRev(couchd10, users,function(err,userRevs) {
				if ( err ) {
					console.log(err);
					then(err);
				}
				var docs = [];
				users.forEach(function(uid) {
					docs.push(
						d10users.prepareUserViews (uid, userRevs[uid], resp.views)
						 );
				});
				console.log("recording docs");
				couchd10.storeDocs(docs, then);
			});
		}
	);
};



var getUsersDocRev = function(ncouch, users, then) {
	console.log("getting existing design doc revisions");
	var onceAgain = {};
	users.forEach(function(id) {
	onceAgain[id] = (
		function(id) {
			return function(cb) {
				ncouch.getDoc("_design/"+id, function(err,resp) {
					if ( err && err.statusCode && err.statusCode == 404 ) {
						return cb(null, "");
					} else if ( err ) {
						console.log(err, typeof err);
						return cb(err);
					} else {
						return cb(null, resp._rev);
					}
				});
			}
		}
		)(id);
	});
	when(onceAgain, then);
};

var findUsers = function(ncouch, then) {
	ncouch.getAllDocs({startkey: "us", endkey: "ut", inclusive_end: false}, then);
};

var d10lists = [
	"title/search",
	"album/search"
];



