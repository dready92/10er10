//router-api.js

var d10 = require ("./d10"),
	bodyDecoder = require("connect").bodyParser,
	querystring = require("querystring"),
	fs = require("fs"),
	os = require("os"),
	when = require("./when"),
	lang = require("./lang"),
	users = require("./d10.users"),
	exec = require('child_process').exec;

exports.api = function(app) {

	
	
	/*
	var checkSession = function(request,response,next) {
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
*/
	app.post("/api/songs",function(request,response) {
		bodyDecoder()(request, response,function() {
			request.ctx.headers["Content-type"] = "application/json";
			console.log(request.body);
			if ( ! request.body["ids"] || 
				Object.prototype.toString.call(request.body["ids"]) !== '[object Array]' ||
				!request.body["ids"].length ) {
				d10.rest.success({songs:[]},request.ctx);
			} else {
				for ( var index in request.body["ids"] ) {
					if ( request.body["ids"][index].substr(0,2) != "aa" ) {
						d10.rest.success({songs:[]},request.ctx);
						return ;
					}
				}
				d10.couch.d10.getAllDocs({keys:request.body["ids"],include_docs: true},function(err,resp) {
					if ( err ) {
						d10.rest.err(500,err,request.ctx);
					} else {
						
						d10.rest.success({songs: resp.rows.map(function(v) {return v.doc;})},request.ctx);
					}
				});
				
			} 
			
			
		});
	});
	
	app.get("/api/userinfos", function(request,response) {
		when ( 
			{
				preferences: function(cb) {
					d10.couch.d10wi.getDoc(request.ctx.user._id.replace(/^us/,"up"),function(err,data) {
							cb(err,data);
						});
				},
				playlists: function(cb) {
					d10.couch.d10.view("user/all_infos",{key: [request.ctx.user._id.replace(/^us/,""), "pl"],include_docs: true},
						function(err,data,meta) {
							if ( err ) return cb(err);
							var back = [];
							console.log(arguments);
							data.rows.forEach(function(v) { back.push(v.doc); });
							cb(null,back);
						}
					);
				}
			},
			function(errors,responses) {
				if ( errors ) {
					d10.log("debug",errors);
					d10.rest.err(423,null,request.ctx);
				} else {
					responses.user = request.ctx.user;
					d10.rest.success(responses,request.ctx);
				}
			}
		);
	}); // /api/userinfos
	
	app.get("/api/htmlElements", function(request,response) {
		
		var jobs = {}
		for ( var jobname in d10.config.templates.clientList ) {
			jobs[jobname] = (function(tpl,j) {
								return function(cb) {
// 									fs.readFile(d10.config.templates.client+"/"+tpl,"utf8",function(err,data) {
// 										cb(err,data);
// 									});
									lang.parseServerTemplate(request,tpl,cb);
								};
							})(d10.config.templates.clientList[jobname],jobname);
		}
		jobs.dynamic = function(cb) { lang.loadLang(request.ctx.lang, "client",cb); };
		request.ctx.headers["Content-type"] = "application/json";
		when(
			jobs,
			function(e,responses) {
				if ( e ) {
					d10.log("error");d10.log(e);
					d10.rest.err(500,e,request.ctx);
				} else {
					d10.log("success");
// 					console.log("responses: ",responses);
					var dynamic = responses.dynamic;
					delete responses.dynamic;
					for ( var i in dynamic ) {
						responses[i] = dynamic[i];
					}
					d10.rest.success(responses,request.ctx);
				}
			}
		);
	});

	app.get("/api/length", function(request,response) {
		d10.couch.d10.view("song/length",function(err,resp) {
			if ( err ) d10.rest.err(423,resp,request.ctx);
			var len = 0;
			try {
				len = resp.rows.shift().value;
				d10.rest.success( {"length": len}, request.ctx );
			} catch (e) {
				d10.rest.success( {"length": 0}, request.ctx );
			}
		});
	});
	
	
	app.get("/api/serverLoad", function(request,response) {
		var child;
		d10.rest.success( {load: os.loadavg()}, request.ctx );

	});
	
	app.get("/api/toReview",function(request,response) {
		d10.log("debug","router:","/api/toReview");

		d10.couch.d10.view("user/song",{key: [ request.ctx.user._id, false ]},function(err,resp) {
			if ( err )	d10.rest.err(423,err,request.ctx)
			else		d10.rest.success( {count: resp.rows.length}, request.ctx );
		});
	});


	app.put("/api/current_playlist",function(request,response) 
	{
		var body = "";
		request.setEncoding("utf8");
		request.on("data",function(chunk) { body+=chunk; });
		request.on("end",function() {
			var data = querystring.parse(body);
// 			console.log("/api/current_playlist body: ",data);
			d10.couch.d10wi.getDoc(request.ctx.user._id.replace(/^us/,"up"),function(err,userPreferences) {
				if ( err ) { return d10.rest.err(413,err,request.ctx);}
				
				var recordDoc = function() {
					userPreferences.playlist = {};
					for ( var k in data) {
						userPreferences.playlist[k.replace("[]","")] = data[k];
					}
					if ( userPreferences.playlist.list && typeof userPreferences.playlist.list == "string" ) {
						userPreferences.playlist.list = [ userPreferences.playlist.list ];
					}
					console.log("storing doc ",userPreferences);
					d10.couch.d10wi.storeDoc(userPreferences,function(err,response) {
						if ( err )	d10.rest.err(413,err,request.ctx);
						else		d10.rest.success( [], request.ctx );
					});
				};
				
				
				if ( !data.type )	data.type == "default";
				var actions = {};
				if ( data.id ) {
					actions["checkId"] = function(cb) {
						d10.couch.d10.getDoc(data.id,function(err,resp) {
							cb( err ? false : true);
						});
					}
				}
				if ( data.list ) {
					actions["checkList"] = function(cb) {
						d10.couch.d10.allDocs({keys: data.list},function(err,resp) {
							if ( err )	return cb(false);
							if ( userPreferences.rows.length != data.list.length ) {
								return cb(false);
							}
							return cb(true);
						});
					};
				}
				
				if ( actions.length ) {
					when(actions,function(err,responses) {
						if ( err ) {
							d10.rest.err(413,err,request.ctx);
						} else {
							recordDoc()
						}
					});
				} else {
					recordDoc();
				}
				

			});
		});
	}
	);

	app.get("/api/songsToReview:end?",function(request,response) {
		d10.couch.d10.view("user/song",{include_docs: true, key: [ request.ctx.user._id, false ]}, function(err,resp) {
			if ( err ) { d10.rest.err(err.statusCode, err.statusMessage,request.ctx); }
			else {d10.rest.success(resp,request.ctx);}
		});
	});
	
	app.post("/api/ping",function(request,response) {
		d10.log("debug","router:","POST /api/ping");
		request.on("data",function() {d10.log("debug","ping data reached");});
		request.on("end",function() {d10.log("debug","ping end reached");});
		var updateAliveDoc = function() {
			d10.couch.track.updateDoc("tracking/ping/"+request.ctx.user._id.replace(/^us/,"pi"),function(err,resp) {
				if ( err ) d10.log(err);
				d10.log("debug", err ? "error updating tracking ping" : "tracking ping updated");
			});
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
				d10.couch.d10wi.getDoc(id, function(err,doc) {
					if (err) {
						doc = {_id: id, hits: 0};
					}
					if ( doc.hits ) doc.hits++;
					else			doc.hits = 1;
					d10.couch.d10wi.storeDoc(doc,function(err,resp) {if ( !err )	d10.log("debug","hitcount updated");});
				});
			};
			
			var updateUserData = function(id) {
				d10.couch.d10wi.getDoc(request.ctx.user._id.replace(/^us/,"pr"),function(err,doc) {
					if ( err ) {
						return ;
					}
					if (!doc.listen)	doc.listen = {};
					if ( doc.listen[id] )	doc.listen[id]++;
					else					doc.listen[id]=1;
					d10.couch.d10wi.storeDoc(doc,function() {});
				});
			};
			
			infos.forEach(function(v,k) {
				if ( v.id.substr(0,2) != "aa" ) {
					return ;
				}
				updateHits(v.id);
				updateUserData(v.id);
				v.song = v.id;
				delete v.id;
				v._id="pt"+d10.uid();
				v.user = request.ctx.user._id;
				d10.couch.track.storeDoc(v,function(){});
// 				d10.db.db("track").storeDoc({},v);
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
			d10.log("request.body: ",request.body);
			var count = parseInt(request.body.count);
			if ( isNaN(count) || count < 1 ){
				return d10.rest.err(427,"count",request.ctx);
			}
			var data = {};
			var name = getArray(request.body["name[]"]);
			if ( name.length ) {
				data.keys = name;
			}
			var not = getArray(request.body["not[]"]);
			var really_not = getArray(request.body["really_not[]"]);
			d10.couch.d10.view("genre/unsorted",data,function(err,response) {
				if ( err ) {
					return d10.rest.err(423,err,request.ctx);
				}
				var random = getRandomIds(response,count,not,really_not);
				if ( !random.length ) {
					return d10.rest.success({songs: []},request.ctx);
				}
				d10.couch.d10.getAllDocs({keys: random, include_docs: true},function(err,resp) {
					if ( err ) {
						return d10.rest.err(423,err,request.ctx);
					}
					var back = [];
					resp.rows.forEach(function(v) { back.push(v.doc); });
					d10.rest.success({songs: back},request.ctx);
				});
			});
		});
	});
	
	app.post("/api/volume",function(request,response) {
		bodyDecoder()(request, response,function() {
			var volume = (request.body && "volume" in request.body) ? parseFloat(request.body.volume) : 0;
			if ( isNaN(volume) )	volume=0;
			d10.couch.d10wi.getDoc("up"+request.ctx.user._id.substr(2),function(err,doc) {
				if ( err ) { return d10.rest.err(423,err,request.ctx); }
				doc.volume = volume;
				d10.couch.d10wi.storeDoc(doc,function(err,resp) {
					if ( err ) { d10.rest.err(423,err,request.ctx); }
					else { d10.rest.success([],request.ctx); }
				});
			});
		});
	});
	
	
	app.put("/api/starring/likes/aa:id",function(request,response) {
		var starring = function() {
			d10.couch.d10wi.getDoc("up"+request.ctx.user._id.substr(2),function(err,doc) {
				if ( err) { return d10.rest.err(423,err,request.ctx); }
				var star = null;
				if ( !doc.dislikes ) {
					doc.dislikes = {};
				}
				if ( !doc.likes ) {
					doc.likes = {};
				}
				if ( doc.dislikes["aa"+request.params.id] ) {
					delete doc.dislikes["aa"+request.params.id];
				}
				if ( doc.likes["aa"+request.params.id] ) {
					delete doc.likes["aa"+request.params.id];
					
				} else {
					doc.likes["aa"+request.params.id] = true;
					star = "likes";
				}
				d10.couch.d10wi.storeDoc(doc, function(err,resp) {
					if ( err ) { d10.rest.err(423,err,request.ctx); }
					else { d10.rest.success({id: "aa"+request.params.id, star: star },request.ctx); }
				});
			});
		};
		d10.couch.d10.getDoc("aa"+request.params.id, function(err,resp) {
			if ( err ) { d10.rest.err(427,err,request.ctx); }
			else {  starring(); }
		});
	});
	
	app.put("/api/starring/dislikes/aa:id",function(request,response) {
		var starring = function() {
			d10.couch.d10wi.getDoc("up"+request.ctx.user._id.substr(2),function(err,doc) {
				if ( err ) { return d10.rest.err(423,err,request.ctx); }
				var star = null;
				if ( !doc.dislikes ) {
					doc.dislikes = {};
				}
				if ( !doc.likes ) {
					doc.likes = {};
				}
				if ( doc.likes["aa"+request.params.id] ) {
					delete doc.likes["aa"+request.params.id];
				}
				if ( doc.dislikes["aa"+request.params.id] ) {
					delete doc.dislikes["aa"+request.params.id];
					
				} else {
					doc.dislikes["aa"+request.params.id] = true;
					star = "dislikes";
				}
				d10.couch.d10wi.storeDoc(doc,function(err,resp) {
					if ( err ) { d10.rest.err(423,err,request.ctx);}
					else { d10.rest.success({id: "aa"+request.params.id, star: star },request.ctx); }
				});
			});
		};
		d10.couch.d10.getDoc("aa"+request.params.id, function(err,resp) {
			if ( err ) { d10.rest.err(427,err,request.ctx); }
			else {  starring(); }
		});
	});
	
	
	
	
	app.get("/api/search2",function(request,response) {
// 		var db = d10.db.db("d10");
		var options = {include_docs: true};
		if ( request.query.start ) {
			var start = d10.ucwords( request.query.start.replace(/^\s+/,"").replace(/\s+$/,"") );
			var end = start;
			var next = String.fromCharCode( end.charCodeAt( end.length-1 ) + 1 );
			end = end.substr(0, end.length - 1) + next;
// 			d10.log("debug","startkey",start,"endkey",end,"next",next);
			options.startkey = start;
			options.endkey = end;
			options.inclusive_end = false;
// 			db.startkey(start).endkey(end).inclusive_end(false);
		}
// 		db.include_docs(true).getView({
// 			success: function(resp) {
		d10.couch.d10.view("song/search",options, function(err,resp) {
			if ( err ) { return d10.rest.err(423,err,request.ctx); }
			var results = {title: [], artist: [], album: []};
			resp.rows.forEach(function(v,k) {
				var doc = v.doc;
				var field = v.value.json.field;
				if ( field == "album" ) {
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
				} else if ( field == "artist" ) {
					var put = false;
					for (i=0,len=results[field].length; i<len; i++ ) {
						if ( results[field][i].value.json.value ==  v.value.json.value ) {
							put = true;
							break;
						} else if ( results[field][i].value.json.value > v.value.json.value ) {
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
		});
	});
	
	app.post("/api/details",function(request,response) {
		bodyDecoder()(request, response,function() {
			
			d10.log("debug","body decoded",request.body);
			var artists = [], albums = [], jobs = {};
			if ( request.body.artists ) {
				if ( Object.prototype.toString.call(request.body.artists) === '[object Array]' ) {
					artists = request.body.artists;
				} else if ( request.body.artists.length ) {
					artists = [ request.body.artists ];
				}
			}
			if ( request.body.albums ) {
				if ( Object.prototype.toString.call(request.body.albums) === '[object Array]' ) {
					albums = request.body.albums;
				} else if ( request.body.albums.length ) {
					albums = [ request.body.albums ];
				}
			}
			if ( artists.length ) {
				jobs.artists=function(cb) {
					d10.log("launching artists details");
					d10.couch.d10.view("artist/artist",{reduce: false, include_docs: true, keys: artists}, function(err,resp) {
						if ( err )	{cb(err);}
						else	cb(null,resp.rows);
					});
				};
			}
			if ( albums.length ) {
				d10.log("launching albums details");
				
				jobs.albums=function(cb) {
					d10.couch.d10.view("album/album",{reduce: false, include_docs:true,keys: albums}, function(err,resp) {
						if ( err )	{cb(err);}
						else	cb(null,resp.rows);
					});
				};
			}
			when(
				jobs,
				function(err,resp) {
					if ( err ){
						d10.log("got details error",err);
						d10.rest.err(427,err,request.ctx);
					} else {
						d10.log("got when positive response",resp);
						request.ctx.headers["Content-Type"] = "application/json";
						response.writeHead(200,request.ctx.headers);
						response.end(JSON.stringify(resp));
					}
				}
			);
		});
	});
	
	app.get("/api/relatedArtists/:artist",function(request,response,next) {
		d10.couch.d10.view("artist/related",{key: request.params.artist},function(err,body,errBody) {
			if ( err ) {
// 				d10.log("got relatedArtists error",err,errBody);
				return d10.rest.err(427,err,request.ctx);
			}
			if ( ! body.rows.length ) {
				return d10.rest.success( {artists: [], artistsRelated:[]}, request.ctx);
			}
			var related = [], relatedKeys = [] ; 
// 			console.log("body; ",body.rows);
			body.rows.forEach(function(v) {
// 				console.log("v",v);
				if ( related.indexOf(v.value) < 0 ) {
					related.push(v.value);
				}
				relatedKeys.push( v.value );
			});
			
			
// 			related = related.rows.pop().value;
			var opts = {keys: relatedKeys};
// 			d10.log(opts);
			d10.couch.d10.view("artist/related",opts,function(err,degree2,errBody ) {
				if ( err ) {
// 					d10.log("got relatedArtists error",err, errBody);
					return d10.rest.err(427,err,request.ctx);
				}
				
				var relatedArtists = [];
				degree2.rows.forEach(function(v) {
					if ( v.value != request.params.artist 
						&& related.indexOf(v.value) < 0 
						&& relatedArtists.indexOf(v.value) < 0  )
						
						relatedArtists.push(v.value);
						
				});
				
				return d10.rest.success(
					{
						artists: related,
						artistsRelated: relatedArtists
					}
					,request.ctx			);
			});
			
			
			
			
		});
		
		
	});
	
	
}; // exports.api


























