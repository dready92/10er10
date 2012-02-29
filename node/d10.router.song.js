var d10 = require ("./d10"),
	querystring = require("querystring"),
	fs = require("fs"),
	files = require("./files"),
	when = require("./when"),
	audioUtils = require("./audioFileUtils"),
	gu = require("./graphicsUtils"),
	spawn = require('child_process').spawn,
	exec = require('child_process').exec,
	supportedAudioTypes = [ "audio/mpeg", "audio/mp4", "application/ogg", "audio/x-flac" ];

exports.api = function(app) {
	app.get("/api/review/list", function(request, response) {
		d10.couch.d10.view("user/song",{key: [request.ctx.user._id,false],include_docs: true},function(err,resp) {
			if ( err ) {
				d10.realrest.err(423, d10.http.statusMessage(423), request.ctx.headers );
				return ;
			}
			var r = [];
			if( resp.rows && resp.rows.length ) {
				resp.rows.forEach(function(v) { r.push(v.doc); });
			}
			d10.realrest.success(r,request.ctx);
		});
	});
	app.get("/html/my/review", function(request,response) {
		request.ctx.headers["Content-Type"] = "text/html";
		d10.couch.d10.view("user/song",{key: [request.ctx.user._id,false],include_docs: true},function(err,resp) {
			if ( err ) {
				response.writeHead(423, d10.http.statusMessage(423), request.ctx.headers );
				response.end();
				return ;
			}
			response.writeHead(200, request.ctx.headers );
			if( resp.rows && resp.rows.length ) {
				var r = [];
				resp.rows.forEach(function(v) { r.push(v.doc); });
				d10.lngView(request,"review/list",{rows: r},{},function(data) {
					response.end(data);
				});
			} else {
				d10.lngView(request,"review/none",{},{},function(data) {
					response.end(data);
				});
			}
		});
	});
	
	app.put("/api/meta/:id",function(request,response,next) {
// 		d10.log("debug","Taking");
		if ( request.params.id.substr(0,2) != "aa" ) {
			return next();
		}
		d10.log("debug","Still here");
		var body = "";
		request.setEncoding("utf8");
		request.on("data",function(chunk) {
			body+=chunk;
		});
		request.on("end",function() {
			if ( !body.length ) {
				return d10.realrest.err(417,"no parameter sent",request.ctx);
			}
			request.body = querystring.parse(body);
			var fields = {};
			var errors = {};
			fields.title = request.body.title ? d10.sanitize.string(request.body.title) : "";
			fields.artist = request.body.artist ? d10.sanitize.string(request.body.artist) : "";
			if ( !d10.config.allowCustomGenres ) {
				fields.genre = request.body.genre? d10.sanitize.genre(request.body.genre) : "";
			} else {
				fields.genre = request.body.genre && request.body.genre.length ? request.body.genre : "Other";
			}
			when (
				{
					title: function(cb) {
						if ( !fields.title.length ) {
							d10.lngView(request,"inline/review_err_no_title",{},{},cb);
						} else {
							cb();
						}
					},
					artist: function(cb) {
						if ( !fields.artist.length ) {
							d10.lngView(request,"inline/review_err_no_artist",{},{},cb);
						} else {
							cb();
						}
					},
					genre: function(cb) {
						if ( !fields.genre.length ) {
							d10.lngView(request,"inline/review_err_unknown_genre",{},{},cb);
						} else {
							cb();
						}
					}
				},
				function(errs,responses) {
					if ( responses.title && responses.title.length ) {
						errors.title = responses.title;
					}
					if ( responses.artist && responses.artist.length ) {
						errors.artist = responses.artist;
					}
					if ( responses.genre && responses.genre.length ) {
						errors.genre = responses.genre;
					}
					if ( d10.count(errors) ) {
/*						request.ctx.headers["Content-Type"] = "application/json";
						response.writeHead(200,request.ctx.headers);
						response.end(JSON.stringify(
							{
								status: "error",
								data: {
									code: 6,
									message: d10.http.statusMessage(425)
								},
								fields: errors
							}
										));*/
						d10.realrest.err(412,errors,request.ctx);
						return ;
					}
					if ( request.body.album ) {
						fields.album = d10.sanitize.string(request.body.album);
					}
					if ( request.body.tracknumber && !isNaN(parseInt(request.body.tracknumber,10)) ) {
						fields.tracknumber = parseInt(request.body.tracknumber,10);
					}
					if ( request.body.date && !isNaN(parseInt(request.body.date,10)) ) {
						fields.date= parseInt(request.body.date,10);
					}
					
					fields.valid = true;
					fields.reviewed = true;
				
					d10.couch.d10.getDoc(request.params.id,function(err,doc) {
						if ( err ) {
							d10.log("debug","getDoc error");
							d10.realrest.err(err.statusCode, err.statusMessage, request.ctx);
							return ;
						}
						
						if ( doc.user != request.ctx.user._id && !request.ctx.user.superman ) {
							d10.log("debug",request.ctx.user._id,"Not allowed to edit", doc._id);
							d10.realrest.err(403, "Forbidden", request.ctx);
							return ;
							
						}
						
						for ( var i in fields ) {
							doc[i] = fields[i];
						}
						d10.couch.d10.storeDoc(doc, function(err,resp) {
							if ( err ) {
								d10.log("debug","storeDoc error");
								d10.realrest.err(err.statusCode, err.statusMessage, request.ctx);
							}else {
								d10.log("debug","storeDoc success");
								d10.realrest.success(doc,request.ctx);
								d10.couch.d10wi.storeDoc({_id: doc._id, hits: 0});
							}
						});
					});
				}
			);
		});
	});
	
	
	
	
	app.put("/api/song", function(request,response) {
		if ( !request.query.filename || !request.query.filename.length 
			|| !request.query.filesize || !request.query.filesize.length ) {
			return d10.realrest.err(427,"filename and filesize arguments required",request.ctx);
		}
		
		var realWrite = response.write;
        response.write = function(d) {
          console.log("writing: ",d);
          realWrite.apply(this,arguments);
        };
		
        var answered = false;
		
		var safeErrResp = function(code,data,ctx) {
			printEncodingFailure();
			d10.log("debug",jobid," sending errorResponse ",code);
			d10.log("debug",jobid,data);
            if ( answered ) { return false;}
            answered = true;
			if ( errResponse ) return ;
			errResponse = {code: code, data: data};
			if ( job.requestEnd ) {d10.realrest.err(code,data,ctx);}
			else	{ request.on("end",function() {d10.realrest.err(code,data,ctx);}); }
		};
		
		var safeSuccessResp = function(data, ctx) {
            if ( answered ) { return false;}
            answered = true;

			if ( errResponse != null ) {
				d10.log("debug",jobid, "Strange: got to send success but already sent error...");
				d10.log("debug",jobid, "errCode", errResponse.code);
				d10.log("debug",jobid, "errData", errResponse.data);
				return ;
			}
			d10.realrest.success(data,ctx);
		};
		
		var bytesCheck = function() {
			var min = 5000;
			d10.log("debug",jobid,job.fileWriter.bytesWritten());
			if ( job.fileWriter.bytesWritten() > min ) {
				clearInterval(bytesIval);
				bytesIval = null;
				job.run("fileType");
			}
		};

		var uploadComplete = false, // the flag telling if the data uploaded is complete
			bytesIval = null,	// bytes checker interval
			errResponse = null  // the error response to send
			; 
		
		var jobid = "aa"+d10.uid(),job = {
			id: jobid,
			fileName: jobid+".mp3",
			fileType: null,
			fileSha1: null,
			oggName: jobid+".ogg",
			oggLength: null,
			fileWriter: null,
			spawns: [],
			requestEnd: false,
			decoder: null,
			oggWriter: null,
			bufferJoin: 8,
			inputFileBuffer: {status: true, buffer: []},
			tasks: {
				oggEncode: {
					status: null, // null (rien), true (running) or false (stopped)
					run: function(then) {
						d10.log("debug",jobid,"-----------------------------------------------");
						d10.log("debug",jobid,"-------      Create OGG encoding        -------");
						d10.log("debug",jobid,"-----------------------------------------------");
						if ( !job.decoder ) {
							d10.log("debug",jobid,"error: job.decoder not set");
							then({message: "decoder not initialized"});
							return ;
						}
						var args = d10.config.cmds.oggenc_opts.slice();
						args.push(d10.config.audio.tmpdir+"/"+this.oggName,"-");

						job.oggWriter = spawn(d10.config.cmds.oggenc, args);
						job.oggWriter.on("exit",function(code) {
							d10.log("debug",jobid,"launching oggWriter end of operation callback");
							then(code ? code : null,null);
						});
						job.decoder.on("exit",function() { d10.log("debug","job.decoder exited"); });
                        job.oggWriter.stdin.on("error",function(err) {console.log("Oggwriter error",err);});
                        job.decoder.stdout.pipe(job.oggWriter.stdin);
						function writeBuffer() {
							if ( ! job.inputFileBuffer.buffer.length ) {
								if ( job.requestEnd ) {
									job.decoder.stdin.end();
								} else {
									d10.log("debug",jobid,"================= Decoder pumping from request ===============");
                                    request.on("error",function(err) {console.log("request error", err);});
                                    request.pipe(job.decoder.stdin);
									job.inputFileBuffer.status = false;
								}
								return ;
							}
							
							d10.log("debug",jobid,"Size: ",job.inputFileBuffer.buffer.length," bufferJoin: ",job.bufferJoin);
							var buffer = files.bufferSum(
								job.inputFileBuffer.buffer.splice(0, job.inputFileBuffer.buffer.length <= job.bufferJoin ? job.inputFileBuffer.buffer.length : job.bufferJoin)
							);
							var writeOk = job.decoder.stdin.write(buffer);
							if ( writeOk ) { writeBuffer(); } 
							else {
								job.decoder.stdin.once("drain",function() {writeBuffer();});
							}
						};
						if ( job.tasks.fileType.response != "audio/mp4" ) {// faad does not support stdin streaming
							writeBuffer();
						}
					}
				},
				fileType: {
					status: null,
					run: function(then) {
						if ( request.query.filename.match(/mp3$/i) ) {
							job.fileType = "audio/mpeg";
							return then(null,"audio/mpeg");
						}
						d10.fileType(d10.config.audio.tmpdir+"/"+this.fileName, function(err,type) {
								if ( !err ) {
									job.fileType = type;
								}
								then(err,type);
							}
						);
					}
				},
				fileMeta: {
					status: null,
					run: function(then) {
                        audioUtils.extractTags(d10.config.audio.tmpdir+"/"+this.fileName,function(err,cb) {
                            then(err,cb);
                        });
					}
				},
				oggLength: {
					status: null,
					run: function(then) {
						var file = (this.tasks.fileType.response == "application/ogg" ) ? this.fileName : this.oggName ;
						audioUtils.oggLength(d10.config.audio.tmpdir+"/"+file,function(err,len) {
							if ( !err ) {
								if ( len && len.length && len.length > 2 ) {
									len = 60*parseInt(len[1],10) + parseInt(len[2],10);
								}
							}
							then(err,len);
						});
					}
				},
				sha1File: {
					status: null,
					run: function(then) {
						files.sha1_file(d10.config.audio.tmpdir+"/"+this.fileName, function(err,resp) {
							if ( !err ) {
								resp = resp.split(" ",2).shift();
							}
							then(err,resp);
						});
					}
				},
				sha1Check: {
					status: null,
					run: function(then) {
						if ( this.tasks.sha1File.err ) {
							return then(err);
						} else if ( !this.tasks.sha1File.response || !this.tasks.sha1File.response.length ) {
							return then("Sha1 not available");
						}
						d10.couch.d10.view("song/sha1",{key: this.tasks.sha1File.response}, function(err,resp) {
							if ( err ) {
								then(501);
							} else if (!resp.rows || resp.rows.length) {
								then(433);
							} else {
								then(null,null);
							}
						});
					}
				},
				cleanupTags: {
					status: null,
					run: function(then) {
// 						if ( this.tasks.fileMeta.err ) {
// 							cleanupFileSystem();
// 							return ;
// 						}
						if ( !this.tasks.fileMeta.response ) { this.tasks.fileMeta.response={}; }
						var tags = {};
						var that=this;
						
						if ( this.tasks.fileMeta.response.GENRE ) {
							var value = "";
							d10.config.genres.forEach(function(v,k) {
								if ( that.tasks.fileMeta.response.GENRE == v.toLowerCase() ) {
									value=v;
								}
							});
							tags.genre = value.length ? value : that.tasks.fileMeta.response.GENRE ;
						}
						
						['ALBUM','ARTIST','TITLE'].forEach(function(v,k) {
							if ( that.tasks.fileMeta.response[v] ) {
								tags[v] = d10.ucwords(that.tasks.fileMeta.response[v].toLowerCase());
							}
						});
						['ALBUM','TRACKNUMBER','ARTIST','TITLE','GENRE','DATE'].forEach(function(v,k) {
							if ( that.tasks.fileMeta.response[v] ) { tags[v] = that.tasks.fileMeta.response[v]; }
							else { tags[v] = null }
						});
						then(null,tags);
					}
				},
				moveFile: {
					status: null,
					run: function(then) {
						var c = this.id[2],
							filename = this.oggName,
							sourceFile = d10.config.audio.tmpdir+"/";
							sourceFile+= (this.tasks.fileType.response == "application/ogg" ) ? this.fileName : this.oggName ;
						d10.log("debug",jobid,"moveFile : ",sourceFile," -> ",d10.config.audio.dir+"/"+c+"/"+filename);
						var moveFile = function() {
							fs.rename(
								sourceFile,
								d10.config.audio.dir+"/"+c+"/"+filename,
								then
							);
						};
						fs.stat(d10.config.audio.dir+"/"+c,function(err,stat) {
							if ( err ) {
								d10.log("debug",jobid,"moveFile", err);
							}
							if ( err && err.errno != 2 && err.code != "ENOENT" ) { // err.code == ENOENT = no such file on node > 0.5.10
								then(err);
							} else if ( err ) {
								fs.mkdir(d10.config.audio.dir+"/"+c,0775, function(err,stat) {
									if ( err ) {
										then(err);
									} else {
										moveFile();
									}
								});
							} else {
								moveFile();
							}
						});
					}
				},
				applyTagsToFile: {
					status: null,
					run: function(then) {
                        var c = this.id[2];
						audioUtils.setOggtags(d10.config.audio.dir+"/"+c+"/"+this.oggName,this.tasks.cleanupTags.response,function(err,cb) {
							then(err,cb);
						});
					}
				},
				createDocument: {
					status: null,
					run: function(then) {
						
						var resp = this.tasks.oggLength.response, duration = 0;
						if ( 
							Object.prototype.toString.call(resp) === '[object Array]' &&
							resp.length > 2 && 
							!isNaN(parseFloat(resp[1])) && 
							!isNaN(parseFloat(resp[2])) 
						) {
							duration = parseFloat(resp[1])*60 + parseFloat(resp[2]);
						} else {
							duration = this.tasks.oggLength.response;
						}
						
						var doc = {
							_id: this.id,
							filename: request.query.filename,
							sha1: this.tasks.sha1File.response,
							user: request.ctx.user._id,
							reviewed: false,
							valid: false,
							ts_creation: new Date().getTime(),
							hits: 0,
							duration: duration
						};
						for ( var index in this.tasks.cleanupTags.response ) {
							var k = index.toLowerCase(),
								v = this.tasks.cleanupTags.response[index];
							if ( k == "date" || k == "tracknumber" ) {
								doc[k] = parseFloat(v);
								if ( isNaN(doc[k]) )	doc[k]=0;
							} else {
								doc[k] = v;
							}
						}
						if ( typeof doc.title == "string" && doc.title.length &&
							typeof doc.artist == "string" && doc.artist.length ) {
							doc.valid = true;
						}
						
						// test for tracknumber and get it from filename if possible
						if ( doc.tracknumber == 0 ) {
							var tracknumberFromFilename = doc.filename.match(/^[0-9]+/);
							if ( tracknumberFromFilename ) {
								doc.tracknumber = parseInt( tracknumberFromFilename[0] , 10);
							}
						}
						
						
//  						return then(null,doc);
						var recordDoc = function() {
							d10.couch.d10.storeDoc(doc,function(err,resp) {
								if ( err ) { then(err); }
								else {
									doc._rev = resp.rev;
									then(null,doc);
								}
							});
						};

						if ( this.tasks.fileMeta.response && this.tasks.fileMeta.response.PICTURES && this.tasks.fileMeta.response.PICTURES.length ) {
							gu.imageFromMeta(this.tasks.fileMeta.response,function(err,resp) {
								d10.log("debug",jobid,"imageFromMeta response",err,resp);
								if ( !err ) {
									doc.images = [ resp ];
								}
								recordDoc();
							});
						} else {
							recordDoc();
						}
					}
				}
			},
			queue: [],
			run: function(taskName) {
				if ( this.tasks[taskName] && this.tasks[taskName].status === null &&  this.queue.indexOf(taskName) < 0 ) {
					this.queue.push(taskName);
                    d10.log("debug",jobid,"Launch task ", taskName);
					this.tasks[taskName].run.call(this, function(err,resp) { job.endOfTask.call(job,taskName,err,resp); });
				}
			},
			endOfTask: function(taskName, err,resp) {
                if ( err ) {
                  d10.log("debug",jobid, "End of task ",taskName," in error:", err);
                } else {
                  d10.log("debug",jobid, "End of task ",taskName," without error:");
                }
				var i = this.queue.indexOf(taskName);
				if ( i >= 0 ) {
					this.queue.splice(i,1);
				}
				this.tasks[taskName].status = false;
				this.tasks[taskName].err = err;
				this.tasks[taskName].response = resp;
				this.emit(taskName+":complete",[err,resp]);
				if ( this.allCompleteCallbacks.length && !this.running() ) {
					while ( cb = this.allCompleteCallbacks.shift() ) {
						cb.call(this);
					}
				}
			},
			callbacks: {},
			bind: function(evt,cb,once) {
				if ( this.callbacks[evt] )	this.callbacks[evt].push({cb:cb, once: once});
				else						this.callbacks[evt]=[{cb:cb, once: once}];
			},
			once: function(evt,cb) {
				this.bind(evt,cb,true);
			},
			emit: function(evt,data) {
				d10.log("debug",jobid,"JOB: emit "+evt);
				if ( this.callbacks[evt] ) {
					var remove = [];
					this.callbacks[evt].forEach(function(v,k) {
						var env = {type: evt};
						v.cb.apply(env,data);
						if ( v.once ) { remove.push(k); }
					});
					callbacks = this.callbacks;
					remove.forEach(function(v) { callbacks[evt].splice(v,1); });
				}
			},
			complete: function(task, cb) {
				if ( !this.tasks[task] ) { return false; }
				if ( this.tasks[task].status === false ) {
					cb.call(this,this.tasks[task].err, this.tasks[task].response);
				}
				this.bind(task+":complete",cb);
			},
			running: function() {
				var count = 0;
				for ( var t in this.tasks ) {
					if ( this.tasks[t].status === true ) count++;
				}
				return count;
			},
			allCompleteCallbacks: [],
			allComplete: function(cb) {
				if ( this.running() ) {
					this.allCompleteCallbacks.push(cb);
				} else {
					cb.call(this);
				}
			}
		};
		
		var printEncodingFailure = function() {
			d10.log("debug",jobid,"--------- Encoding failure ----------");
			for ( var i in job.tasks ) {
				d10.log("debug", jobid, i, job.tasks[i].err ? job.tasks[i].err : "");
			}
			d10.log("debug",jobid,"-------------------------------------");

		};
		
// 		d10.log("debug","filename : ",job.fileName,"ogg name : ",job.oggName);
		job.complete("oggEncode",function(err,resp) {
			if ( err ) {
				d10.log("debug",jobid,"SEVERE: error on oggEncode task",err);
				job.allComplete(function() { safeErrResp(422,err,request.ctx); });
			} else {
				job.emit("oggAvailable",[]);
			}
		});
		job.complete("fileType",function(err,resp) {
			d10.log("debug",jobid,"filetype complete : ",resp);
			if ( err ) {
				job.allComplete(function() { safeErrResp(421,err,request.ctx); });
			}
			if ( resp == "audio/mpeg" ) {
				job.decoder = spawn(d10.config.cmds.lame, d10.config.cmds.lame_opts);
				job.spawns.push(job.decoder);
				job.run("oggEncode");
// 				job.run("fileMeta");
			} else if ( resp == "audio/x-flac" ) {
				job.decoder = spawn(d10.config.cmds.flac, d10.config.cmds.flac_opts);
				job.spawns.push(job.decoder);
				job.run("oggEncode");
			} else if ( resp == "audio/mp4" ) {
				d10.log("debug",jobid, "It's m4a, will launch decoder later");
			} else {
				job.inputFileBuffer.status = false;
				job.inputFileBuffer.buffer = [];
				if ( resp != "application/ogg" ) {
					job.allComplete(function() { safeErrResp(415,resp,request.ctx); });
				}
			}
		});

		request.on("uploadCompleteAndFileTypeAvailable", function() {
			if ( job.tasks.fileType.response == "audio/mp4" ) {
				var args = d10.config.cmds.faad_opts.join("\n").split("\n");
				args.push(d10.config.audio.tmpdir+"/"+job.fileName);
				job.decoder = spawn(d10.config.cmds.faad, args);
				job.decoder.stderr.on('data', function (data) {
					d10.log("debug",jobid,'stderr: ' + data);
				});
				job.spawns.push(job.decoder);
				job.run("oggEncode");
			}
		});
		
		/* File meta data failure should not stop encoding
		
		job.complete("fileMeta",function(err,data) {
			if ( err ) {
				return safeErrResp(503,err,request.ctx);
			}
			
		});
		*/
		
		job.complete("sha1File",function(err,resp) {
			if ( err ) {
				return safeErrResp(433,err,request.ctx);
			}
			job.run("sha1Check");
		});
		
		job.complete("sha1Check",function(err,resp) {
			if ( err ) {
				safeErrResp(433,err,request.ctx);
				fs.unlink(d10.config.audio.tmpdir+"/"+job.fileName);
				job.complete("oggEncode",function() {fs.unlink(d10.config.audio.tmpdir+"/"+job.oggName);});
                if ( job.oggWriter && job.oggWriter.kill ) {
                  job.oggWriter.kill();
                }
				return ;
			}
		});
		job.complete("moveFile",function(err,resp) {
// 			d10.log("debug","moveFile finished");
			if ( err ) {
				return safeErrResp(432,err,request.ctx);
			}
			if ( job.tasks.fileType.response != "application/ogg" ) { // if the file is not an ogg we move it
				d10.log("debug",jobid, "unlink file ",d10.config.audio.tmpdir+"/"+job.fileName);
				fs.unlink(d10.config.audio.tmpdir+"/"+job.fileName,function()  {});
			}
			if ( job.tasks.fileMeta.status === null ) {
				job.complete("fileMeta",function() {  job.run("cleanupTags"); });
			} else {
				job.run("cleanupTags"); 
			}
		});
		
		job.complete("cleanupTags",function(err,resp) {
			job.run("createDocument");
			job.run("applyTagsToFile");
		});
		
		job.complete("createDocument",function(err,resp) {
			d10.log("debug",jobid,"db document recorded, sending success");
			safeSuccessResp(resp,request.ctx);
		});
		
		
		job.once("oggAvailable",function() {
			d10.log("debug",jobid,"OGG FILE IS AVAILABLE ! ");
			job.run("oggLength");
			var steps = ["oggLength","sha1File","fileMeta"],
				complete = 0,
				onAllComplete = function() {
					if ( job.tasks.sha1File.err ) {
						safeErrResp(503,job.tasks.sha1File.err,request.ctx);
					} else if ( job.tasks.oggLength.err || job.tasks.oggLength.response == 0 ) {
						safeErrResp(436,job.tasks.oggLength.err,request.ctx);
					} else {
						d10.log("debug",jobid,"GOT EVERYTHING I NEED TO PROCEED WITH RECORDING OF THE SONG");
						
						job.complete("sha1Check",function(err,resp) {
							d10.log("debug",jobid,"sha1check is complete, let's go recording the song !");
							if ( !err ){
								job.run("moveFile");
							}
						});
						job.run("sha1Check");
					}
				};
			steps.forEach(function(v,k) {
				if ( job.tasks[v].status === false ) {
					complete++;
				} else {
					job.complete(v,function() {
						complete++;
						if ( complete == steps.length ) {
							onAllComplete();
						}
					});
					if ( job.tasks[v].status === null ) {
						job.run(v);
					}
					
				}
			});
			if ( complete == steps.length ) {
				onAllComplete();
			}
		});

		request.on("error",function(){
			d10.log("debug",jobid,"request ERROR !");
			d10.log("debug",jobid,arguments);
            cleanupFileSystem();
		});
		
        request.on("close",function(){
            d10.log("debug",jobid,"request CLOSE !");
            d10.log("debug",jobid);
            cleanupFileSystem();
        });
        
		request.connection.on("error",function(){
			d10.log("debug",jobid,"request connection ERROR !");
			d10.log("debug",jobid,arguments);
		});
		
		var cleanupFileSystem = function() {
			if ( job.spawns.length ) {
				var j;
				while ( j = job.spawns.pop() ) {
					try {
						j.kill();
					} catch(e) {}
				}
			}
			
			if ( job.oggWriter ) {
				job.oggWriter.kill();
			}
			fs.unlink(d10.config.audio.tmpdir+"/"+job.oggName);
			fs.unlink(d10.config.audio.tmpdir+"/"+job.fileName);
		};
        /*
		request.connection.on("close",function(err){
			d10.log("debug",jobid,"request connection CLOSE !");
			d10.log("debug",jobid,arguments);
			d10.log("debug",jobid,"requestEnd",job.requestEnd);
			if ( job.requestEnd === false ) {
				// client connection failed to send us the complete data
				cleanupFileSystem();
			}
		});
		*/
		request.on("end",function() {
			job.requestEnd = true;
			d10.log("debug",jobid,"got request end");
			if ( bytesIval ) { clearInterval(bytesIval); }
			if ( job.fileWriter  ) {
				if ( job.tasks.fileType.status === null ) {
					job.fileWriter.close(function() {
						d10.log("debug",jobid,"launching fileType job after filewriter close");
						job.run("fileType");
					});
				} else {
					job.fileWriter.close();
				}
			} else {
				response.writeHead(200, {'Content-Type': 'text/plain'});
				response.end('Nothing sent\n');
			}
		});
		
		request.on("data",function(chunk) {
			
			if ( !job.fileWriter  ) {
				
				d10.log("debug",jobid,"creating fileWriter");
				job.fileWriter  = new files.fileWriter(d10.config.audio.tmpdir+"/"+job.fileName);
				d10.log("debug",jobid,"settings bytescheck interval");
				bytesIval = setInterval(bytesCheck,500);
				d10.log("debug",jobid,"interval = ", bytesIval);
				job.fileWriter.open();

				job.fileWriter.on("end", function() {
					if ( parseInt(request.query.filesize) != job.fileWriter.bytesWritten() ) {
						return safeErrResp(421, request.query.filesize+" != "+n,request.ctx);
					}
					job.bufferJoin = 20;
					
					if ( job.tasks.fileType.status === false &&
						 supportedAudioTypes.indexOf(job.tasks.fileType.response) < 0  ) {
							return ;
					}
					job.run("sha1File");
					job.run("fileMeta");
					uploadComplete = true;
					if ( job.tasks.fileType.status === null ) {
						job.complete("fileType",function(err,resp) {
							request.emit("uploadCompleteAndFileTypeAvailable");
							if (  job.tasks.fileType.response == "application/ogg" ) { job.emit("oggAvailable",[]); }
						});
					} else {
						if ( job.tasks.fileType.response == "application/ogg" ) { job.emit("oggAvailable",[]); }
						request.emit("uploadCompleteAndFileTypeAvailable");
					}
					d10.log("debug",jobid,"fileWriter end event");
				});
			}
			if ( job.inputFileBuffer.status ) { job.inputFileBuffer.buffer.push(chunk); }
			job.fileWriter.write(chunk);
		});

	});
};


