var fs = require("fs"),
	path = require("path"),
	util = require("util"),
	utils = require("connect/utils");

var httpStatusCodes = {
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
	500: "Internal Server Error",
	501: "Not Implemented",
	502: "Bad Gateway",
	503: "Service Unavailable",
	504: "Gateway Timeout",
	505: "HTTP Version Not Supported"
};

exports.statusCode = function (code) {
	if ( ! code )	return false;
	if ( code in httpStatusCodes ) {
		return httpStatusCodes[code];
	}
};



exports.localPathServer = function ( uri, localuri ) {
	uri = uri.replace(/\/$/,"");
	if ( !uri.length )	return false;
	localuri = localuri.replace(/\/$/,"");
	if ( !localuri.length )	return false;
	
	return  function ( request, response, next ) {
		request.ctx.headers["Accept-Range"] = "bytes";
		var url = path.normalize(request.url);
		console.log("request.url",request.url,"url",url,"uri",uri,"localuri",localuri,"localFile",url.replace(uri,localuri));
		if ( url.indexOf(uri) !== 0 ) {
			next();
			return ;
		};
		var localFile = url.replace(uri,localuri);
		fs.stat(localFile, function(err, stats) {
			if(!err) {
				request.ctx.stats = stats;
				request.ctx.status = 200;
				console.log(utils);
				request.ctx.headers["content-type"] = utils.mime.type(localFile);
				sendStatic(localFile,stats,request.ctx);
			} else {
				next();
				return ;
			}
		});
	};
	
};




/**
 * the grasshopper parseRange function, untouched
 * 
 * @param object ctx the context opbject. Only ctx.request is used; should contain the request
 * @param object stats the response of the node.js fs.stat of the file to send
 * @return array index 0 is the start offset, index 1 is the last offset to send
 */
var parseRange = function(ctx, stats) {
    var range = ctx.request.headers['range'],
        ifRange = ctx.request.headers['if-range'],
        fileSize = stats.size,
        ranges = range.substring(6).split(',');
    if(ifRange) {
        if(ifRange.match(/^\d{3}/) && ifRange != stats.mtime.getTime()) {
            return;
        } else if(!ifRange.match(/^\d{3}/) && ifRange != stats.mtime.toUTCString()) {
            return;
        }
    }
    if(range.length > 5 && ranges.length == 1) {
        var range = ranges[0].split('-');
        if(range[1].length == 0) {
            range[1] = fileSize;
        }
        range[0] = Number(range[0]), range[1] = Number(range[1]);
        if(range[1] > range[0]) {
            range[0] = Math.max(range[0], 0);
            range[1] = Math.min(range[1], fileSize - 1);
            return range;
        }
    }
};

function sendStatic(staticFile, stats, ctx) {
    function sendBytes() {
		if(satisfiesConditions(stats, ctx)) {
			ctx.headers['last-modified'] = stats.mtime.toUTCString();
			ctx.headers['etag'] = stats.mtime.getTime();
			var range;
			if(ctx.request.headers['range'] && (range = parseRange(ctx, stats))) {;
				ctx.status = 206;
				ctx.headers['content-length'] = range[1] - range[0] + 1;
				ctx.headers['content-range'] = 'bytes ' + range[0] + '-' + range[1] + '/' + stats.size;
				var stream = fs.createReadStream(staticFile, {start: range[0], end: range[1]});
			} else {
				ctx.headers['content-length'] = stats.size;
				var stream = fs.createReadStream(staticFile);
			}
// 			console.log("writing headers",util.inspect(ctx.headers));
			ctx.response.writeHead(ctx.status, ctx.headers);
			if(ctx.request.method == 'GET') {
				util.pump(stream, ctx.response);
			} else {
				ctx.response.end();
			}
		}
	}

	sendBytes();
    
    /**
	 * grasshopper fn. 1 line commented and 1 modified to directly set mime-type to "text.html"
	 * ctx.request , ctx.response, ctx.headers ( object )
	 */
    function satisfiesConditions(stats, ctx) {
		var mtime = stats.mtime,
			modifiedSince = new Date(ctx.request.headers['if-modified-since']),
			noneMatch = Number(ctx.request.headers['if-none-match']);

		if(modifiedSince && modifiedSince >= mtime) {
			var status = 304;
		} else if(noneMatch && noneMatch == mtime.getTime()) {
			var status = 304;
		}
		
		if(status) {
// 			ctx.extn = defaultViewExtn;
// 			ctx.headers['content-type'] = mime.mimes[defaultViewExtn];
			ctx.headers['content-type'] = mime.mimes["text/html"];
			delete ctx.headers['last-modified'];
			delete ctx.headers['content-disposition'];
			ctx.response.writeHead(status, ctx.headers);
			ctx.response.end();
			return false;
		} else {
			return true;
		}
	}
}
