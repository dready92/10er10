//router-api.js

var d10 = require ("./d10"),
	bodyDecoder = require("connect/middleware/bodyDecoder"),
	querystring = require("querystring"),
	exec = require('child_process').exec;

var successResp = function(data,ctx) {
	var back = {
		status: "success",
		data: data
	};
	ctx.response.writeHead(200, ctx.headers );
	ctx.response.end (
		JSON.stringify(back)
	);
};

var errResp = function(code, data,ctx) {
	if ( !ctx ) {
		ctx = data;
		data = null;
	}
	var back = {
		status: "error",
		data: {
			code: code,
			message: d10.http.statusMessage(code)
		}
	};
	if (data) {
		back.data.infos = data;
	}
	ctx.response.writeHead(200, ctx.headers );
	ctx.response.end (
		JSON.stringify(back)
	);
};


exports.api = function(app) {

	var checkSession = function(request,response,next) {
// 		console.log(request.ctx);
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
				successResp(responses,request.ctx);
			},
			function(errors,responses) {
				console.log("errors");
				console.log(errors);
				errResp(423,null,request.ctx);
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
				errResp(423,resp,request.ctx);
			},
			success: function(resp) {
				var len = 0;
				try {
					len = resp.rows.shift().value;
					successResp( {"length": len}, request.ctx );
				} catch (e) {
					successResp( {"length": 0}, request.ctx );
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
					errResp(423,"Internal server error",request.ctx);
// 					response.writeHead(501,{"Content-Type":"text/plain"});
// 					response.end();
					return ;
				}
				var up = stdout.replace(/\s+$/,"").split(": ").pop().split(", ");
				console.log(up);
				successResp( {load: up}, request.ctx );
				
			}
		);
	});
	
	app.get("/api/current_playlist",function(request,response) {
		console.log("router:","/api/current_playlist");
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
									successResp( back, request.ctx );
								},
								error: function(resp) {
									errResp(423,resp,request.ctx);
								}
							});
						} else {
							successResp( [], request.ctx );
						}
					},
					error: function(resp) {
						errResp(423,resp,request.ctx);
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
					successResp( back, request.ctx );
				},
				error: function(resp) {
					errResp(423,resp,request.ctx);
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
					successResp( [], request.ctx );
				}
			},
			error: function(data) {
				errResp(423,data,request.ctx);
			}
		},
		request.ctx.user._id.replace(/^us/,"up")
		);
		
		
	});
	
	
	app.get("/api/toReview",function(request,response) {
		console.log("router:","/api/toReview");

		d10.db.db("d10").key( [ request.ctx.user._id, false ] )
		.getView(
			{
				success: function(resp) {
					successResp( {count: resp.rows.length}, request.ctx );

				},
				error: function(data) {
					errResp(423,data,request.ctx);
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
				console.log("in recordAnonymousPlaylist");
				delete d10UserPrefs.playlist;
				d10UserPrefs.c_playlist_ids = data["ids[]"];
				console.log("calling storeDoc, ", data["ids[]"].length,d10UserPrefs.c_playlist_ids.length );
				d10.db.db("d10").storeDoc(
					{
						success: function() {
							successResp( {}, request.ctx );
						},
						error: function(resp) {
							errResp(413,data,request.ctx);
						}
					},
					d10UserPrefs
				);
			},
			recordRplPlaylist = function(d10UserPrefs) {
				d10.db.db("d10").getDoc(
					{
						success: function() {
							delete d10UserPrefs.c_playlist_ids;
							d10UserPrefs.c_playlist = data.playlist;
							d10.db.db("d10").storeDoc(
								{
									success: function() {
										successResp( [], request.ctx );
									},
									error: function(resp) {
										errResp(413,data,request.ctx);
									}
								},
								d10UserPrefs
							);
						},
						error: function(err) {
							// malicious code; make it harder to bug us
							successResp( [], request.ctx );
						}
					},
					data.playlist
				);
			}
			;
			console.log(data);
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
						errResp(413,data,request.ctx);
					}
				},
				
				request.ctx.user._id.replace(/^us/,"up")
			);
			
// 			successResp( {}, request.ctx );
		});
	}
	);

	app.post("/api/ping",function(request,response) {
		console.log("router:","POST /api/ping");
		request.on("data",function() {console.log("ping data reached");});
		request.on("end",function() {console.log("ping end reached");});
		var updateAliveDoc = function() {
			d10.db.db("track").updateDoc({success: function() {console.log("alive doc updated");},error:function(err,all) {console.log(err,all, "error");}},"tracking","ping",request.ctx.user._id.replace(/^us/,"pi"));
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
						d10.db.db("d10").storeDoc({success:function() {console.log("hitcount updated");}},doc);
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
			console.log(request.body,"after decode");
			updateAliveDoc();
			parsePlayerInfos();
			successResp( [], request.ctx );
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
				return errResp(427,"count",request.ctx);
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
							return successResp({songs: []},request.ctx);
						}
						
						db.keys(random).include_docs(true).getAllDocs(
							{
								success: function(resp) {
									var back = [];
									resp.rows.forEach(function(v) { back.push(v.doc); });
									successResp({songs: back},request.ctx);
								},
								error: function(resp) {
									errResp(423,err,request.ctx);
								}
							}
						);
						
					},
					error: function(err) {
						errResp(423,err,request.ctx);
					}
				},
				"genre",
				"unsorted"
			   );
		});
	});
}; // exports.api


























