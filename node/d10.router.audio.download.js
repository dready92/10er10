var d10 = require ("./d10"),fs = require("fs"), util = require("util"),when = require("./when");

exports.api = function(app) {

	app.get("/audio/download/aa:id", function(request,response) {
        var extension = "ogg";
        if ( request.query.extension && request.query.extension.length ) {
          extension = request.query.extension.replace(/\W+/g,"");
        }
		var file = d10.config.audio.dir +"/"+ request.params.id.substr(0,1) + "/aa" + request.params.id+"."+extension;
		when(
			{
				doc: function(cb) {
					d10.couch.d10.getDoc("aa"+request.params.id,function(err,resp) {
						cb(err,resp);
					});
				},
				stat: function(cb) {
					fs.stat(file,cb);
				}
			},
			function(errs, r) {
				if ( errs ) {
					response.writeHead(501, request.ctx.headers );
					response.end ("Filesystem error");
				} else {
					request.ctx.headers["Content-Type"] = "application/octet-stream";
					request.ctx.headers["Content-Disposition"] = 'attachment; filename="'+r.doc.artist+' - '+r.doc.title+'.'+extension+'"';
					request.ctx.headers["Content-Transfer-Encoding"] = "binary";
					request.ctx.headers["Expires"] = "0";
					request.ctx.headers["Pagma"] = "no-cache";
					request.ctx.headers["Content-Length"] = ""+r.stat.size;
					response.writeHead(200, request.ctx.headers );
					fs.createReadStream(file).pipe(response);
				}
			}
		);
	});

}; // exports.api
