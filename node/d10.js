process.env.MAGIC = process.env.MAGIC || __dirname+"/magic/magic.mgc";

var fs = require("fs"),
    debugModule = require("debug"),
	ncouch = require("ncouch"),
	files = require("./files"),
	mmmagic = require("mmmagic"),
	Magic = mmmagic.Magic,
	exec = require('child_process').exec;

exports.debug = function (identifier) {
  var dbg = debugModule(identifier);
  return function () {
    var str = "";
    for ( var i in arguments ) {
      if(typeof arguments[i] === "object" ) {
        str+=JSON.stringify(arguments[i]);
      } else {
        str+=arguments[i];
      }
      str += " ";
    }
    dbg(str);
  };
};
var debug = exports.debug("d10:d10");
exports.mustache = require("./mustache");
var config, fileCache;
exports.setConfig = function(cfg) {
	config = exports.config = cfg;
	fileCache = files.fileCache( config.production ? null : {bypass: true} );
	exports.couch = {
		d10: ncouch.server(config.couch.d10.dsn).debug(false).database(config.couch.d10.database),
		auth: ncouch.server(config.couch.auth.dsn).debug(false).database(config.couch.auth.database),
		track: ncouch.server(config.couch.track.dsn).debug(false).database(config.couch.track.database),
		d10wi: ncouch.server(config.couch.d10wi.dsn).debug(false).database(config.couch.d10wi.database)
	};
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
		if ( resp.rows.length < 1 ) {
			return ecb.call(this,err,resp);
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
	debug("view");
	debug(d,p);
	if ( !cb && p ) {
		cb = p;
		p = null;
	}

	fileCache.readFile(config.templates.node+n+".html","utf-8", function (err, data) {
		if (err) throw err;
		data =
		data = exports.mustache.to_html(data,d,p);
		if ( cb )	cb.call(data,data);
	});
};

exports.lngView = function(request, n, d, p, cb) {
	if ( !cb && p ) {
		cb = p;
		p = null;
	}

	if ( n.match(/^inline\//) ) {
		return inlineView(request,n,d,p,cb);
	}

	request.ctx.langUtils.parseServerTemplate(request, n+".html",function(err,data) {
// 	fileCache.readFile(config.templates.node+n+".html","utf-8", function (err, data) {
		if (err) throw err;
		data = exports.mustache.to_html(data,d,p);
		if ( cb )	cb.call(data,data);
	});
};

var inlineView = function(request, n, d, p, cb) {
	request.ctx.langUtils.loadLang(request.ctx.lang, "server",function(err,resp) {
		if ( err ) { return cb(err); }
		return cb(null, resp.inline[ n.replace("inline/","") ]);
	});
};
/*
var icuCollation = [
    " ", "`" , "^", "_", "-", ",", ";", ":", "!", "?", "." ,"'", "\"", "(", ")", "[", "]", "{", "}",
    "@", "*", "/", "\\", "&", "#", "%", "+", "<", "=", ">", "|", "~", "$", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "a", "A", "b", "B", "c", "C", "d", "D", "e", "E", "f", "F", "g", "G", "h", "H", "i", "I", "j", "J", "k", "K", "l", "L",
    "m", "M", "n", "N", "o", "O", "p", "P", "q", "Q", "r", "R", "s", "S", "t", "T", "u", "U", "v", "V", "w", "W", "x", "X",
    "y", "Y", "z", "Z", "ZZZZZZZZ"
];
*/
var icuCollation = [
    " ", "`" , "^", "_", "-", ",", ";", ":", "!", "?", "." ,"'", "\"", "(", ")", "[", "]", "{", "}",
    "@", "*", "/", "\\", "&", "#", "%", "+", "<", "=", ">", "|", "~", "$", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "a", "b", "c",  "d", "e",  "f",  "g", "h",  "i", "j",  "k", "l",
    "m", "n",  "o",  "p",  "q",  "r",  "s",  "t", "u",  "v",  "w", "x",
    "y",  "z", "ZZZZZZZZ"
];


var nextLetterJS = function(l) {
    return String.fromCharCode( (l.charCodeAt(0)+1) );
};

exports.nextWord = function(w) {
    var l = w[ (w.length -1) ];
    var index = icuCollation.indexOf(l.toLowerCase()),
      next = ( index > -1 && index+1 < icuCollation.length ) ? icuCollation[ (index+1) ] : nextLetterJS(l);
	return w.substring(0,w.length - 1) + next;
};

exports.ucwords = function(str) {
	// originally from :
    // discuss at: http://phpjs.org/functions/ucwords    // +   original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // +   improved by: Waldo Malqui Silva
    // +   bugfixed by: Onno Marsman
    // +   improved by: Robin
    // +      input by: James (http://www.james-bell.co.uk/)    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // *     example 1: ucwords('kevin van  zonneveld');
    // *     returns 1: 'Kevin Van  Zonneveld'
    // *     example 2: ucwords('HELLO WORLD');
    // *     returns 2: 'HELLO WORLD'
    return (str + '').replace(/^([a-z])|[\s\[\(\.0-9-]+([a-z])/g, function ($1) {
        return $1.toUpperCase();
    });
};

exports.fileType = function(file,cb) {
  var magic = new Magic(mmmagic.MAGIC_MIME_TYPE);
  magic.detectFile(file, function(err, result) {
    debug("fileType : ",result);
    debug("fileType error ?",err);
    cb(err,result);
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
		ctx.headers["Content-Type"] = "application/json";
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
		ctx.headers["Content-Type"] = "application/json";
		ctx.response.writeHead(200, ctx.headers );
		ctx.response.end (
			JSON.stringify(back)
		);
	}
};

exports.realrest = {
	err: function(code, data, ctx) {
		if ( !ctx ) {
			ctx = data;
			data = null;
		}
		debug("response : ",code, exports.http.statusMessage(code), ctx.headers,data);
		ctx.headers["Content-Type"] = "application/json";
		ctx.response.writeHead(code, exports.http.statusMessage(code), ctx.headers);
		ctx.response.end(data ? JSON.stringify(data) : null);
	},
	success: function(data,ctx) {

		ctx.headers["Content-Type"] = "application/json";
		if ( data ) {
			data = JSON.stringify(data);
			ctx.headers["Content-Length"] = Buffer.byteLength(data);
		}
		ctx.response.writeHead(200, ctx.headers );
		ctx.response.end (data);
	}

};

exports.saveUser = function(doc,deleteIt) {
	if ( deleteIt ) {
		exports.couch.auth.deleteDoc(doc,function(err) {
			if ( err ) {
				debug("failed to delete user "+doc._id);
			} else {
				debug("user deleted "+doc._id);
			}
		});
	}
};

exports.saveUserPrivate = function(doc,deleteIt) {
	if ( deleteIt ) {
		exports.couch.auth.deleteDoc(doc,function(err) {
			if ( err ) {
				debug("failed to delete user private infos "+doc._id);
			} else {
				debug("user private infos deleted "+doc._id);
			}
		});
	}
};

