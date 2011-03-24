var fs = require("fs"),
// 	cradle = require('cradle'),
	ncouch = require("./ncouch"),
	files = require("./files"),
	exec = require('child_process').exec;
	
exports.mustache = require("./mustache");
var config = exports.config = require("./config");
var fileCache = files.fileCache( config.production ? null : {bypass: true} );
exports.couch = {
	d10: ncouch.server(config.couch.d10.dsn).debug(false).database(config.couch.d10.database),
	auth: ncouch.server(config.couch.auth.dsn).debug(false).database(config.couch.auth.database),
	track: ncouch.server(config.couch.track.dsn).debug(false).database(config.couch.track.database)
};
exports.db = {};

exports.db.loginInfos = function(login, cb, ecb) {
	exports.couch.auth.view("infos/all",{include_docs: true, key: ["login",login]},function(err,resp) {
		if ( err ) {
			if ( ecb ) {
				ecb.call(this,err,resp);
			}
			return ;
		}
		exports.couch.auth.view(
			"infos/all",
			{
				include_docs: true,
				startkey: [resp.rows[0].doc._id.replace(/^us/,""),""], 
				endkey: [resp.rows[0].doc._id.replace(/^us/,""),[]]
			}, function(err,resp) {
				if ( err ) {
					if ( ecb ) ecb.call(this,err,resp);
				} else {
					if ( cb ) cb.call(this,resp);
				}
			}
		);
	});
};

exports.db.d10Infos = function (login, cb, ecb) {
	exports.couch.d10.view("user/all_infos",{include_docs: true, startkey: [login,null], endkey: [login,[]]},function(err,resp) {
		if ( err ) {
			if ( ecb )	ecb.call(this,err,resp);
		} else {
			if ( cb )	cb.call(this,resp);
		}
	});
};

// console.log("Server debug state : ", ncouch.server(config.couch.d10.dsn).debug());

// exports.couch.d10.debug(true);
// exports.couch.auth.debug(true);
// exports.couch.track.debug(true);

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


exports.log = function() {
	console.log.apply(console,arguments);
};

exports.uid = function() {
// 	return ((0x100000000 * Math.random()).toString(32) + "" + (0x100000000 * Math.random()).toString(32));
	return (
		(0x100000000 * Math.random()).toString(32) + "" 
		+ (0x100000000 * Math.random()).toString(32)+ ""
		+ (0x100000000 * Math.random()).toString(32)
		   ).replace(/\./g,"")
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
	console.log("view");
	console.log(d,p);
	if ( !cb && p ) {
		cb = p;
		p = null;
	}
	fileCache.readFile(config.templates.node+n+".html","utf-8", function (err, data) {
		if (err) throw err;
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
};


/*
 * setup ctx.session
 * ctx.user
 * ctx.userPrivateConfig
 */
exports.fillUserCtx = function (ctx,response,session) {
	ctx.session = session;
	response.rows.forEach(function(v,k) {
		if ( v.doc._id.indexOf("se") === 0 && v.doc._id != session._id ) {
			exports.log("debug","deleting session ",v.doc._id);
			exports.saveSession(v.doc,true);
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
				exports.log("debug","fileType error while checking ",file);
				cb(error);
			} else {
				exports.log("debug","fileType : ",stdout);
				cb(null,stdout.replace(/\s/g,"").split(";").shift());
			}
		}
	);
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

exports.rest = {
	err: function(code, data,ctx) {
		if ( !ctx ) {
			ctx = data;
			data = null;
		}
		var back = {
			status: "error",
			data: {
				code: code,
				message: exports.http.statusMessage(code)
			}
		};
		if (data) {
			back.data.infos = data;
		}
		ctx.response.writeHead(200, ctx.headers );
		ctx.response.end (
			JSON.stringify(back)
		);
	},
	success: function(data,ctx) {
		var back = {
			status: "success",
			data: data
		};
		ctx.response.writeHead(200, ctx.headers );
		ctx.response.end (
			JSON.stringify(back)
		);
	}
};

exports.saveSession = function(doc,deleteIt) {
	if ( deleteIt ) {
		exports.couch.auth.deleteDoc(doc,function(err) {
			if ( err ) {
				exports.log("failed to delete session "+doc._id);
			} else {
				exports.log("session deleted "+doc._id);
			}
		});
	} else {
		if ( doc._rev ) {
			exports.couch.auth.storeDoc(doc,function(err,resp) {
			});
		}
	}
};

exports.saveUser = function(doc,deleteIt) {
	if ( deleteIt ) {
		exports.couch.auth.deleteDoc(doc,function(err) {
			if ( err ) {
				exports.log("failed to delete user "+doc._id);
			} else {
				exports.log("user deleted "+doc._id);
			}
		});
	}
};

exports.saveUserPrivate = function(doc,deleteIt) {
	if ( deleteIt ) {
		exports.couch.auth.deleteDoc(doc,function(err) {
			if ( err ) {
				exports.log("failed to delete user private infos "+doc._id);
			} else {
				exports.log("user private infos deleted "+doc._id);
			}
		});
	}
};

