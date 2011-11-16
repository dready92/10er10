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
	/*
	app.post("/api/songImageOld/:id",function(request,response) {
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
				doc.images = lastVerDoc.images && lastVerDoc.images.length ? lastVerDoc.images.concat(toSet) : toSet;
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
*/
	app.post("/api/songImage/:id",function(request,response) {
		console.log(request.url,"START of process");
		if ( !request.query.filename || !request.query.filename.length 
			|| !request.query.filesize || !request.query.filesize.length ) {
			return d10.realrest.err(427,"filename and filesize arguments required",request.ctx);
		}
		when(
			{
				image: function(cb) {
					processImageUpload(request, request.query.filename, request.query.filesize, cb);
				},
				docs: function(cb) {
					d10.couch.d10.getDoc(request.params.id, function(err,doc) {
						if ( err ) { 
							console.log("Image upload: error in CouchDB docs retrieval");
							return cb({code: 423, message: err}); 
						}
						if ( doc.user != request.ctx.user._id ) {
							console.log("Image upload: no doc to update");
							return cb({code: 403, message: "You're not allowed to edit this document"}); 
						}
						return cb(null, [ doc ]);
					});
				}
			},
			function(errs,responses) {
				updateDocs(errs,responses,request);
			}
		);
	});
	
	app.post("/api/songImage",function(request,response) {
		console.log(request.url,"START of process");
		if ( !request.query.filename || !request.query.filename.length 
			|| !request.query.filesize || !request.query.filesize.length || !request.query.ids || !Array.isArray(request.query.ids) || !request.query.ids.length ) {
			return d10.realrest.err(427,"filename, filesize and ids arguments required",request.ctx);
		}
		
		when(
			{
				image: function(cb) {
					processImageUpload(request, request.query.filename, request.query.filesize, cb);
				},
				docs: function(cb) {
					d10.couch.d10.getAllDocs({keys: request.query.ids, include_docs: true}, function(err,resp) {
						if ( err ) { 
							console.log("Image upload: error in CouchDB docs retrieval");
							return cb({code: 423, message: err}); 
						}
						var docs = [];
						resp.rows.forEach(function(v) {
							if ( v.doc.user == request.ctx.user._id ) { docs.push(v.doc); }
						});
						if ( ! docs.length ) { 
							console.log("Image upload: no doc to update");
							return cb({code: 403, message: "You're not allowed to edit those documents"}); 
						}
						return cb(null, docs);
					});
				}
			},
			function(errs,responses) {
				updateDocs(errs,responses,request);
			}
		);
	});

	var updateDocs = function(errs,responses,request) {
		if ( errs ) {
			for ( var  i in errs ) {
				console.log("Got an error ",i, errs[i]);
			}
			
			if ( errs.docs && !errs.image && responses.image.isNew ) {
				// if documents won't be updated we should remove the image from the filesystem
				fs.unlink( d10.config.images.dir+"/"+responses.image.filename, function() {} );
			}
			for ( var  i in errs ) {
				return d10.realrest.err(errs[i].code, errs[i].message, request.ctx);
			}
		}
		
		// still got to update docs
		var toSet = {filename: responses.image.filename, sha1: responses.image.sha1};
		var jobs = {};
		responses.docs.forEach(function(doc) {
			jobs[doc._id] = updateOneDocWithImage(doc, toSet);
		});
		
		when ( jobs, function (es,rs) {
			if ( !d10.count(rs) ) {
				d10.realrest.err(500, "No doc was updated", request.ctx);
				if ( responses.image.isNew ) {
					fs.unlink( d10.config.images.dir+"/"+responses.image.filename, function() {} );
				}
				return ;
			}
			console.log(rs);
			responses.image.docs = [];
			for ( var i in rs ) {
				responses.image.docs.push(rs[i]);
			}
			d10.realrest.success(responses.image, request.ctx);
		});
	};
	
	var updateOneDocWithImage = function(doc,toSet) {
		return function(cb) {
			d10.couch.d10.getDoc(doc._id,function(err,lastVerDoc) {
				if ( err ) {
					return cb({code: 423, message: err});
				}

				if  ( !lastVerDoc.images ) {
					lastVerDoc.images = [ toSet ];
				} else {
					for ( var i = 0, len = lastVerDoc.images.length; i<len; i++ ) {
						if ( lastVerDoc.images[i].sha1 == toSet.sha1 ) {
							return cb(null, lastVerDoc);
						}
					}
					lastVerDoc.images = lastVerDoc.images.concat(toSet);
				}
				
				d10.couch.d10.storeDoc(lastVerDoc, function(err,resp) {
					if ( err ) {
						return cb({code: 423, message: err});
					}
					return cb(null,lastVerDoc);
				});
			});
		};
	};
	
	var processImageUpload = function(request, filename, filesize, then) {
		var fileName = d10.uid() + "." + filename.split(".").pop();
		files.writeStream(request, d10.config.images.tmpdir+"/"+fileName, function(err) {
			if ( err ) {
				return then({code:500, message: "filesystem error (file write failed)"});
			}
			fs.stat(d10.config.images.tmpdir+"/"+fileName,function(err,stat) {
				if ( err ) {
					return then({code:500, message: "filesystem error"});
				}
				if ( stat.size != filesize ) {
					return then({code:500, message: "filesystem error (filesize does not match)"});
				}

				files.sha1_file(d10.config.images.tmpdir+"/"+fileName, function(err,sha1) {
					if ( err ) {
						return then({code:500, message: "filesystem error (sha1sum failed)"});
					}
					sha1 = sha1.split(" ",2).shift();
					d10.couch.d10.view("images/sha1",{key: sha1}, function(err,view) {
						if ( err ) {
							return then({code:423, message: err});
						}
						if ( view.rows.length ) {
							return then(null, {filename: view.rows[0].value, sha1: sha1, isNew: false});
						} else {
							gu.resizeImage(
								d10.config.images.tmpdir+"/"+fileName,
								d10.config.images.dir+"/"+fileName,
								function(err) {
									if ( err ) {
										return then({code:500, message: err});
									}
									return then(null, {filename: fileName, sha1: sha1, isNew: true});
								}
							);
						}
					});
				});
			});
		});
	};
};