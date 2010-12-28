//router-api.js

var d10 = require ("./d10"),
	bodyDecoder = require("connect/middleware/bodyDecoder"),
	querystring = require("querystring"),
	exec = require('child_process').exec;

exports.api = function(app) {

	var checkSession = function(request,response,next) {
// 		d10.log("debug",request.ctx);
		if ( !request.ctx.session || !request.ctx.user || !request.ctx.user._id ) {
			response.writeHead(404,{"Content-Type":"text/plain"});
			response.end("Page not found");
		}
		else
		{
			next();
		}
	};
	
	app.get("/api/*",checkSession);
	app.post("/api/*",checkSession);
	app.put("/api/*",checkSession);
	app.delete("/api/*",checkSession);
	
	app.get("/api/userinfos", function(request,response) {
		d10.when ( 
			{
				preferences: function(cb) {
					d10.db.db("d10").getDoc({
						success: function(data) {
							cb(null,data);
						},
						error: function(err) {
							cb(err);
						}
					},request.ctx.user._id.replace(/^us/,"up"));
				},
				playlists: function(cb) {
					d10.db.db("d10").key ( [request.ctx.user._id.replace(/^us/,""), "pl"] ).include_docs(true).getView({
						success: function(data) {
							var back = [];
							data.rows.forEach(function(v) { back.push(v.doc); });
							cb(null,back);
						},
						error: function(err) {
							cb(err);
						}
					},"user","all_infos");
				}
			},
			function(responses) {
				responses.user = request.ctx.user;
				d10.rest.success(responses,request.ctx);
			},
			function(errors,responses) {
				d10.log("debug","errors");
				d10.log("debug",errors);
				d10.rest.err(423,null,request.ctx);
			}
		);
	}); // /api/userinfos
	app.get("/api/htmlElements", function(request,response) {
		request.ctx.headers["Content-type"] = "application/json";
		response.writeHead(200, request.ctx.headers );
		d10.view("startTemplates",null,function(html) {
			response.end(html);
		});
	});

// 	$back = $this->couch_ci->getView("song","length");
	app.get("/api/length", function(request,response) {
		d10.db.db("d10").getView({
			error: function(resp) {
				d10.rest.err(423,resp,request.ctx);
			},
			success: function(resp) {
				var len = 0;
				try {
					len = resp.rows.shift().value;
					d10.rest.success( {"length": len}, request.ctx );
				} catch (e) {
					d10.rest.success( {"length": 0}, request.ctx );
				}
			}
		},"song","length");
	});
	
	
	app.get("/api/serverLoad", function(request,response) {
		var child;
		
		child = exec('uptime',
			function (error, stdout, stderr) {
				if (error !== null) {
					request.ctx.headers["Content-Type"]="text/plain";
					d10.rest.err(423,"Internal server error",request.ctx);
// 					response.writeHead(501,{"Content-Type":"text/plain"});
// 					response.end();
					return ;
				}
				var up = stdout.replace(/\s+$/,"").split(": ").pop().split(", ");
				d10.log("debug",up);
				d10.rest.success( {load: up}, request.ctx );
				
			}
		);
	});
	
	app.get("/api/current_playlist",function(request,response) {
		d10.log("debug","router:","/api/current_playlist");
		var getFromPlaylist = function(id) {
			d10.db.db("d10").getDoc({
					success: function(playlist) {
						if ( playlist.songs && playlist.songs.length ) {
							d10.db.db("d10").include_docs(true).keys(playlist.songs).getAllDocs({
								success: function(resp) {
									var back = [];
									resp.rows.forEach(function(v,k) {
										if ( !v.error ) {
											back.push(v.doc);
										}
									});
									d10.rest.success( back, request.ctx );
								},
								error: function(resp) {
									d10.rest.err(423,resp,request.ctx);
								}
							});
						} else {
							d10.rest.success( [], request.ctx );
						}
					},
					error: function(resp) {
						d10.rest.err(423,resp,request.ctx);
					}
				},
				id
			);
		};
		
		var getFromIds = function (ids) {
			d10.db.db("d10").include_docs(true).keys(ids).getAllDocs({
				success: function(resp) {
					var back = [];
					resp.rows.forEach(function(v,k) {
						if ( !v.error ) {
							back.push(v.doc);
						}
					});
					d10.rest.success( back, request.ctx );
				},
				error: function(resp) {
					d10.rest.err(423,resp,request.ctx);
				}
			});
		};
		
		d10.db.db("d10").getDoc({
			success: function(doc) {
				if ( doc && doc.c_playlist ) {
					getFromPlaylist(doc.c_playlist);
				} else if ( doc.c_playlist_ids ){
					getFromIds(doc.c_playlist_ids);
				} else {
					d10.rest.success( [], request.ctx );
				}
			},
			error: function(data) {
				d10.rest.err(423,data,request.ctx);
			}
		},
		request.ctx.user._id.replace(/^us/,"up")
		);
		
		
	});
	
	
	app.get("/api/toReview",function(request,response) {
		d10.log("debug","router:","/api/toReview");

		d10.db.db("d10").key( [ request.ctx.user._id, false ] )
		.getView(
			{
				success: function(resp) {
					d10.rest.success( {count: resp.rows.length}, request.ctx );

				},
				error: function(data) {
					d10.rest.err(423,data,request.ctx);
				}
			},
			"user",
			"song"
		);
	});


	app.put("/api/current_playlist",function(request,response) 
	{
		var body = "";
		request.setEncoding("utf8");
		request.on("data",function(chunk) { body+=chunk; });
		request.on("end",function() {
			var data = querystring.parse(body),
			recordAnonymousPlaylist = function (d10UserPrefs) {
				d10.log("debug","in recordAnonymousPlaylist");
				delete d10UserPrefs.c_playlist;
				d10UserPrefs.c_playlist_ids = data["ids[]"];
				d10.log("debug","calling storeDoc, ", data["ids[]"].length,d10UserPrefs.c_playlist_ids.length );
				d10.db.db("d10").storeDoc(
					{
						success: function() {
							d10.rest.success( {}, request.ctx );
						},
						error: function(resp) {
							d10.rest.err(413,data,request.ctx);
						}
					},
					d10UserPrefs
				);
			},
			recordRplPlaylist = function(d10UserPrefs) {
				d10.log("debug","playlist : recordRplPlaylist");
				d10.db.db("d10").getDoc(
					{
						success: function() {
							delete d10UserPrefs.c_playlist_ids;
							d10UserPrefs.c_playlist = data.playlist;
							d10.db.db("d10").storeDoc(
								{
									success: function() {
										d10.rest.success( [], request.ctx );
									},
									error: function(resp) {
										d10.rest.err(413,data,request.ctx);
									}
								},
								d10UserPrefs
							);
						},
						error: function(err) {
							// malicious code; make it harder to bug us
							d10.rest.success( [], request.ctx );
						}
					},
					data.playlist
				);
			}
			;
			d10.log("debug",data);
			// { "ids[]":["aasdf","aasdfsf"] }
// 			request.ctx.headers["Content-Type"] = "application/json";
			
			d10.db.db("d10").getDoc(
				{
					success: function (resp) {
						if ( data.playlist && data.playlist.substr(0,2) == "pl" ) {
							recordRplPlaylist(resp);
						} else if ( data["id[]"] ) {
							recordAnonymousPlaylist(resp);
						} else {
							data["id[]"] = [];
							recordAnonymousPlaylist(resp);
						}
					},
					error: function (data) {
						d10.rest.err(413,data,request.ctx);
					}
				},
				
				request.ctx.user._id.replace(/^us/,"up")
			);
			
// 			d10.rest.success( {}, request.ctx );
		});
	}
	);

	app.get("/api/songsToReview:end?",function(request,response) {
		d10.db.db("d10").include_docs(true).key( [ request.ctx.user._id, false ] ).getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function(foo,err) {
					d10.rest.err(err.statusCode, err.statusMessage,request.ctx);
				}
			},
			"user",
			"song"
		);
	});
	
	app.post("/api/ping",function(request,response) {
		d10.log("debug","router:","POST /api/ping");
		request.on("data",function() {d10.log("debug","ping data reached");});
		request.on("end",function() {d10.log("debug","ping end reached");});
		var updateAliveDoc = function() {
			d10.db.db("track").updateDoc({success: function() {d10.log("debug","alive doc updated");},error:function(err,all) {d10.log("debug",err,all, "error");}},"tracking","ping",request.ctx.user._id.replace(/^us/,"pi"));
		};

		var parsePlayerInfos = function() {
			var infos = null;
			if ( !request.body.player || !request.body.player.length ) {
				return ;
			}
			try {
				infos = JSON.parse(request.body.player);
			} catch(e) {
				return ;
			}
			
			var updateHits = function ( id ) {
				d10.db.db("d10").getDoc({
					success: function(doc) {
						if ( doc.hits ) doc.hits++;
						else			doc.hits = 1;
						d10.db.db("d10").storeDoc({success:function() {d10.log("debug","hitcount updated");}},doc);
					}
				},
				id
				);
			};
			
			var updateUserData = function(id) {
				d10.db.db("d10").getDoc({
					success: function(doc) {
						if (!doc.listen)	doc.listen = {};
						if ( doc.listen[id] )	doc.listen[id]++;
						else					doc.listen[id]=1;
						d10.db.db("d10").storeDoc({},id);
					}
				},
				request.ctx.user._id.replace(/^us/,"pr")
				);
			};
			
			infos.forEach(function(v,k) {
				updateHits(v.id);
				updateUserData(v.id);
				v.song = v.id;
				delete v.id;
				v._id="pt"+d10.uid();
				v.user = request.ctx.user._id;
				d10.db.db("track").storeDoc({},v);
			});
			
		};
		
		bodyDecoder()(request, response,function() {
			d10.log("debug",request.body,"after decode");
			updateAliveDoc();
			parsePlayerInfos();
			d10.rest.success( [], request.ctx );
		});
	
	});

	app.post("/api/random",function(request,response) 
	{
		var getArray = function(v) {
			if ( typeof v == "undefined" ) return [];
			if ( Object.prototype.toString.call(v) !== '[object Array]' ) {
				if( v.length ) return [v];
				return [];
			}
			return v;
		};
		
		var getRandomIds = function (resp,count,not,really_not) {
			
			var shuffle = function(o){ //v1.0
				for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
				return o;
			};
			
			
			var ids = [];
			resp.rows.forEach(function(v,k) { ids.push(v.id); });
			if ( !ids.length )	return ids;
			really_not.forEach(function(v,k) {
				if( ids.indexOf(v) >=0 )	ids.splice(ids.indexOf(v),1);
			});
			if ( !ids.length )	return ids;
			not.forEach(function(v,k) {
				if( ids.indexOf(v) >=0 )	ids.splice(ids.indexOf(v),1);
			});
			if ( !ids.length ) {
				return getRandomIds(resp,count,[],really_not);
			}
			if (  count > ids.length ) {
				return shuffle(ids);
			}
			
			if ( count == 1 ) {
				var r = Math.floor(Math.random()*ids.length);
				return ids[r];
			}
			shuffle(ids);
			return ids.slice(0,count);
		};

		var body = "";
		request.setEncoding("utf8");
		request.on("data",function(chunk) { body+=chunk; });
		request.on("end",function() {
			request.body = querystring.parse(body);
			var count = parseInt(request.body.count);
			if ( isNaN(count) || count < 1 ){
				return d10.rest.err(427,"count",request.ctx);
			}
			var db = d10.db.db("d10");
			var name = getArray(request.body["name[]"]);
			if ( name.length ) {
				db.keys(name);
			}
			var not = getArray(request.body["not[]"]);
			var really_not = getArray(request.body["really_not[]"]);
			
			db.getView(
				{
					success: function(response) {
						var random = getRandomIds(response,count,not,really_not);
						if ( !random.length ) {
							return d10.rest.success({songs: []},request.ctx);
						}
						
						db.keys(random).include_docs(true).getAllDocs(
							{
								success: function(resp) {
									var back = [];
									resp.rows.forEach(function(v) { back.push(v.doc); });
									d10.rest.success({songs: back},request.ctx);
								},
								error: function(resp) {
									d10.rest.err(423,err,request.ctx);
								}
							}
						);
						
					},
					error: function(err) {
						d10.rest.err(423,err,request.ctx);
					}
				},
				"genre",
				"unsorted"
			   );
		});
	});
	
	app.post("/api/volume",function(request,response) {
		bodyDecoder()(request, response,function() {
			var volume = (request.body && "volume" in request.body) ? parseFloat(request.body.volume) : 0;
			if ( isNaN(volume) )	volume=0;
			d10.db.db("d10").getDoc({
				success: function(doc) {
					doc.volume = volume;
					d10.db.db("d10").storeDoc({
							success: function() { d10.rest.success([],request.ctx); },
							error: function(b,err)	{ d10.rest.err(423,err,request.ctx);}
						},
						doc
					);
				},
				error: function(doc,err) {
					d10.rest.err(423,err,request.ctx);
				}
			},
			"up"+request.ctx.user._id.substr(2)
							 );
		});
	});
	
	
	app.put("/api/starring/likes/aa:id",function(request,response) {
		var starring = function() {
			d10.db.db("d10").getDoc({
				success: function(doc) {
					var star = null;
					if ( doc.dislikes["aa"+request.params.id] ) {
						delete doc.dislikes["aa"+request.params.id];
					}
					if ( doc.likes["aa"+request.params.id] ) {
						delete doc.likes["aa"+request.params.id];

					} else {
						doc.likes["aa"+request.params.id] = true;
						star = "likes";
					}
					d10.db.db("d10").storeDoc({
						success: function() {d10.rest.success({id: "aa"+request.params.id, star: star },request.ctx);},
						error: function(e,err) {
							d10.rest.err(423,err,request.ctx);
						}
					},
					doc);
				},
				error: function(e,err) {
					d10.rest.err(423,err,request.ctx);
				}
			},
			"up"+request.ctx.user._id.substr(2)
							 );
		};
		d10.db.db("d10").getDoc({
			success: starring,
			error: function(f,err) { d10.rest.err(427,err,request.ctx); }
		},
		"aa"+request.params.id
						 );
	});
	
	app.put("/api/starring/dislikes/aa:id",function(request,response) {
		var starring = function() {
			d10.db.db("d10").getDoc({
				success: function(doc) {
					var star = null;
					if ( doc.likes["aa"+request.params.id] ) {
						delete doc.likes["aa"+request.params.id];
					}
					if ( doc.dislikes["aa"+request.params.id] ) {
						delete doc.dislikes["aa"+request.params.id];

					} else {
						doc.dislikes["aa"+request.params.id] = true;
						star = "dislikes";
					}
					d10.db.db("d10").storeDoc({
						success: function() {d10.rest.success({id: "aa"+request.params.id, star: star },request.ctx);},
						error: function(e,err) {
							d10.rest.err(423,err,request.ctx);
						}
					},
					doc);
				},
				error: function(e,err) {
					d10.rest.err(423,err,request.ctx);
				}
			},
			"up"+request.ctx.user._id.substr(2)
							 );
		};
		d10.db.db("d10").getDoc({
			success: starring,
			error: function(f,err) { d10.rest.err(427,err,request.ctx); }
		},
		"aa"+request.params.id
						 );
	});
	
	
	
	
	app.get("/api/search2",function(request,response) {
		var db = d10.db.db("d10");
		if ( request.query.start ) {
			var start = d10.ucwords( request.query.start.replace(/^\s+/,"").replace(/\s+$/,"") );
			var end = start;
			var next = String.fromCharCode( end.charCodeAt( end.length-1 ) + 1 );
			end = end.substr(0, end.length - 1) + next;
// 			d10.log("debug","startkey",start,"endkey",end,"next",next);
			db.startkey(start).endkey(end).inclusive_end(false);
		}
		db.include_docs(true).getView({
			success: function(resp) {
				var results = {title: [], artist: [], album: []};
				resp.rows.forEach(function(v,k) {
					var doc = v.doc;
					var field = v.value.json.field;
					if ( field == "album" || field == "artist" ) {
						var put = false;
						for (i=0,len=results[field].length; i<len; i++ ) {
							if ( results[field][i].doc[field] ==  doc[field] ) {
								put = true;
								break;
							} else if ( results[field][i].doc[field] > doc[field] ) {
								put = true;
								results[field].splice(i,0,{doc: doc, value: v.value});
								break;
							}
						}
						if ( !put ) {
							results[field].push( {doc: doc, value: v.value} );
						}
					} else {
						var put = false;
						for (i=0,len=results[field].length; i<len; i++ ) {
							if ( results[field][i].doc[field]+" "+results[field][i].doc._id == doc[field]+" "+ doc._id ) {
								put = true;
								break;
							} else if ( results[field][i].doc[field]+" "+results[field][i].doc._id > doc[field]+" "+ doc._id ) {
								put = true;
								results[field].splice(i,0,{doc: doc, value: v.value});
								break;
							}
						}
						if ( !put ) {
							results[field].push({doc: doc, value: v.value});
						}
					}
				});
				request.ctx.headers["Content-Type"] = "application/json";
				response.writeHead(200,request.ctx.headers);
				response.end( JSON.stringify(results) );
// 				d10.rest.success(results,request.ctx);
			},
			error: function(e,err) {
				d10.rest.err(423,err,request.ctx);
			}
		},
		"song",
		"search"
							  );
	});
	
	app.post("/api/details",function(request,response) {
		bodyDecoder()(request, response,function() {
			d10.log("debug","body decoded");
			var artists = [], albums = [], jobs = {};
			if ( request.body["artists[]"] ) {
				if ( Object.prototype.toString.call(request.body["artists[]"]) === '[object Array]' ) {
					artists = request.body["artists[]"];
				} else if ( request.body["artists[]"].length ) {
					artists = [ request.body["artists[]"] ];
				}
			}
			if ( request.body["albums[]"] ) {
				if ( Object.prototype.toString.call(request.body["albums[]"]) === '[object Array]' ) {
					albums = request.body["albums[]"];
				} else if ( request.body["albums[]"].length ) {
					albums = [ request.body["albums[]"] ];
				}
			}
			if ( artists.length ) {
				jobs.artists=function(cb) {
					d10.db.db("d10").reduce(false).include_docs(true).keys(artists).getView(
						{
							success: function(resp) {
								cb(null,resp.rows);
							},
							error: function(e,err) {
								cb(err);
							}
						},
						"artist",
						"artist"
																					);
				};
			}
			if ( albums.length ) {
				jobs.albums=function(cb) {
					d10.db.db("d10").reduce(false).include_docs(true).keys(albums).getView(
						{
							success: function(resp) {
								cb(null,resp.rows);
							},
							error: function(e,err) {
								cb(err);
							}
						},
						"album",
						"album"
																					);
				};
			}
// 				d10.log("debug",jobs);
			d10.when(
				jobs,
				function(resp) {
					request.ctx.headers["Content-Type"] = "application/json";
					response.writeHead(200,request.ctx.headers);
					response.end(JSON.stringify(resp));
				},
				function(err) {
					d10.rest.err(427,err,request.ctx);
				}
			);
		});
	});
	
}; // exports.api


























