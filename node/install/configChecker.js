var config = require("../config");
var when = require("../when");
var fs = require("fs");
var Url = require("url");
var http = require("http");

var binaries = [
	config.cmds.file,
	config.cmds.lame,
	config.cmds.oggenc,
	config.cmds.ogginfo,
	config.cmds.utrac,
	config.cmds.taginfo,
	config.cmds.vorbiscomment,
	config.cmds.metaflac,
	config.cmds.flac
];

var directories = [
	config.audio.tmpdir,
	config.audio.dir
];

var couchServers = [];

for ( var i in config.couch_prod ) {
	var url = config.couch_prod[i].dsn;
	var parsed = Url.parse(url);
	couchServers.push(
		{
			host: parsed.hostname,
			port: parsed.port ? parsed.port : 80,
			path: parsed.pathname ? parsed.pathname : "/"
		}
				 );
}

for ( var i in config.couch_dev ) {
	var url = config.couch_prod[i].dsn;
	var parsed = Url.parse(url);
	couchServers.push(
		{
			host: parsed.hostname,
			port: parsed.port ? parsed.port : 80,
			path: parsed.pathname ? parsed.pathname : "/"
		}
				 );
}


var checks = []
checks.push(
	function(then) {
		var whenTests = {};
		for ( var i in binaries ) {
			var exe = binaries[i];
			whenTests[exe] = (function(exe) {
					return function(cb) {
						fs.stat(exe,cb);
					}
				})(exe);
		}
		when(whenTests,function(errs,resp) {
			if ( errs ) {
				console.log("Required binaries not found error : ");
				for ( var i in errs ) {
					console.log(i+" not found");
				}
			}
			then(errs);
		});
	},
	function(then) {
		var whenTests = {};
		for ( var i in directories ) {
			var dir = binaries[i];
			whenTests[dir] = (function(dir) {
					return function(cb) {
						fs.stat(dir,cb);
					}
				})(dir);
		}
		when(whenTests,function(errs,resp) {
			if ( errs ) {
				console.log("Required directories not found error : ");
				for ( var i in errs ) {
					console.log(i+" not found");
				}
			}
			then(errs);
		});
	},
	function(then) {
		var whenTests = {};
		for ( var i in couchServers ) {
			var opts = couchServers[i];
			whenTests[opts.hostname+":"+opts.port+opts.pathname] = (function(opts) {
					return function(cb) {
						http.get(opts,function(res) {
							if ( res.statusCode != 200 ) {
								cb(new Error("Server unreachable"));
							}
						});
					}
				})(opts);
		}
		when(whenTests,function(errs,resp) {
			console.log("responses on when");
			if ( errs ) {
				console.log("Configured CouchDB Server unreachable error : ");
				for ( var i in errs ) {
					console.log(i+" unreachable");
				}
			}
			then(errs);
		});
	}
);






exports.check = function(result) {
	result  = result || function() {};
	var i = 0;
	var then = function(err) {
		if ( err ) {
			console.log("stop configuration checks");
			result(true);
			return ;
		}
		i++;
		if ( i >= checks.length ) {
			console.log("End of configuration checks");
			result();
			return ;
		}
		// next check
		checks[i](then);
	};
// 	console.log("launching first check");
// 	for ( var  i in checks ) {
// 		console.log(checks[i]);
// 	}
	checks[0](then);
};






