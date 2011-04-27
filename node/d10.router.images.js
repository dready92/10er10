var d10 = require("./d10"),
			fs = require("fs"),
			files = require("./files"),
			gm = require("gm");

exports.api = function(app) {
	
	app.delete("/api/songImage/:id/:filename",function(request,response) {
		when(
			{
				doc: function(then) {
					d10.couch.d10.getDoc(request.params.id,then);
				},
				used: function(then) {
					d10.couch.d10.view("images/filename",{key: request.params.filename}, function(err,view) {
						if ( err ) {return then(err);}
						var back = [];
						view.rows.forEach(function(v) { back.push(v.id); });
						then(back);
					});
				}
			},
			function(errs,responses) {
				if ( errs ) {
					return d10.rest.err(423,errs,request.ctx);
				}
				var backOffset = responses.used.indexOf( responses.doc._id);
				if ( backOffset < 0 ) {
					// image not in the list of images for this doc
					return d10.rest.success(responses.doc, request.ctx);
				}
				
			}
		);
	});
	
	app.post("/api/songImage/:id",function(request,response) {
		if ( !request.query.filename || !request.query.filename.length 
			|| !request.query.filesize || !request.query.filesize.length ) {
			return d10.rest.err(427,"filename and filesize arguments required",request.ctx);
		}
		var fileName = d10.uid() + request.query.filename.split(".").pop();
		var writer = fs.createWriteStream( d10.config.images.tmpdir+"/"+fileName );
		var doc, onDoc = null ;
		d10.couch.d10.getDoc(request.params.id,function(err,resp) {
			if ( err ) {
				doc = false;
				return d10.rest.err(500,"filesystem error",request.ctx);
			}
			doc = resp;
			if ( onDoc ) {
				onDoc(doc);
			}
		});
		
		writer.on("close",function() {
			fs.stat(d10.config.images.tmpdir+"/"+fileName,function(err,stat) {
				if ( doc === false ) {
					return ;
				}
				if ( err ) {
					d10.rest.err(500,"filesystem error",request.ctx);
					return ;
				}
				if ( stat.size != request.query.filesize ) {
					d10.rest.err(500,"filesystem error (filesize does not match)",request.ctx);
					return ;
				}
				
				var recordDoc = function(doc, fileName, sha1) {
					if ( !doc.images ) {
						doc.images = [ {filename: fileName, sha1: sha1} ]
					} else {
						var alreadyIn = false;
						doc.images.forEach(function(v) {
							if ( v.sha1 == sha1 ) {
								alreadyIn = v.filename;
							}
						});
						if ( alreadyIn ) {
							return d10.rest.success({filename: alreadyIn, sha1: sha1}, request.ctx);
						} else {
							doc.images.push({filename: fileName, sha1: sha1});
						}
					}
					d10.couch.d10.storeDoc(doc, function(err,resp) {
						if ( err ) {return d10.rest.err(423,err,request.ctx);}
						return d10.rest.success({filename: fileName, sha1: sha1}, request.ctx);
					});
				};
				
				var processAndRecord = function(doc, fileName, sha1) {
					gm(d10.config.images.tmpdir+"/"+fileName).size(function(err,size) {
						if ( err ) {
							d10.rest.err(500,"image manipulation error (get image size failed)",request.ctx);
							return ;
						}
						if ( !size.width || !size.height ) {
							return d10.rest.err(500,"image manipulation error (get image size returns null)",request.ctx);
						}
						var newH, newW;
						if ( size.height > size.width ) {
							newH = size.height;
							newW = size.width / size.height * newH;
						} else {
							newW = size.width;
							newH = size.height / size.width * newW;
						}
						if ( !newH || !newW ) {
							return d10.rest.err(500,"image manipulation error (new image size returns null)",request.ctx);
						}
						gm(d10.config.images.tmpdir+"/"+fileName)
						.resize(newW,newH)
						.write(d10.config.images.dir+"/"+fileName,function(err) {
							if ( err ) {
								console.log("image writing failed",err);
								return d10.rest.err(500,"image manipulation error (writing modified image)",request.ctx);
							}
							recordDoc(doc, fileName, sha1);
						});

					});
				};
				
				onDoc = function(doc) {
					files.sha1_file(d10.config.images.tmpdir+"/"+fileName, function(err,sha1) {
						if ( err ) {
							d10.rest.err(500,"filesystem error (sha1sum failed)",request.ctx);
							return ;
						}
						sha1 = sha1.split(" ",2).shift();
						d10.couch.d10.view("images/sha1",{key: sha1}, function(err,view) {
							if ( err ) {return d10.rest.err(423,err,request.ctx);}
							if ( view.rows.length ) {
								recordDoc(doc,view.rows[0].filename, sha1);
							} else {
								fs.rename(d10.config.images.tmpdir+"/"+fileName, d10.config.images.dir+"/"+fileName, function(err) {
									if ( err ) { return d10.rest.err(500,"filesystem error (move failed)",request.ctx); }
									recordDoc(doc, fileName, sha1);
								});
							}
						});
					});
				};
				
				if ( doc ) { onDoc(doc); }
				
			});
			

			
			
		});
		
		request.pipe(writer);
		
	});
};