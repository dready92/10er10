var fs = require("fs"),
	path = require("path"),
	util = require("util"),
	mime = require("mime"),
	d10 = require("./d10"),
	files = require("./files");



exports.statusCode = function (code) {
	if ( ! code )	return false;
	if ( code in httpStatusCodes ) {
		return httpStatusCodes[code];
	}
};



exports.localPathServer = function ( uri, localuri, cacheSettings ) {
	uri = uri.replace(/\/$/,"");
	if ( !uri.length )	return false;
	localuri = localuri.replace(/\/$/,"");
	if ( !localuri.length )	return false;
	cacheSettings = cacheSettings || {};
	if ( !d10.config.production && ! "bypass" in cacheSettings  )	cacheSettings.bypass = true;
	var cache = new files.fileCache(cacheSettings) ;
	return  function ( request, response, next ) {
		if ( ! request.ctx ) { request.ctx = {request: request, response: response}; }
		if ( ! request.ctx.headers ) { request.ctx.headers = {}; }
		request.ctx.headers["Accept-Ranges"] = "bytes";
		var url = path.normalize(request.url);
		if ( url.indexOf(uri) !== 0 ) { return next(); };
		var localFile = url.replace(uri,localuri);
		cache.stat(localFile, function(err, stats) {
			if(!err) {
				request.ctx.stats = stats;
				request.ctx.status = 200;
				request.ctx.headers["Content-Type"] = mime.lookup(localFile);
				sendStatic(localFile,stats,request.ctx,cache);
			} else {
				return next();
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

function sendStatic(staticFile, stats, ctx,cache) {
    function sendBytes() {
		if(satisfiesConditions(stats, ctx)) {
			ctx.headers['Last-Modified'] = stats.mtime.toUTCString();
			ctx.headers['Etag'] = stats.mtime.getTime();
			var range, stream;
			if(ctx.request.headers['range'] && (range = parseRange(ctx, stats))) {;
				ctx.status = 206;
				ctx.headers['Content-Length'] = range[1] - range[0] + 1;
				ctx.headers['Content-Range'] = 'bytes ' + range[0] + '-' + range[1] + '/' + stats.size;
				stream = cache.createReadStream(staticFile, {start: range[0], end: range[1]});
			} else {
				ctx.headers['Content-Length'] = stats.size;
				stream = cache.createReadStream(staticFile);
			}
			ctx.response.writeHead(ctx.status, ctx.headers);
			if(ctx.request.method == 'GET') {
				stream.pipe(ctx.response);
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
// 			ctx.headers['Content-Type'] = "text/html";
			delete ctx.headers['Last-Modified'];
			delete ctx.headers['Content-Disposition'];
			ctx.response.writeHead(status, ctx.headers);
			ctx.response.end();
			return false;
		} else {
			return true;
		}
	}
}
