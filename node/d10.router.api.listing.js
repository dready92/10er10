var d10 = require ("./d10"),
	querystring = require("querystring"),
	qs = require("qs"),
	exec = require('child_process').exec;

exports.api = function(app) {
	app.get("/api/pagination/:sort", function(request,response) {
		var sortTypes = [ "hits","ts_creation","album","artist","genre","title","s_user","s_user_likes" ],
		query = {rpp: d10.config.rpp},
		db = d10.couch.d10;

		var preHooks = {
			hits: function() {
				query.reduce = false;
				query.descending = true;
				db = d10.couch.d10wi;
			},
			ts_creation: function() {
				query.reduce = false;
				query.descending = true;
			},
			album: function() {
				if ( request.query.album && request.query.album.length ) {
					query.startkey = [request.query.album];
					query.endkey = [request.query.album,[]];
				}
				query.reduce = false;
			},
			artist: function() {
				if ( request.query.artist && request.query.artist.length ) {
					query.startkey = [request.query.artist];
					query.endkey = [request.query.artist,[]];
				}
				query.reduce = false;
			},
			genre: function() {
				if ( !request.query.genre || d10.config.genres.indexOf(request.query.genre) < 0 ) {
					return d10.rest.err(428, request.query.genre, request.ctx);
				}
				query.reduce = false;
				query.startkey = [request.query.genre];
				query.endkey = [request.query.genre,[]];
			},
			title: function () {
				query.reduce = false;
				if ( request.query.title && request.query.title.length ) {
					query.startkey = [request.query.title];
					query.endkey = [request.query.title,[]];
				}
			},
			s_user: function () {
				query.startkey = [request.ctx.user._id];
				query.endkey = [request.ctx.user._id,[]];
			},
			s_user_likes: function () {
				query.startkey = [request.ctx.user._id];
				query.endkey = [request.ctx.user._id,[]];
				db = d10.couch.d10wi;
			}
		};
		
		if ( sortTypes.indexOf(request.params.sort) < 0 ){
			return d10.rest.err(427, request.params.sort, request.ctx);
		}
		if ( preHooks[request.params.sort] && preHooks[request.params.sort].call ) {
			preHooks[request.params.sort].call(this);
		}
		
		db.list("pagination/mapping/"+request.params.sort+"/name",query,function(err,resp) {
			if ( err ) {
				d10.log(err);
				d10.rest.err(423, request.params.sort, request.ctx);
			} else {
				d10.rest.success(resp.pages,request.ctx);
			}
		});
	});

/*
	app.get("/api/ts_creation",function(request,response) {
		console.log(request.query);
		var query = {include_docs: true, reduce: false, descending: true, limit: d10.config.rpp};
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
			request.query["startkey[]"][0] = parseInt(request.query["startkey[]"][0]);
			query.startkey = request.query["startkey[]"];
			query.startkey_docid = request.query.startkey_docid;
		}
		console.log(query);
		d10.couch.d10.view("ts_creation/name",query,function(err,resp,meta) {
			d10.log(err,resp,meta);
			if ( err ) {
				return d10.rest.err(423, request.params.sort, request.ctx);
			}
			d10.rest.success(resp,request.ctx);
		});
	});

	app.get("/api/hits",function(request,response) {
		var query = {reduce: false, descending: true, limit: d10.config.rpp};
		d10.log("/api/hits query: ",request.query);
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
			request.query["startkey[]"][0] = parseInt(request.query["startkey[]"][0]);
			query.startkey = request.query["startkey[]"];
			query.startkey_docid = request.query.startkey_docid
		}
		d10.couch.d10wi.view("hits/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, request.params.sort, request.ctx);
			}
			var keys = [];
			for ( var i in resp.rows ) { keys.push(resp.rows[i].id);	}
			
			d10.couch.d10.getAllDocs( {keys: keys, include_docs: true}, function(err,resp ) {
				if ( err ) {
					return d10.rest.err(423, request.params.sort, request.ctx);
				}
				d10.rest.success(resp,request.ctx);
			});
			

		});
	});
	
	app.get("/api/titles/titles",function(request,response) {
		var query = {include_docs: true, reduce: false, limit: d10.config.rpp};
		if ( request.query.title && request.query.title.length ) {
			query.endkey = [request.query.title,[]];
		}
		
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
			query.startkey = request.query["startkey[]"];
			query.startkey_docid = request.query.startkey_docid;
		}
		
		d10.couch.d10.view("title/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, request.params.sort, request.ctx);
			}
			d10.rest.success(resp,request.ctx);
		});
	});
	
	app.get("/api/artists/artists",function(request,response) {
		var query = {include_docs: true, reduce: false, limit: d10.config.rpp};
		if ( request.query.artist && request.query.artist.length ) {
			query.endkey = [request.query.artist,[]];
		}
		
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
			query.startkey = request.query["startkey[]"];
			query.startkey_docid = request.query.startkey_docid;
		}
		
		d10.couch.d10.view("artist/name",query,function(err,resp) {
			if( err ) {
				return d10.rest.err(423, request.params.sort, request.ctx);
			}
			d10.rest.success(resp,request.ctx);
		});
	});
	
	app.get("/api/albums/albums",function(request,response) {
		var query = {include_docs: true, reduce: false, limit: d10.config.rpp};
		if ( request.query.album && request.query.album.length ) {
			query.endkey = [request.query.album,[]];
		}
		
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
			request.query["startkey[]"][1] = parseInt(request.query["startkey[]"][1]);
			query.startkey = request.query["startkey[]"];
			query.startkey_docid = request.query.startkey_docid;
		}
		
		d10.couch.d10.view("album/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, err, request.ctx);
			}
			d10.rest.success(resp,request.ctx);
		});
	});
	*/
	app.get("/api/songs/s_user",function(request,response) {
		var query = {include_docs: true, endkey: [request.ctx.user._id,[]], limit: d10.config.rpp};
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
			query.startkey = request.query["startkey[]"];
			query.startkey_docid = request.query.startkey_docid;
		}
		
		d10.couch.d10.view("s_user/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, err, request.ctx);
			} else {
				d10.rest.success(resp,request.ctx);
			}
		});
	});
	

	app.get("/api/usersongs",function(request,response) {
		var query = {include_docs: true, endkey: [request.ctx.user._id,[]], limit: d10.config.rpp};
		
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
			query.startkey = request.query["startkey[]"];
			query.startkey_docid = request.query.startkey_docid;
		}
		
		d10.couch.d10wi.view("s_user_likes/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, err, request.ctx);
			}
			var keys = [];
			for ( var  i in resp.rows ) {
				keys.push(resp.rows[i].value);
			}
			
			d10.couch.d10.getAllDocs({include_docs: true, keys: keys},function(err,resp) {
				if ( err ) {
					return d10.rest.err(423, err, request.ctx);
				}
				d10.rest.success(resp,request.ctx);
			});
		});
	});
	
	app.get("/api/genres/genres",function(request,response) {
		if ( !request.query.genre || d10.config.genres.indexOf(request.query.genre) < 0 ) {
			return d10.rest.err(428, request.query.genre, request.ctx);
		}
		var query = {include_docs: true, reduce: false, limit: d10.config.rpp,endkey: [request.query.genre, {} ]};
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
			query.startkey = request.query["startkey[]"];
			query.startkey_docid = request.query.startkey_docid ;
		}
		d10.couch.d10.view("genre/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, err, request.ctx);
			}
			d10.rest.success(resp,request.ctx);
		});
	});
	
	
	app.get("/api/title",function(request,response) {
		var query = {inclusive_end: false};
		if ( request.query.start && request.query.start.length ) {
			var q = d10.ucwords(request.query.start);
			query.startkey = [q];
			query.endkey = [d10.nextWord(q)];
		}
		
		d10.couch.d10.list("title/search/search",query, function(err,resp) {
			if ( err ) {
				response.writeHead(200, request.ctx.headers );
				response.end (
					"[]"
				);
			} else {
				response.writeHead(200, request.ctx.headers );
				response.end (
					JSON.stringify(resp.titles)
				);
			}
		});
	});
	
	app.get("/api/artist",function(request,response) {
		var query = {group: true};
		if ( request.query.start && request.query.start.length ) {
			var q = d10.ucwords(request.query.start);
			query.startkey = [q];
			query.endkey = [d10.nextWord(q)];
		}
		d10.couch.d10.view("artist/search",query, function(err,resp) {
			if ( err ) {
				response.writeHead(200, request.ctx.headers );
				response.end (
					"[]"
				);
			} else {
				d10.log(resp);
				var buffer = {}, back = [];
				// remote doubles
				resp.rows.forEach(function(row) {
					buffer[row.key[1]] ={text: row.key[1],json: row.key[1]}
				});
				for ( var i in buffer ) {back.push(buffer[i]);}
				
				response.writeHead(200, request.ctx.headers );
				response.end ( JSON.stringify(back) );
			}
		});
	});
	
	app.get("/api/album",function(request,response) {
		var query = {inclusive_end: false};
		if ( request.query.start && request.query.start.length ) {
			var q = d10.ucwords(request.query.start);
			query.startkey = [q];
			query.endkey = [d10.nextWord(q)];
		}

		d10.couch.d10.list("album/search/search",query,function(err,resp) {
			if( err ) {
				response.writeHead(200, request.ctx.headers );
				response.end (
					"[]"
				);
			} else {
				response.writeHead(200, request.ctx.headers );
				response.end (
					JSON.stringify(resp.albums)
				);
			}
		});
	});
	
	app.get("/api/genre",function(request,response) {
		if ( request.query.start && request.query.start.length ) { 
			var resp = [], reg = new RegExp( request.query.start, "i" );
			d10.config.genres.forEach(function(genre,k) {
				if ( genre.search( reg ) === 0 ) {
					resp.push(genre);
				}
			});
			response.writeHead(200, request.ctx.headers );
			response.end (
				JSON.stringify( resp )
			);

		} else {
			response.writeHead(200, request.ctx.headers );
			response.end (
				JSON.stringify( d10.config.genres )
			);
		}
	});
	
	
	app.get("/api/artistsListing",function(request,response) {
		
		var query = {group:true, group_level: 1};
		d10.couch.d10.view("artist/tokenized",query,function(err,resp) {
			if ( err ) {
				d10.rest.err(423, err, request.ctx);
			}else {
				d10.rest.success(resp,request.ctx);
			}
		});
	});
	app.get("/api/genresResume",function(request,response) {
		d10.couch.d10.view("genre/artist",{group:true, group_level: 1},function(err,resp) {
			if ( err ) {
				d10.rest.err(423, err, request.ctx);
			}else {
				d10.rest.success(resp.rows,request.ctx);
			}
		});
	});
	
	
	
	
	
	
	
	
	app.get("/api/list/artists",function(request,response) {
		var query = {include_docs: true, limit: d10.config.rpp + 1};
		var view = "basename";
		if ( request.query.artist && request.query.artist.length ) {
			query.startkey = [request.query.artist];
			query.endkey = [request.query.artist,[]];
			view = "name";
			query.reduce = false;
		}
		if ( request.query.startkey_docid && request.query["startkey"] ) {
			query.startkey = JSON.parse(request.query["startkey"]);
			query.startkey_docid = request.query.startkey_docid;
		}
		
		d10.couch.d10.view("artist/"+view,query,function(err,resp) {
			if( err ) {
				return d10.rest.err(423, request.params.sort, request.ctx);
			}
// 			setTimeout(function() {
				d10.rest.success(resp.rows,request.ctx);
// 			},2000);
		});
	});
	
	app.get("/api/list/creations",function(request,response) {
// 		console.log(request.query);
		var query = {include_docs: true, reduce: false, descending: true, limit: d10.config.rpp+1};
		if ( request.query.startkey_docid && request.query["startkey"] ) {
// 			request.query["startkey[]"][0] = parseInt(request.query["startkey[]"][0]);
			query.startkey = JSON.parse(request.query["startkey"]);
			query.startkey_docid = request.query.startkey_docid;
		}
// 		console.log(query);
		d10.couch.d10.view("ts_creation/name",query,function(err,resp,meta) {
			d10.log(err,resp,meta);
			if ( err ) {
				return d10.rest.err(423, request.params.sort, request.ctx);
			}
			d10.rest.success(resp.rows,request.ctx);
		});
	});
	
	app.get("/api/list/hits",function(request,response) {
		var query = {reduce: false, descending: true, limit: d10.config.rpp+1};
// 		d10.log("/api/hits query: ",request.query);
		if ( request.query.startkey_docid && request.query["startkey"] ) {
// 			request.query["startkey[]"][0] = parseInt(request.query["startkey[]"][0]);
			query.startkey = JSON.parse(request.query["startkey"]);
			query.startkey_docid = request.query.startkey_docid
		}
// 		d10.log("/api/hits query: ",query);
		d10.couch.d10wi.view("hits/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, request.params.sort, request.ctx);
			}
			var keys=[];
// 			d10.log("first response: ",resp.rows);
			for ( var i in resp.rows ) { keys.push(resp.rows[i].id);	}
// 			d10.log("keys length: ",keys.length);
			d10.couch.d10.getAllDocs( {keys: keys, include_docs: true}, function(err,resp2 ) {
				if ( err ) {
					return d10.rest.err(423, request.params.sort, request.ctx);
				}
// 				d10.log("second response: ",resp2.rows);
				var back = [];
				resp.rows.forEach(function(v,i) {
					back.push ({
						id: v.id,
						key: v.key,
						doc: resp2.rows[i].doc
					});
				});
// 				d10.log("returning "+resp.rows.length+" rows");
				d10.rest.success(back,request.ctx);
			});
		});
	});
	
	app.get("/api/list/genres",function(request,response) {
		if ( !request.query.genre || d10.config.genres.indexOf(request.query.genre) < 0 ) {
			return d10.rest.err(428, request.query.genre, request.ctx);
		}
		var query = {include_docs: true, reduce: false, limit: d10.config.rpp+1 ,endkey: [request.query.genre, {} ]};
		if ( request.query.startkey_docid && request.query["startkey"] ) {
			query.startkey = JSON.parse(request.query["startkey"]);
			query.startkey_docid = request.query.startkey_docid ;
		} else {
			query.startkey =  [request.query.genre];
		}
		d10.couch.d10.view("genre/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, err, request.ctx);
			}
			d10.rest.success(resp.rows,request.ctx);
		});
	});
	
	app.get("/api/list/titles",function(request,response) {
		var query = {include_docs: true, reduce: false, limit: d10.config.rpp+1};
		if ( request.query.title && request.query.title.length ) {
			query.startkey = [request.query.title];
			query.endkey = [request.query.title,[]];
		}
		
		if ( request.query.startkey_docid && request.query["startkey"] ) {
			query.startkey = JSON.parse(request.query["startkey"]);
			query.startkey_docid = request.query.startkey_docid;
		}
		
		d10.couch.d10.view("title/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, request.params.sort, request.ctx);
			}
			d10.rest.success(resp.rows,request.ctx);
		});
	});

	app.get("/api/list/albums",function(request,response) {
		var query = {include_docs: true, reduce: false, limit: d10.config.rpp+1};
		if ( request.query.album && request.query.album.length ) {
			query.startkey = [request.query.album];
			query.endkey = [request.query.album,[]];
		}
		
		if ( request.query.startkey_docid && request.query["startkey"] ) {
// 			request.query["startkey[]"][1] = parseInt(request.query["startkey[]"][1]);
			query.startkey = JSON.parse(request.query["startkey"]);
			query.startkey_docid = request.query.startkey_docid;
		}
		
		d10.couch.d10.view("album/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, err, request.ctx);
			}
			d10.rest.success(resp.rows, request.ctx);
		});
	});
	
	app.get("/api/list/s_user",function(request,response) {
		var query = {include_docs: true, startkey: [request.ctx.user._id], endkey: [request.ctx.user._id,[]], limit: d10.config.rpp + 1};
		if ( request.query.startkey_docid && request.query["startkey"] ) {
			query.startkey = JSON.parse(request.query["startkey"]);
			query.startkey_docid = request.query.startkey_docid;
		}
		
		d10.couch.d10.view("s_user/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, err, request.ctx);
			} else {
				d10.rest.success(resp.rows,request.ctx);
			}
		});
	});
	
	
	app.get("/api/list/likes",function(request,response) {
		var query = {endkey: [request.ctx.user._id,[]], limit: d10.config.rpp + 1};
		
		if ( request.query.startkey_docid && request.query["startkey"] ) {
			query.startkey = JSON.parse(request.query["startkey"]);
			query.startkey_docid = request.query.startkey_docid;
		}
		
		d10.couch.d10wi.view("s_user_likes/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, err, request.ctx);
			}
			var keys = [];
			for ( var  i in resp.rows ) {
				keys.push(resp.rows[i].value);
			}
			
			d10.couch.d10.getAllDocs({include_docs: true, keys: keys},function(err,resp2) {
				if ( err ) {
					return d10.rest.err(423, err, request.ctx);
				}
				var back = [];
				resp.rows.forEach(function(v,k) {
					back.push(
						{doc: resp2.rows[k].doc, key: v.key}
						 );
				});
				d10.rest.success(back,request.ctx);
			});
		});
	});
	
	app.get("/api/list/genres/artists/:genre",function(request,response) {
		if ( !request.params.genre || d10.config.genres.indexOf(request.params.genre) < 0 ) {
			return d10.rest.err(428, request.params.genre, request.ctx);
		}
		d10.couch.d10.view("genre/artists",{startkey: [request.params.genre], endkey: [request.params.genre,[]], group: true, group_level: 2},function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, err, request.ctx);
			}
			d10.rest.success(resp.rows,request.ctx);
		});
	});
	
	app.get("/api/list/genres/albums/:genre",function(request,response) {
		if ( !request.params.genre || d10.config.genres.indexOf(request.params.genre) < 0 ) {
			return d10.rest.err(428, request.params.genre, request.ctx);
		}
		d10.couch.d10.view("genre/albums",{startkey: [request.params.genre], endkey: [request.params.genre,[]], group: true, group_level: 2},function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, err, request.ctx);
			}
			d10.rest.success(resp.rows,request.ctx);
		});
	});
	
	app.get("/api/list/artists/albums/:artist",function(request,response) {
		if ( !request.params.artist ) {
			console.log("no artist");
			return d10.rest.err(428, request.params.artist, request.ctx);
		}
		d10.couch.d10.view("artist/albums",{startkey: [request.params.artist], endkey: [request.params.artist,[]], group: true, group_level: 2},function(err,resp) {
			if ( err ) {
				console.log("error: ",err);
				return d10.rest.err(423, err, request.ctx);
			}
// 			console.log(resp.rows);
			d10.rest.success(resp.rows,request.ctx);
		});
	});
	
	app.get("/api/list/artists/genres/:artist",function(request,response) {
		if ( !request.params.artist ) {
			console.log("no artist");
			return d10.rest.err(428, request.params.artist, request.ctx);
		}
		d10.couch.d10.view("artist/genres",{startkey: [request.params.artist], endkey: [request.params.artist,[]], group: true, group_level: 2},function(err,resp) {
			if ( err ) {
				console.log("error: ",err);
				return d10.rest.err(423, err, request.ctx);
			}
// 			console.log(resp.rows);
			d10.rest.success(resp.rows,request.ctx);
		});
	});
	app.get("/api/list/albums/artists/:album",function(request,response) {
		if ( !request.params.album ) {
			console.log("no album");
			return d10.rest.err(428, request.params.album, request.ctx);
		}
		d10.couch.d10.view("album/artists",{startkey: [request.params.album], endkey: [request.params.album,[]], group: true, group_level: 2},function(err,resp) {
			if ( err ) {
				console.log("error: ",err);
				return d10.rest.err(423, err, request.ctx);
			}
// 			console.log(resp.rows);
			d10.rest.success(resp.rows,request.ctx);
		});
	});
	
	app.get("/api/list/artist/genre/:artist/:genre",function(request,response) {
// 		if ( !request.query.genre || d10.config.genres.indexOf(request.query.genre) < 0 ) {
// 			return d10.rest.err(428, request.query.genre, request.ctx);
// 		}
		var query = {include_docs: true, reduce: false, limit: d10.config.rpp+1 ,key: [request.params.genre, request.params.artist ]};
		if ( request.query.startkey_docid && request.query.startkey ) {
			query.startkey = JSON.parse(request.query.startkey);
			query.startkey_docid = request.query.startkey_docid ;
		} else {
			query.startkey =  [request.query.genre, request.params.artist];
		}
		d10.couch.d10.view("artist/genre",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, err, request.ctx);
			}
			d10.rest.success(resp.rows,request.ctx);
		});
	});
	
	
	
}; // exports.api
