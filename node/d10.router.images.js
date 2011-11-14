var d10 = require("./d10"),
			fs = require("fs"),
			files = require("./files"),
			when = require("./when"),
			gm = require("gm"),
			gu = require("./graphicsUtils");

			
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
						then(null, back);
					});
				}
			},
			function(errs,responses) {
				
				console.log("when backs : ",responses.used  );
				
				if ( errs ) {
					return d10.realrest.err(423,errs,request.ctx);
				}
				
				var doc = responses.doc;
				
				var backOffset = responses.used.indexOf( doc._id);
				if ( backOffset < 0 ) {
					// image not in the list of images for this doc
					return d10.realrest.success(doc, request.ctx);
				}
				//remove image from doc
				doc.images = doc.images.filter(function(img) {
					if ( img.filename == request.params.filename ) {
						return false;
					}
					return true;
				});
				
				d10.log("Image found in ",responses.used);
				
				d10.couch.d10.storeDoc(doc,function(err,resp) {
					if ( err ) {
						return d10.realrest.err(423,errs,request.ctx);
					}
					d10.realrest.success(doc, request.ctx);
					if ( responses.used.length == 1 ) {
						// I can remove the image
						fs.unlink(d10.config.images.dir+"/"+request.params.filename,function(err) {
							if ( err ) {
								d10.log("image unlink failed",d10.config.images.dir+"/"+request.params.filename);
							}
						});
					}
				});
			}
		);
	});
	
	app.post("/api/songImage/:id",function(request,response) {
		console.log(request.url,"START of process");
		if ( !request.query.filename || !request.query.filename.length 
			|| !request.query.filesize || !request.query.filesize.length ) {
			return d10.realrest.err(427,"filename and filesize arguments required",request.ctx);
		}
		var fileName = d10.uid() + "." + request.query.filename.split(".").pop();
		var recordDocCallback = function(err,resp) {
			if ( err ) {
				return d10.realrest.err(err.code, err.message, request.ctx);
			}
			return d10.realrest.success(resp,request.ctx);
		};

		var recordDoc = function(doc, fileName, sha1, then) {
			var toSet = null;
			if ( !doc.images ) {
				toSet = [ {filename: fileName, sha1: sha1} ];
			} else {
				var alreadyIn = false;
				doc.images.forEach(function(v) {
					if ( v.sha1 == sha1 ) {
						alreadyIn = v.filename;
					}
				});
				if ( alreadyIn ) {
					return then(null,{filename: alreadyIn, sha1: sha1});
				} else {
					toSet = [{filename: fileName, sha1: sha1}];
				}
			}
			// re-get doc to have the good _rev
			d10.couch.d10.getDoc(doc._id,function(err,lastVerDoc) {
				if ( err ) {
					return then({code: 423, message: err});
				}
				doc._rev = lastVerDoc._rev;
// 						console.log("doc.images: ",lastVerDoc.images);
				doc.images = lastVerDoc.images && lastVerDoc.images.length ? lastVerDoc.images.concat(toSet) : toSet;
// 						console.log("doc.images 2: ",doc.images);
				d10.couch.d10.storeDoc(doc, function(err,resp) {
					if ( err ) {
						return then({code: 423, message: err});
					}
					return then(null,{filename: fileName, sha1: sha1});
				});
			});
		};

		var jobs = {}
		jobs.writeFile = function(then) {
			files.writeStream(request, d10.config.images.tmpdir+"/"+fileName, function(err) {
				if ( err ) {
					return then({code:500, message: "filesystem error (file write failed)"});
				}
				fs.stat(d10.config.images.tmpdir+"/"+fileName,function(err,stat) {
					if ( err ) {
						return then({code:500, message: "filesystem error"});
					}
					if ( stat.size != request.query.filesize ) {
						return then({code:500, message: "filesystem error (filesize does not match)"});
					}
					then();
				});
			});
		};
		jobs.getDoc = function(then) {
			d10.couch.d10.getDoc(request.params.id,function(err,resp) {
				if ( err ) {
					return then({code:500, message: "database error (document not found)"});
				}
				then(null,resp);
			});
		};
		
		when(
			jobs,
			function(errs,responses) {
				if ( errs ) {
					for ( var i in errs ) {
						console.log("returning image upload error due to ",i, errs[i]);
						return d10.realrest.err(errs[i].code, errs[i].message, request.ctx);
					}
				}
				onDoc( responses.getDoc );
				
			}
		);
		
		var onDoc = function(doc) {
			if ( doc.user != request.ctx.user._id ) {
				return d10.realrest.err(403,"You're not allowed to update this document",request.ctx);
			}
			files.sha1_file(d10.config.images.tmpdir+"/"+fileName, function(err,sha1) {
				if ( err ) {
					return d10.realrest.err(500,"filesystem error (sha1sum failed)",request.ctx);
				}
				sha1 = sha1.split(" ",2).shift();
				d10.couch.d10.view("images/sha1",{key: sha1}, function(err,view) {
					if ( err ) {return d10.realrest.err(423,err,request.ctx);}
					if ( view.rows.length ) {
						recordDoc(doc,view.rows[0].value, sha1, recordDocCallback);
					} else {
						gu.resizeImage(
							d10.config.images.tmpdir+"/"+fileName,
							d10.config.images.dir+"/"+fileName,
							function(err) {
								if ( err ) {
									return d10.realrest.err(500,err,request.ctx);
								}
								recordDoc(doc,fileName, sha1, recordDocCallback);
							}
						);
					}
				});
			});
		};
	});
};