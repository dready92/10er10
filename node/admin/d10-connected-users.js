var config,
	d10,
	configParser = require("../configParser");


var getSessions = function(then) {
	d10.couch.auth.getAllDocs({startkey: "se", endkey: "sf", inclusive_end: false, include_docs: true},function(err,resp) {
		if ( err ) {
			then (err, resp);
		}
		else
		{
			var sessions = [];
			resp.rows.forEach(function(row) {
				sessions.push(row.doc);
			});
			then(null,sessions);
		}
	});
}
	
var ParseActiveSessions = function(err,sessions, then) {
	if ( err ) {
		return then(err,sessions);
	}
	// active session got an updated ts_last_usage field the last half an hour
	var ts = new Date().getTime();
	ts -= 60000 * 30;
	var activeSessions = [];
	sessions.forEach(function(session) {
		if ( "ts_last_usage" in session && session.ts_last_usage >= ts ) {
			activeSessions.push(session);
		}
	});
	then(null,activeSessions);
};
	
var findSessionsOwners = function(err,sessions, then) {
	if ( err ) {
		return then(err,sessions);
	}
	var keys = [], usersTs = {};
	sessions.forEach(function(session) {
		var userId = "us"+session.userid;
		keys.push( userId );
		usersTs[userId] = session.ts_last_usage;
	});
	d10.couch.auth.getAllDocs({keys: keys, include_docs: true}, function(err,resp) {
		if ( err ) {
			then(err,resp);
		} else {
			var users = [];
			resp.rows.forEach(function(row) {
				users.push(row.doc);
			});
			return then(null,users);
		}
	});
};
	

var displayUsers = function ( err, users, then ) {
	if ( err ) {
		return then(err);
	}
	
	if  ( !users.length ) {
		console.log("No user logged in actually");
	}
	
	users.forEach(function(user) {
		console.log(user.login+" ("+user._id+")");
	});
	then();
};

	
var run = function() {
	configParser.getConfig(function(err,resp) {
		if ( process.argv.length == 3 && process.argv[2] == "-p" ) {
			configParser.switchProd();
		}else {
			configParser.switchDev();
		}
		config = resp;
		onConfig();
	});

	function onConfig () {
		d10 = require("../d10");
		d10.setConfig(config);
		console.log("---------------------------");
		getSessions(function(err,sessions) {
			ParseActiveSessions(err,sessions,function(err,sessions) {
				findSessionsOwners(err,sessions,function(err,users) {
					displayUsers(err,users,function(err) {
						if ( err ) {
							console.log("ERROR: ",err);
						}
					});
				});
			});
		});
		
		
	};
};

if ( process.argv.length < 2 ) {
	console.log("Usage: "+process.argv[0]+" "+process.argv[1]+" [-p]");
	process.exit(1);
}

console.log("Getting connected users of "+ ( process.argv.length == 3 && process.argv[2] == "-p" ? "production" : "test" ) + " environment." );
console.log("Hit <Crtl>+C to cancel or wait 5 secs");

setTimeout(run, 5000);