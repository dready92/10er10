var d10 = require ("./d10"),fs = require("fs"), util = require("util");

exports.api = function(app) {

	app.get("/audio/download/aa:id", function(request,response) {
		var file = d10.config.audio.dir +"/"+ request.params.id.substr(0,1) + "/aa" + request.params.id+".ogg";
		d10.log("debug","sending",file);
		d10.when(
			{
				doc: function(cb) {
					d10.couch.d10.getDoc("aa"+request.params.id,function(err,resp) {
						cb(err,resp);
					});
					/*
					d10.db.db("d10").getDoc(
						{
							success: function(doc) {
								cb(null,doc);
							},
							error: function(e,err) {
								cb(err);
							}
						},
						"aa"+request.params.id
					);
					*/
				},
				stat: function(cb) {
					fs.stat(file,cb);
					/*
					fs.stat(file,function(err,resp) {
						if ( err ) {
							cb(err);
						} else {
							cb(null,resp);
						}
					});
					*/
				}
			},
			function(r) {
				request.ctx.headers["Content-Type"] = "application/octet-stream";
				request.ctx.headers["Content-Disposition"] = 'attachment; filename="'+r.doc.artist+' - '+r.doc.title+'.ogg"';
				request.ctx.headers["Content-Transfer-Encoding"] = "binary";
				request.ctx.headers["Expires"] = "0";
				request.ctx.headers["Pagma"] = "no-cache";
				request.ctx.headers["Content-Length"] = ""+r.stat.size;
				response.writeHead(200, request.ctx.headers );
				util.pump(fs.createReadStream(file),response);
			},
			function(errs) {
				d10.log(errs);
				response.writeHead(501, request.ctx.headers );
				response.end ("Filesystem error");
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