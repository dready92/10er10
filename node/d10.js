var fs = require("fs"),
	exec = require('child_process').exec;
exports.mustache = require("./mustache");
exports.db = require("./d10db");
var config = exports.config = require("./config");
	
var	httpStatusCodes = {
	100: "Continue",
	101: "Switching Protocols",
	200: "OK",
	201: "Created",
	202: "Accepted",
	203: "Non-Authoritative Information",
	204: "No Content",
	205: "Reset Content",
	206: "Partial Content",
	300: "Multiple Choices",
	301: "Moved Permanently",
	302: "Found",
	303: "See Other",
	304: "Not Modified",
	305: "Use Proxy",
	307: "Temporary Redirect",
	400: "Bad Request",
	401: "Unauthorized",
	402: "Payment Required",
	403: "Forbidden",
	404: "Not Found",
	405: "Method Not Allowed",
	406: "Not Acceptable",
	407: "Proxy Authentication Required",
	408: "Request Timeout",
	409: "Conflict",
	410: "Gone",
	411: "Length Required",
	412: "Precondition Failed",
	413: "Request Entity Too Large",
	414: "Request-URI Too Long",
	415: "Unsupported Media Type",
	416: "Requested Range Not Satisfiable",
	417: "Expectation Failed",
	420: 'bad file type',
	421: 'file transfer failed',
	422: 'mp3 conversion failed',
	423: 'database transaction failed',
	424: 'invalid song',
	425: 'validation failed',
	426: 'data missing in database',
	427: 'invalid REST query',
	428: 'unknown genre',
	429: 'unknown artist',
	430: 'playlist already exists',
	431: 'not allowed',
	432: 'Can\'t write file to disk',
	433: 'File already in database',
	434: 'Invalid email address',
	435: 'Unable to send email',
	436: 'Unable to get song length',
	500: "Internal Server Error",
	501: "Not Implemented",
	502: "Bad Gateway",
	503: "Service Unavailable",
	504: "Gateway Timeout",
	505: "HTTP Version Not Supported"
};

exports.uid = function() {
// 	return ((0x100000000 * Math.random()).toString(32) + "" + (0x100000000 * Math.random()).toString(32));
	return ((0x100000000 * Math.random()).toString(32) + "" + (0x100000000 * Math.random()).toString(32)).replace(/\./g,"")
};
	
exports.count = function(obj) {
	var count = 0;
	for ( var k in obj ) {
		count++;
	}
	return count;
};
exports.http = {};
exports.http.statusMessage = function(code) {
	if ( code in httpStatusCodes ) {
		return httpStatusCodes[code];
	}
	return "Generic error";
};

exports.view = function(n,d,p,cb) {
	if ( !cb && p ) {
		cb = p;
		p = null;
	}
	fs.readFile(config.templates.node+n+".html","utf-8", function (err, data) {
		if (err) throw err;
				// 		console.log(data);
		data = exports.mustache.to_html(data,d,p);
		if ( cb )	cb.call(data,data);
	});
};

exports.nextWord = function(w) {
	var charCode = w.charCodeAt(w.length-1);
	charCode++;
	return w.substring(0,w.length - 1)+String.fromCharCode(charCode);
	
};

exports.ucwords = function(str) {
    // Uppercase the first character of every word in a string  
    // 
    // version: 1009.2513
    // discuss at: http://phpjs.org/functions/ucwords    // +   original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // +   improved by: Waldo Malqui Silva
    // +   bugfixed by: Onno Marsman
    // +   improved by: Robin
    // +      input by: James (http://www.james-bell.co.uk/)    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // *     example 1: ucwords('kevin van  zonneveld');
    // *     returns 1: 'Kevin Van  Zonneveld'
    // *     example 2: ucwords('HELLO WORLD');
    // *     returns 2: 'HELLO WORLD'    
    return (str + '').replace(/^([a-z])|\s+([a-z])/g, function ($1) {
        return $1.toUpperCase();
    });
}

exports.when = function(elems, success, failure) {
	var responses = {};
	var errors = {};
	
	var checkEOT = function() {
		console.log( "when", exports.count(responses) , exports.count(errors) );
		if ( exports.count(responses) + exports.count(errors) == exports.count(elems) ) {
			if ( exports.count(errors) ) {
				failure.call(this,errors, responses);
			} else {
				success.call(this,responses);
			}
		}
	};
	
// 	elements.forEach(function(v,k) {
	for ( var k in elems) {
		(function(callback, key){
			callback.call(this,function(err,response) {
				if( err ) {	errors[key] = err; }
				else		{ responses[key] = response;}
				
				checkEOT();
			});
		})(elems[k],k);
	}
	
};


exports.fillUserCtx = function (ctx,response,session) {
	ctx.session = session;
	response.rows.forEach(function(v,k) {
		if ( v.doc._id.indexOf("se") === 0 && v.doc._id != session._id ) {
			console.log("deleting session ",v.doc._id);
			exports.db.db("auth").deleteDoc(
					{
						success: function(r) { console.log("session "+r.id+" deleted"); }
						// 						error: function(data,response) {console.log("error deleting session : ");console.log(response);}
			}
			,v.doc);
		} else if ( v.doc._id.indexOf("us") === 0 ) {
			ctx.user = v.doc;
		} else if ( v.doc._id.indexOf("pr") === 0 ) {
			ctx.userPrivateConfig = v.doc;
		}
	});
};


