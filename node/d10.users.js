var d10 = require("./d10"), when = require("./when"), hash = require("./hash");
var d10views = [
	"album/artists",
	"album/firstLetter",
	"album/name",
	"album/search",
	"artist/albums",
	"artist/basename",
	"artist/genres",
	"artist/name",
	"artist/related",
	"artist/search",
	"artist/tokenized",
	"genre/artist",
	"genre/name",
	"genre/unsorted",
	"song/search",
	"title/name",
	"title/search",
	"ts_creation/name"
];


var errCodes = {
	430: "Login already registered",
	431: "Login too short",
	432: "Login contains invalid characters",
	440: "Password does not contain enough characters",
	441: "Password does not contain enough different characters"
};


var getd10Views = function(ncouch, then) {
	var jobs = {};
	d10views.forEach(function(v) {
		var spl = v.split("/"), doc = spl[0], view = spl[1];
		jobs[v] = 
			(function(doc, view) {
				return function(cb) {
					ncouch.getDoc("_design/"+doc, function(err,resp) {
						if ( err ) { return cb(err); }
						return cb(null, resp.views[view]);
					});
				};
			})(doc,view) 
			
		;
	});
	when(jobs,then);
};
exports.getd10Views = getd10Views;

var prepareUserViews = function(uid, rev, views) {
	console.log("parsing user view for ",uid);
	var doc = {_id: "_design/"+uid, language: "javascript", views: {}};
	if ( rev ) {
		doc._rev = rev;
	}
	for ( var fullName in views ) {
		var view = JSON.parse(JSON.stringify(views[fullName])), spl =  fullName.split("/");
		view.map = view.map.replace(/function\s*\(doc\)\s*{/,"function (doc) { if ( doc.user && doc.user != '"+uid+"' ) return ;");
// 		console.log(view.map);
		doc.views[ spl.join("_") ] = view;
	}
	return doc;
};

exports.prepareUserViews = prepareUserViews;

var isValidLogin = function(login, callback) {
	if ( login.length < 3 ) {	return callback(431); }
	if ( 
		login.indexOf("<") >= 0 ||
		login.indexOf(">") >= 0 ||
		login.indexOf("/") >= 0 ||
		login.indexOf("\\") >= 0 ||
		login.indexOf("\"") >= 0 ||
		login.indexOf("'") >= 0 ||
		login.indexOf("&") >= 0 
	)	return callback(432);
	if ( login.toLowerCase() == "admin" ||
		 login.toLowerCase() == "administrateur" ||
		  login.toLowerCase() == "administrator" ||
		   login.toLowerCase() == "root"
	)	return callback(430);
	d10.couch.auth.view("infos/all", {key: ["login",login]}, function(err,back) {
		if ( err ) {
			callback(503);
		} else if ( back.rows.length ) {
			callback(430);
		} else {
			callback();
		}
	});
};



var isValidPassword = function(password, callback) {
	if ( password.length < 8 ) {
		return callback(440);
	}
	var hash = [];
	for ( var i = 0; i<password.length ; i++ ) {
		var c = password.charCodeAt(i);
		if ( hash.indexOf(c) < 0 )	hash.push(c);
	}
	console.log(hash);
	if ( hash.length < 4 ) {
		return callback(441);
	}
	callback();
};


/**
* opts.parent: "us123445547754"
* opts.depth : 4
*
* opts.uuid : 5464623423453656
* opts.callback = function(err,resp)
*
*/
var createUser = function(login,password,opts) {
	var parent = opts.parent && opts.depth ? opts.parent : null;
	var depth = opts.parent && opts.depth ? parseInt(opts.depth,10) : 1;
	var uuid = opts.uuid ? opts.uuid : d10.uid();


	var sendResponse = function(err,resp) {
		if ( opts.callback ) {
			opts.callback(err,resp);
		}
	};

	when (
		{
			login: function(cb) {
				isValidLogin(login, cb);
			},
			password: function(cb) {
				isValidPassword(password,cb);
			},
			views: function(cb) {
				getd10Views(d10.couch.d10, cb);
			}
		},
		function(err,resp) {
			if ( err ) {
				if ( err.password ) {
					err.password = errCodes[ err.password ];
				}
				if ( err.login ) {
					err.login = errCodes[ err.login ];
				}
				return sendResponse(err,resp);
			}
			
			var authUserDoc = {
				_id: "us"+uuid,
				login: login,
				parent: parent
			};
			var authPrivDoc = {
				_id: "pr"+uuid,
				password: hash.sha1(password),
				depth: depth
			};
			var d10PreferencesDoc = {_id: "up"+uuid};
			var d10PrivateDoc = {_id: "pr"+uuid};
			
			var d10designDoc = prepareUserViews("us"+uuid, null, resp.views);
			
			when({
				auth: function(cb) {
					d10.couch.auth.storeDocs( [ authUserDoc, authPrivDoc ], function(err,resp) {
						if ( err ) {
							console.log(err,resp);
							cb(500,err);
						} else {
							cb();
						}
					});
				},
				d10wi: function(cb) {
					d10.couch.d10wi.storeDocs( [ d10PreferencesDoc, d10PrivateDoc ], function(err,resp) {
						if ( err ) {
							console.log(err,resp);
							cb(500,err);
						} else {
							cb();
						}
					});
				},
				d10: function(cb) {
					d10.couch.d10.storeDocs( [ d10designDoc ], function(err,resp) {
						if ( err ) {
							console.log(err,resp);
							cb(500,err);
						} else {
							cb();
						}
					});
				}
			},
			function(err,resp) {
				if ( err ) {
					sendResponse(err,resp);
					d10.couch.auth.deleteDoc(authUserDoc._id);
					d10.couch.auth.deleteDoc(authPrivDoc._id);
					d10.couch.d10wi.deleteDoc(d10PreferencesDoc._id);
					d10.couch.d10wi.deleteDoc(d10PrivateDoc._id);
					d10.couch.d10.deleteDoc(d10designDoc._id);
				} else {
					sendResponse(null,uuid);
				}
			});
		}
	);


};

/*
 * cb args: error, uid, loginResponse
 * if error is null:
 * if response is not null, uid is the user id
 */
var checkAuthFromLogin = function(login, password, cb) {
	if ( login.trim().length < 1 ) {
		return cb(new Error("Login too short"));
	}
	// get login informations
	d10.db.loginInfos(
		login,
		function(loginResponse) {
			password = hash.sha1(password);
			var	valid = false,
				uid = null;
			loginResponse.rows.forEach (function(v,k) {
				if ( !valid && v.doc._id.indexOf("pr") === 0 ) {
					if ( v.doc.password == password ) {
						valid = true;
						uid = v.doc._id.replace(/^pr/,"");
						return false;
					}
				}
			});
			if ( valid == true && uid ) {
				return cb(null, "us"+uid, loginResponse);
			} else {
				return cb();
			}
		},
		function(err) {
			return cb(err);
		}
	);
};

/*
 * create a session for uid and returns the session document
 */
var makeSession = function(uid, cb ) {
	var sessionId = d10.uid();
	var d = new Date();
	// create session and send cookie
	var doc = { 
		_id:"se"+sessionId ,
		userid: uid.substr(2),
		ts_creation: d.getTime(),
		ts_last_usage: d.getTime()
	};
	d10.couch.auth.storeDoc(doc,function(err,storeResponse) {
		if ( err ) {
			d10.log("debug","error on session recording",err);
			return cb(new Error("Session recording error"));
		}
		d10.log("debug","session recorded : ",storeResponse);
		return cb(null,doc);
	});
};

var getListenedSongsByDate = function(uid, opts, callback) {
	if ( opts.startkey && opts.startkey.length && opts.startkey[0]!=uid ) {
		opts.startkey[0]=uid;
	}
	
	d10.couch.track.view("tracking/userDateTracking",opts, callback);
	
};


exports.isValidLogin = isValidLogin;
exports.isValidPassword = isValidPassword;
exports.createUser = createUser;
exports.checkAuthFromLogin = checkAuthFromLogin;
exports.makeSession = makeSession;
exports.getListenedSongsByDate = getListenedSongsByDate;

