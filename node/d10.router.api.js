//router-api.js

var d10 = require ("./d10"),
    debug = d10.debug("d10:d10.router.api"),
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
							var back = [];
							data.rows.forEach(function(v) { back.push(v.doc); });
							cb(null,back);
						}
					);
				}
			},
			function(errors,responses) {
				if ( errors ) {
					debug(errors);
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
		when(
			jobs,
			function(e,responses) {
				if ( e ) {
					debug("/api/htmlElements error(s):",e);
					d10.realrest.err(500,e,request.ctx);
				} else {
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
		var updateAliveDoc = function() {
			d10.couch.track.updateDoc("tracking/ping/"+request.ctx.user._id.replace(/^us/,"pi"),function(err,resp) {
				if ( err ) debug("/api/ping error on db request:",err);
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
					d10.couch.d10wi.storeDoc(doc,function(err,resp) {});
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
					debug("Session timestamp updated, error:",err);
				}
			});
		};
		
		bodyDecoder()(request, response,function() {
			updateAliveDoc();
			parsePlayerInfos();
			d10.realrest.success( [], request.ctx );
			updateSessionTimestamp();
		});
	
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
			} else if ( request.params.name == "audioFade" ) {
              prefValue = parseInt(prefValue,10);
              if ( isNaN(prefValue) ) {
                return d10.realrest.err(406,"preference "+request.params.name+" should be a number",request.ctx);
              }
              updateUserPreferences(
                    request, 
                    function(doc) {
                        doc[request.params.name] = prefValue;
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
	
	app.get("/api/search",function(request,response) {
		_songSearch("song/search", request, response);
	});
	var _songSearch = function(view, request,response) {
		var options = {include_docs: true};
		if ( request.query.start ) {
			var start = d10.ucwords( request.query.start.replace(/^\s+/,"").replace(/\s+$/,"") );
			var end = d10.nextWord(start);
			options.startkey = start;
			options.endkey = end;
			options.inclusive_end = false;
		}
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
					d10.couch.d10.view("artist/artist",{reduce: false, include_docs: true, keys: artists}, function(err,resp) {
						if ( err )	{cb(err);}
						else	cb(null,resp.rows);
					});
				};
			}
			if ( albums.length ) {
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
								if ( err ) { debug("findAllSongReferences error",err,resp); return  cb(err); }
								cb(null, resp.rows);
							});
						},
						d10wi: function(cb) {
							d10.couch.d10wi.view("references/songs",{key: id, include_docs: true},function(err,resp) {
								if ( err ) { debug("findAllSongReferences error",err,resp); return  cb(err); }
								cb(null, resp.rows);
							});
						},
						track: function(cb) {
							d10.couch.track.view("references/songs",{key: id, include_docs: true},function(err,resp) {
								if ( err ) {  debug("findAllSongReferences error",err,resp);return  cb(err); }
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
				debug("recordModifiedDocs recording: ",modifiedDocs);
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
					if ( err ) return then(err);
					resp.rows.forEach(function(v) {
						if  ( usage[v.key] )	usage[v.key]++;
						else					usage[v.key]=1;
					});
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
					if ( errs ) { debug("error on findAllSongReferences"); return d10.realrest.err(423,errs,request.ctx); }
					getUnusedImages(doc,function(errs,images) {
						if ( errs ) { debug("error on getUnusedImages"); return d10.realrest.err(423,errs,request.ctx); }
						removeSongReferences(doc._id, errs, references, function(errs, modifiedDocs) {
							if ( errs ) { debug("error on removeSongReferences"); return d10.realrest.err(423,errs,request.ctx); }
							recordModifiedDocs(modifiedDocs,function(err,resp) {
								if ( err ) {
									debug("error on recordModifiedDocs",err); return d10.realrest.err(423,err,request.ctx);
								} else {
									d10.realrest.success([],request.ctx);
									removeSongFile(doc._id, function(err) { if ( err ) debug("removeSongFile error",err); });
									removeUnusedImages(images,function(err){ if ( err ) debug("removeUnusedImages error",err); });
									return ;
								}
							});
						});
					});
				}
			);
			
		});
		
		
		
		
	});
	
	app.get("/api/album/firstLetter",function(request,response) {
		_albumsFirstLetter("album/firstLetter",request,response);
	});
	
	var _albumsFirstLetter = function(viewName, request,response) {
		var query = {group: true, group_level: 1};
		d10.couch.d10.view(viewName,query,function(err,resp) {
			if( err ) {
				debug(err);
				return d10.realrest.err(423, request.params.sort, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	};
	
    app.get("/api/genres/available", function(request, response) {
      d10.couch.d10.view("genre/name",{
        group: true, 
        group_level: 1,
      }, function(err,resp) {
        if( err ) {
          debug(err);
          return d10.realrest.err(423, null, request.ctx);
        }
        d10.realrest.success(resp.rows,request.ctx);
      });
    });
    
	app.get("/api/genre/gotAlbums/:genre", function(request, response) {
		if ( !request.params.genre || 
			d10.config.allowCustomGenres == false && d10.config.genres.indexOf(request.params.genre) < 0 ) {
			return d10.realrest.err(428, request.params.genre, request.ctx);
		}
		d10.couch.d10.view("genre/albums",{
			group: true, 
			group_level: 1,
			startkey: [request.params.genre],
			endkey: [request.params.genre,[]]
		}, function(err,resp) {
			debug(err,resp);
			if( err ) {
				debug(err);
				return d10.realrest.err(423, request.params.genre, request.ctx);
			}
			d10.realrest.success({albums: resp.rows.length ? true : false},request.ctx);
		});
	});
    
    app.get("/api/genre/resume/:genre", function(request, response) {
        if ( !request.params.genre || 
            d10.config.allowCustomGenres == false && d10.config.genres.indexOf(request.params.genre) < 0 ) {
            return d10.realrest.err(428, request.params.genre, request.ctx);
        }
        
        var getAlbums = function(genre, cb) {
            var startkey = [genre];
            var endkey = [genre, {}];
            d10.couch.d10.view("genre/albums",{reduce: true, group: true, group_level: 2, startkey: startkey, endkey: endkey}, function(err,resp) {
                if ( err ) {
                    return cb(err);
                }
                var albums = [];
                for (var i in resp.rows ) {
                    if ( albums.indexOf(resp.rows[i].key[1]) < 0) {
                        albums.push(resp.rows[i].key[1]);
                    }
                }
                return cb(null, albums.length);
            });
        };
        
        var getArtists = function(genre, cb) {
            var startkey = [genre];
            var endkey = [genre, {}];
            d10.couch.d10.view("genre/artists",{reduce: true, group: true, group_level: 2, startkey: startkey, endkey: endkey}, function(err,resp) {
                if ( err ) {
                    return cb(err);
                }
                var artists = [];
                for (var i in resp.rows ) {
                    if ( artists.indexOf(resp.rows[i].key[1])<0 ) {
                        artists.push(resp.rows[i].key[1]);
                    }
                }
                return cb(null, artists.length);
            });
        };
        
        var getSongInfos = function(genre,cb) {
            d10.couch.d10.view("genre/songInfos",{reduce: true, group: true, group_level: 1, key: genre}, function(err,resp) {
                if ( err ) { return cb(err); }
                if ( !resp.rows.length ) { return cb("Unknown genre in database"); }
                return cb(null,resp.rows[0].value);
            });
        };
        
        when({
                songs: function(cb) {getSongInfos(request.params.genre,cb);} ,
                albums: function(cb) {getAlbums(request.params.genre,cb);} ,
                artists: function(cb) {getArtists(request.params.genre,cb);}
            },
            function(errs,resps) {
                if ( errs )
                  return d10.realrest.err(423, errs, request.ctx);
                
                return d10.realrest.success(resps, request.ctx);
            }
        );
        
        
    });
    
}; // exports.api


