exports.fileType = function(file,cb) {
	var process = exec(
		config.cmds.file+" "+config.cmds.file_options+" "+file,
		function(error,stdout, stderr) {
			if ( error !== null ) {
				console.log("fileType error while checking ",file);
				cb(error);
			} else {
				console.log("fileType : ",stdout);
				cb(null,stdout.replace(/\s/g,""));
			}
// 			if ( cb ) { cb(error); }
		}
	);
};

exports.oggLength = function(file,cb) {
// 	console.log("launching oggLength");
	var ogginfo = exec(config.cmds.ogginfo+" "+file,function(err,stdout,stderr) {
		if ( stdout.length ) {
			var back = stdout.match(/Playback length: ([0-9]+)m:([0-9]+)/);
			if ( back.length > 2 ) {
				return cb(null,back);
			}
		}
		if ( err !== null ) {
			cb(err);
		} else {
			cb("no match");
		}
	});
};

exports.id3tags = function(file, cb) {
	var tagsPipe = exec(config.cmds.taginfo+" "+file+" | "+config.cmds.utrac+" -t UTF-8",function(err,stdout,stderr) {
		if ( err )	{
			return cb(err);
		}
		var tagnames = ['ALBUM','TRACK','ARTIST','TITLE','GENRE','YEAR'],
			tags = {};
// 		console.log("TAGS bruts: ",stdout);
		stdout.split("\n").forEach(function(v,k) {
			var tag = v.split("=",2);
			if ( tagnames.indexOf(tag[0]) >=0 ) {
				tags[tag[0]] = tag[1].replace(/^\s+/,"").replace(/\s+$/,"").replace(/"/g,"");
				if ( tag[0] == "TRACK" ) {
					tags["TRACKNUMBER"] = tags[tag[0]];
				} else if ( tag[0] == "YEAR" ) {
					tags["DATE"] = tags[tag[0]];
				}
			}
		});
// 		console.log("TAGS tableau :");
		console.log(tags);
		cb(null,tags);
	});
};

exports.oggtags = function(file, cb) {
	var tagsPipe = exec(config.cmds.vorbiscomment+" -l "+file+" | "+config.cmds.utrac+" -t UTF-8",function(err,stdout,stderr) {
		if ( err )	{
			return cb(err);
		}
// 		var tagnames = ['ALBUM','TRACK','ARTIST','TITLE','GENRE','YEAR'],
		var tags = {};
		console.log("TAGS bruts: ",stdout);
		stdout.split("\n").forEach(function(v,k) {
			console.log("ligne ",v);
			var tag = v.split("=",2);
			console.log(tag);
			if ( tag.length > 1 ) {
				tags[tag[0]] = tag[1].replace(/^\s+/,"").replace(/\s+$/,"").replace(/"/g,"");
			}
		});
		console.log("TAGS tableau :");
		console.log(tags);
		cb(null,tags);
	});
};

exports.escapeShellArg = function(s) {
	return "'"+s.replace(/'/g, "'\\''")+"'";
};

exports.setOggtags = function(file, tags, cb) {
	if ( !exports.count(tags) ) {
		return cb(null,tags);
	}
	var args = [];
	for ( var index in tags ) {
		args.push("-t "+exports.escapeShellArg(index+"="+tags[index]));
	}
	var tagsPipe = exec(config.cmds.vorbiscomment+" -s "+args.join(" ")+" "+file,function(err,stdout,stderr) {
		if ( err )	{
			return cb(err);
		}
		cb(null,tags);
	});
};

exports.sanitize = {
	string: function(s) {
		return exports.ucwords(s.replace(/^\s+/,"").replace(/\s+$/,"").replace(/</g,"").replace(/>/g,"").toLowerCase());
	},
	number: function(s) {
		s = parseFloat(s);
		if ( isNaN(s) )	return 0;
		return s;
	},
	genre: function(s) {
		s = s.toLowerCase();
		var back = "";
		config.genres.forEach(function(v,k) {
			if ( s == v.toLowerCase() ) {
				back=v;
			}
		});
		return back;
	}
};

exports.valid = {
	title: function(s) { return (s.length) ; },
	artist:  function(s) { return (s.length) ; },
	genre: function(s) { return  ( config.genres.indexOf(s) >= 0 ) ;},
	id: function(s) { return s.substr(0,2) == "aa" ? true : false}
};
/*
exports.sanitizeTag = array ( name, value) {
	name = name.toLowerCase();
	value = value.toLowerCase();
	if ( name == "genre" ) {
		config.genres.forEach(function(v,k) {
			if ( value == v.toLowerCase() ) {
				return v;
			}
		});
	}
	if ( name == "tracknumber" ) {
		
	}
	var methods = {
		title: ""
	};
};


*/

