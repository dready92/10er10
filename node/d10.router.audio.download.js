var d10 = require ("./d10"),fs = require("fs"), util = require("util"),when = require("./when");

exports.api = function(app) {

	app.get("/audio/download/aa:id", function(request,response) {
		var file = d10.config.audio.dir +"/"+ request.params.id.substr(0,1) + "/aa" + request.params.id+".ogg";
		d10.log("debug","sending",file);
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
					d10.log(errs);
					response.writeHead(501, request.ctx.headers );
					response.end ("Filesystem error");
				} else {
					request.ctx.headers["Content-Type"] = "application/octet-stream";
					request.ctx.headers["Content-Disposition"] = 'attachment; filename="'+r.doc.artist+' - '+r.doc.title+'.ogg"';
					request.ctx.headers["Content-Transfer-Encoding"] = "binary";
					request.ctx.headers["Expires"] = "0";
					request.ctx.headers["Pagma"] = "no-cache";
					request.ctx.headers["Content-Length"] = ""+r.stat.size;
					response.writeHead(200, request.ctx.headers );
					util.pump(fs.createReadStream(file),response);
				}
			}
		);
		/*
			header('Content-Type: "'.$mime.'"');
			header('Content-Disposition: attachment; filename="'.$filename.'"');
			header("Content-Transfer-Encoding: binary");
			header('Expires: 0');
			header('Pragma: no-cache');
			header("Content-Length: ".strlen($data));
	
								request.ctx.headers["Content-Type"] = "application/octet-stream";
								request.ctx.headers["Content-Disposition"] = 'attachment; filename="'+doc.artist+' - '+doc.title+'"';
								request.ctx.headers["Content-Transfer-Encoding"] = "binary";
								request.ctx.headers["Expires"] = "0";
								request.ctx.headers["Pagma"] = "no-cache";
								request.ctx.headers["Content-Length"] = "";
*/
				
		
		
		
	});

}; // exports.api