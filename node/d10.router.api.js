//router-api.js

var d10 = require ("./d10"),
	bodyDecoder = require("connect").bodyParser,
	querystring = require("querystring"),
	qs = require("qs"),
	fs = require("fs"),
	os = require("os"),
	when = require("./when"),
	users = require("./d10.users"),
	exec = require('child_process').exec;

exports.api = function(app) {

	app.post("/api/songs",function(request,response) {
		bodyDecoder()(request, response,function() {
			request.ctx.headers["Content-type"] = "application/json";
// 			console.log("/api/songs",request.body);
			if ( ! request.body["ids"] || 
				Object.prototype.toString.call(request.body["ids"]) !== '[object Array]' ||
				!request.body["ids"].length ) {
				d10.realrest.success([],request.ctx);
			} else {
				for ( var index in request.body["ids"] ) {
					if ( request.body["ids"][index].substr(0,2) != "aa" ) {
						d10.realrest.success([],request.ctx);
						return ;
					}
				}
				d10.couch.d10.getAllDocs({keys:request.body["ids"],include_docs: true},function(err,resp) {
					if ( err ) {
						d10.realrest.err(500,err,request.ctx);
					} else {
						d10.realrest.success(resp.rows.map(function(v) {return v.doc;}),request.ctx);
					}
				});
			} 
			
		});
	});
	
	
	app.get("/api/song/aa:id",function(request,response) {
		d10.couch.d10.getDoc("aa"+request.params.id, function(err,doc) {
			if ( err ) {
				return d10.realrest.err(404,{error: "Document not found", reason: "id aa"+request.params.id+" not found"},request.ctx);
			}
			return d10.realrest.success(doc,request.ctx);
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
							console.log(data);
							var back = [];
// 							console.log(arguments);
							data.rows.forEach(function(v) { back.push(v.doc); });
							cb(null,back);
						}
					);
				}
			},
			function(errors,responses) {
				if ( errors ) {
					d10.log("debug",errors);
					d10.realrest.err(423,null,request.ctx);
				} else {
					responses.user = request.ctx.user;
					d10.realrest.success(responses,request.ctx);
				}
			}
		);
	}); // /api/userinfos
	
	app.get("/api/htmlElements", function(request,response) {
		
		var jobs = {}
		for ( var jobname in d10.config.templates.clientList ) {
			jobs[jobname] = (function(tpl,j) {
								return function(cb) {
									request.ctx.langUtils.parseServerTemplate(request,tpl,cb);
								};
							})(d10.config.templates.clientList[jobname],jobname);
		}
		jobs.dynamic = function(cb) { request.ctx.langUtils.loadLang(request.ctx.lang, "client",cb); };
		request.ctx.headers["Content-type"] = "application/json";
		when(
			jobs,
			function(e,responses) {
				if ( e ) {
					d10.log("error");d10.log(e);
					d10.realrest.err(500,e,request.ctx);
				} else {
					d10.log("success");
					var dynamic = responses.dynamic;
					delete responses.dynamic;
					for ( var i in dynamic ) {
						responses[i] = dynamic[i];
					}
					d10.realrest.success(responses,request.ctx);
				}
			}
		);
	});

	app.get("/api/length", function(request,response) {
		d10.couch.d10.view("song/length",function(err,resp) {
			if ( err ) d10.realrest.err(423,resp,request.ctx);
			var len = 0;
			try {
				len = resp.rows.shift().value;
				d10.realrest.success( {"length": len}, request.ctx );
			} catch (e) {
				d10.realrest.success( {"length": 0}, request.ctx );
			}
		});
	});
	
	
	app.get("/api/serverLoad", function(request,response) {
		d10.realrest.success( {load: os.loadavg()}, request.ctx );

	});
	
	app.get("/api/toReview",function(request,response) {
		d10.couch.d10.view("user/song",{key: [ request.ctx.user._id, false ]},function(err,resp) {
			if ( err )	d10.realrest.err(423,err,request.ctx)
			else		d10.realrest.success( {count: resp.rows.length}, request.ctx );
		});
	});


	app.put("/api/current_playlist",function(request,response) 
	{
		var body = "";
		request.setEncoding("utf8");
		request.on("data",function(chunk) { body+=chunk; });
		request.on("end",function() {
			var data = querystring.parse(body);
			d10.couch.d10wi.getDoc(request.ctx.user._id.replace(/^us/,"up"),function(err,userPreferences) {
				if ( err ) { return d10.realrest.err(413,err,request.ctx);}
				
				var recordDoc = function() {
					userPreferences.playlist = {};
					for ( var k in data) {
						userPreferences.playlist[k.replace("[]","")] = data[k];
					}
					if ( userPreferences.playlist.list && typeof userPreferences.playlist.list == "string" ) {
						userPreferences.playlist.list = [ userPreferences.playlist.list ];
					}
					d10.couch.d10wi.storeDoc(userPreferences,function(err,response) {
						if ( err )	d10.realrest.err(413,err,request.ctx);
						else		d10.realrest.success( [], request.ctx );
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
							d10.realrest.err(413,err,request.ctx);
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
	
	app.post("/api/ping",function(request,response) {
		d10.log("debug","router:","POST /api/ping");
		request.on("data",function() {d10.log("debug","ping data reached");});
		request.on("end",function() {d10.log("debug","ping end reached");});
		var updateAliveDoc = function() {
			d10.couch.track.updateDoc("tracking/ping/"+request.ctx.user._id.replace(/^us/,"pi"),function(err,resp) {
				if ( err ) d10.log(err);
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
			});
			
		};
		
		var updateSessionTimestamp = function() {
			request.ctx.session.ts_last_usage = new Date().getTime();
			d10.couch.auth.storeDoc(request.ctx.session, function(err) {
				if ( err ) {
					d10.log("debug","Session timestamp updated, error: ",err);
				}
			});
		};
		
		bodyDecoder()(request, response,function() {
			d10.log("debug",request.body,"after decode");
			updateAliveDoc();
			parsePlayerInfos();
			d10.realrest.success( [], request.ctx );
			updateSessionTimestamp();
		});
	
	});

	app.post("/api/own/random",function(request,response) {
		_random( request.ctx.user._id +"/genre_unsorted", request, response);
	});
	app.post("/api/random",function(request,response) {
		_random("genre/unsorted", request, response);
	});
	var _random = function(view, request,response) {
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
			request.body = qs.parse(body);
			d10.log("request.body: ",request.body);
			var count = parseInt(request.body.count);
			if ( isNaN(count) || count < 1 ){
				return d10.realrest.err(427,"count",request.ctx);
			}
			var data = {};
			var name = getArray(request.body["name"]);
			if ( name.length ) {
				data.keys = name;
			}
			var not = getArray(request.body["not"]);
			var really_not = getArray(request.body["really_not"]);
			d10.couch.d10.view(view,data,function(err,response) {
				if ( err ) {
					return d10.realrest.err(423,err,request.ctx);
				}
				var random = getRandomIds(response,count,not,really_not);
				if ( !random.length ) {
					return d10.realrest.success({songs: []},request.ctx);
				}
				d10.couch.d10.getAllDocs({keys: random, include_docs: true},function(err,resp) {
					if ( err ) {
						return d10.realrest.err(423,err,request.ctx);
					}
					var back = [];
					resp.rows.forEach(function(v) { back.push(v.doc); });
					d10.realrest.success(back,request.ctx);
				});
			});
		});
	};
	
	app.post("/api/volume",function(request,response) {
		bodyDecoder()(request, response,function() {
			var volume = (request.body && "volume" in request.body) ? parseFloat(request.body.volume) : 0;
			if ( isNaN(volume) )	volume=0;
			d10.couch.d10wi.getDoc("up"+request.ctx.user._id.substr(2),function(err,doc) {
				if ( err ) { return d10.realrest.err(423,err,request.ctx); }
				doc.volume = volume;
				d10.couch.d10wi.storeDoc(doc,function(err,resp) {
					if ( err ) { d10.realrest.err(423,err,request.ctx); }
					else { d10.realrest.success([],request.ctx); }
				});
			});
		});
	});
	
	
	var updateUserPreferences = function(request, onDoc, callback) {
		d10.couch.d10wi.getDoc("up"+request.ctx.user._id.substr(2),function(err,doc) {
			if ( err ) { return callback(err); }
			onDoc(doc);
			d10.couch.d10wi.storeDoc(doc,callback);
		});
	};
	
	app.put("/api/preference/:name",function(request,response) {
		var defaultCallback = function(err,resp) {
			if ( err ) { d10.realrest.err(423,err,request.ctx); }
			else { d10.realrest.success([],request.ctx); }
		};
		bodyDecoder()(request, response,function() {
			var prefValue = (request.body && "value" in request.body) ? request.body.value : null;
			if ( request.params.name == "hiddenExtendedInfos" || request.params.name == "hiddenReviewHelper" ) {
				updateUserPreferences(
					request, 
					function(doc) {
						if ( prefValue && prefValue == "true" ) {
							doc[request.params.name] = true;
						} else {
							delete doc[request.params.name];
						}
					},
					defaultCallback
				);
			} else {
				d10.realrest.err(404,"preference "+request.params.name+" is unknown",request.ctx);
			}
		});
	});
	
	app.put("/api/starring/likes/aa:id",function(request,response) {
		var starring = function() {
			d10.couch.d10wi.getDoc("up"+request.ctx.user._id.substr(2),function(err,doc) {
				if ( err) { return d10.realrest.err(423,err,request.ctx); }
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
					if ( err ) { d10.realrest.err(423,err,request.ctx); }
					else { d10.realrest.success({id: "aa"+request.params.id, star: star },request.ctx); }
				});
			});
		};
		d10.couch.d10.getDoc("aa"+request.params.id, function(err,resp) {
			if ( err ) { d10.realrest.err(427,err,request.ctx); }
			else {  starring(); }
		});
	});
	
	app.put("/api/starring/dislikes/aa:id",function(request,response) {
		var starring = function() {
			d10.couch.d10wi.getDoc("up"+request.ctx.user._id.substr(2),function(err,doc) {
				if ( err ) { return d10.realrest.err(423,err,request.ctx); }
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
					if ( err ) { d10.realrest.err(423,err,request.ctx);}
					else { d10.realrest.success({id: "aa"+request.params.id, star: star },request.ctx); }
				});
			});
		};
		d10.couch.d10.getDoc("aa"+request.params.id, function(err,resp) {
			if ( err ) { d10.realrest.err(427,err,request.ctx); }
			else {  starring(); }
		});
	});
	
	app.get("/api/own/search",function(request,response) {
		_songSearch(request.ctx.user._id+"/song_search", request, response);
	});
	app.get("/api/search",function(request,response) {
		_songSearch("song/search", request, response);
	});
	var _songSearch = function(view, request,response) {
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
		d10.couch.d10.view(view, options, function(err,resp) {
			if ( err ) { return d10.realrest.err(423,err,request.ctx); }
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
			d10.realrest.success(results, request.ctx);
		});
	};
	
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
						d10.realrest.err(427,err,request.ctx);
					} else {
						d10.realrest.success(resp, request.ctx);
					}
				}
			);
		});
	});
	
	app.get("/api/relatedArtists/:artist",function(request,response,next) {
		d10.couch.d10.view("artist/related",{key: request.params.artist},function(err,body,errBody) {
			if ( err ) {
				return d10.realrest.err(427,err,request.ctx);
			}
			if ( ! body.rows.length ) {
				return d10.realrest.success( {artists: [], artistsRelated:[]}, request.ctx);
			}
			var related = [], relatedKeys = [], relatedHash = {} ; 
			body.rows.forEach(function(v) {
				if ( v.value in relatedHash ) {
					relatedHash[v.value]++;
				} else {
					relatedHash[v.value] = 1;
				}
				if ( related.indexOf(v.value) < 0 ) {
					related.push(v.value);
				}
				relatedKeys.push( v.value );
			});
			
			var opts = {keys: relatedKeys};
			d10.couch.d10.view("artist/related",opts,function(err,degree2,errBody ) {
				if ( err ) {
					return d10.realrest.err(427,err,request.ctx);
				}
				
				var relatedArtists = [], relatedArtistsHash = {};
				degree2.rows.forEach(function(v) {
					if ( v.value != request.params.artist && !relatedHash[v.value] ) {
						if ( v.value in relatedArtistsHash ) {
							relatedArtistsHash[v.value]++;
						} else {
							relatedArtistsHash[v.value] = 1;
						}
					}
					if ( v.value != request.params.artist 
						&& related.indexOf(v.value) < 0 
						&& relatedArtists.indexOf(v.value) < 0  )
						
						relatedArtists.push(v.value);
						
				});
				
				return d10.realrest.success(
					{
						artists: relatedHash,
						artistsRelated: relatedArtistsHash
					}
					,request.ctx			);
			});
			
			
			
			
		});
		
		
	});
	
	/*
	 track : _id: pt....  , song: aa....

	d10wi : _id: aa....
	_id: pr.... , listen: {aa.... : 2}
	_id: up.... , likes: {aa....: true}
	_id: up.... , dislikes: {aa....: true}
	_id: up.... , playlist: {list: [aa....]}

	d10:
	_id: aa....
	_id: pl.... , songs: [aa....]
	*/
	app.delete("/api/song/aa:id",function(request,response,next) {
		
		var 
			findAllSongReferences = function(id, then) {
				when(
					{
						d10: function(cb) {
							d10.couch.d10.view("references/songs",{key: id, include_docs: true},function(err,resp) {
								if ( err ) { console.log("findAllSongReferences error",err,resp); return  cb(err); }
								cb(null, resp.rows);
							});
						},
						d10wi: function(cb) {
							d10.couch.d10wi.view("references/songs",{key: id, include_docs: true},function(err,resp) {
								if ( err ) { console.log("findAllSongReferences error",err,resp); return  cb(err); }
								cb(null, resp.rows);
							});
						},
						track: function(cb) {
							d10.couch.track.view("references/songs",{key: id, include_docs: true},function(err,resp) {
								if ( err ) {  console.log("findAllSongReferences error",err,resp);return  cb(err); }
								cb(null, resp.rows);
							});
						}
					},
					function(errs,responses) {
						then(errs,responses);
					}
				);
				
				
			},
			removeSongReferences = function (id, errs, responses, then ) {
				if ( errs ) { return then(errs); }
				var modifiedDocs = {d10:[], d10wi: [], track: []};
				responses.d10.forEach(function(v) {
					if ( v.doc._id == id ) {
						v.doc._deleted = true;
						modifiedDocs.d10.push(v.doc);
					} else if ( v.doc._id.substr(0,2) == "pl" && v.doc.songs ) {
						var newList = []
						v.doc.songs.forEach(function(val,k){if ( val != id ) newList.push(val); });
						v.doc.songs = newList;
						modifiedDocs.d10.push(v.doc);
					}
				});
				responses.d10wi.forEach(function(v) {
					if ( v.doc._id == id ) {
						v.doc._deleted = true;
						modifiedDocs.d10wi.push(v.doc);
					} else if ( v.doc._id.substr(0,2) == "pr" ) {
						var listen = {};
						for ( var i in v.doc.listen ) {
							if ( i != id ) {
								listen[i] = v.doc.listen[i];
							}
						}
						v.doc.listen = listen;
						modifiedDocs.d10wi.push(v.doc);
					} else if ( v.doc._id.substr(0,2) == "up" ) {
						var replacement;
						if ( v.doc.likes ) {
							replacement = {};
							for ( var i in v.doc.likes ) {
								if ( i != id ) {
									replacement[i] = v.doc.likes[i];
								}
							}
							v.doc.likes = replacement;
						}
						replacement = null;
						if ( v.doc.dislikes ) {
							replacement = {};
							for ( var i in v.doc.dislikes ) {
								if ( i != id ) {
									replacement[i] = v.doc.dislikes[i];
								}
							}
							v.doc.dislikes = replacement;
						}
						replacement = null;
						if ( v.doc.playlist && v.doc.playlist.list ) {
							replacement = [];
							v.doc.playlist.list.forEach(function(val,k){if ( val != id ) replacement.push(val); });
// 							replacement = v.doc.playlist.list.filter(function(val) { return (val != id) ; });
							v.doc.playlist.list = replacement;
						}
						modifiedDocs.d10wi.push(v.doc);
					}
				});
				responses.track.forEach(function(v) {
					if ( v.doc._id.substr(0,2) == "pt" && v.doc.song == id ) {
						v.doc._deleted = true;
						modifiedDocs.track.push(v.doc);
					}
				});
				then(null,modifiedDocs);
			},
			recordModifiedDocs = function(modifiedDocs,then) {
				console.log("recordModifiedDocs recording: ",modifiedDocs);
				var actions = {};
				if ( modifiedDocs.d10.length ) {
					actions.d10 = function(cb) {
						d10.couch.d10.storeDocs(modifiedDocs.d10,cb);
					};
				}
				if ( modifiedDocs.d10wi.length ) {
					actions.d10wi = function(cb) {
						d10.couch.d10wi.storeDocs(modifiedDocs.d10wi,cb);
					};
				}
				if ( modifiedDocs.track.length ) {
					actions.track = function(cb) {
						d10.couch.track.storeDocs(modifiedDocs.track,cb);
					};
				}
				if ( !actions.d10 && !actions.d10wi && !actions.track ) {
					return then();
				}
				when(actions,then);
			},
			removeSongFile = function(id, then) {
				id = id.substr(2);
				var file = d10.config.audio.dir +"/"+ id.substr(0,1) + "/aa" + id+".ogg";
				fs.unlink(file,then);
			},
			getUnusedImages = function(doc, then) {
				var keys = [], usage = {},filenames = {};
				if ( doc.images ) {
					doc.images.forEach(function(v) {
						keys.push(v.sha1);
						filenames[v.sha1] = v.filename;
					});
				}
				if ( !keys.length ) {
					return then(null,[]);
				}
				d10.couch.d10.view("images/sha1",{keys: keys}, function(err,resp) {
					console.log(resp);
					if ( err ) return then(err);
					resp.rows.forEach(function(v) {
						if  ( usage[v.key] )	usage[v.key]++;
						else					usage[v.key]=1;
					});
					console.log(usage);
					var back = [];
					keys.forEach(function(v) { 
						if ( !usage[v] || usage[v]<2 ) {
							back.push({sha1: v, filename: filenames[v]});
						}
					});
					return then(null,back);
				});
			},
			removeUnusedImages = function(images, then) {
				var actions = {};
				images.forEach(function(i) {
					if ( i.filename && i.filename.length ) {
						actions[i.sha1] = (function(i) {
							return function(cb) {
								fs.unlink(d10.config.images.dir+"/"+i.filename,cb);
							};
						})(i);
					}
				});
				if ( !d10.count(actions) ) {
					return then();
				}
				when(actions,then);
			}
		;
		
		
		d10.couch.d10.getDoc("aa"+request.params.id,function(err,doc) {
			if ( err ) {
				return d10.realrest.err(423,err,request.ctx);
			}
			if ( doc.user != request.ctx.user._id && !request.ctx.user.superman ) {
				return d10.realrest.err(403,"You are not allowed to delete this song",request.ctx);
			}
			
			
			
			findAllSongReferences(doc._id,
				function(errs,references) {
					if ( errs ) { console.log("error on findAllSongReferences"); return d10.realrest.err(423,errs,request.ctx); }
					getUnusedImages(doc,function(errs,images) {
						if ( errs ) { console.log("error on getUnusedImages"); return d10.realrest.err(423,errs,request.ctx); }
						removeSongReferences(doc._id, errs, references, function(errs, modifiedDocs) {
							if ( errs ) { console.log("error on removeSongReferences"); return d10.realrest.err(423,errs,request.ctx); }
							recordModifiedDocs(modifiedDocs,function(err,resp) {
								if ( err ) {
									console.log("error on recordModifiedDocs",err); return d10.realrest.err(423,err,request.ctx);
								} else {
									d10.realrest.success([],request.ctx);
									removeSongFile(doc._id, function(err) { if ( err ) console.log("removeSongFile error",err); });
									removeUnusedImages(images,function(err){ if ( err ) console.log("removeUnusedImages error",err); });
									return ;
								}
							});
						});
					});
				}
			);
			
		});
		
		
		
		
	});
	
	app.get("/api/own/album/firstLetter",function(request,response) {
		_albumsFirstLetter(request.ctx.user._id+"/album_firstLetter",request,response);
	});
	app.get("/api/album/firstLetter",function(request,response) {
		_albumsFirstLetter("album/firstLetter",request,response);
	});
	
	var _albumsFirstLetter = function(viewName, request,response) {
		var query = {group: true, group_level: 1};
		d10.couch.d10.view(viewName,query,function(err,resp) {
			if( err ) {
				console.log(err);
				return d10.realrest.err(423, request.params.sort, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	};
	
}; // exports.api


























