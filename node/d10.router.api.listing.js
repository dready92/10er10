var d10 = require ("./d10"),
	bodyDecoder = require("connect/middleware/bodyDecoder"),
	querystring = require("querystring"),
	exec = require('child_process').exec;

exports.api = function(app) {

	app.get("/api/pagination/:sort", function(request,response) {
		var sortTypes = [ "hits","ts_creation","album","artist","genre","title","s_user","s_user_likes" ],
		query = {rpp: d10.config.rpp};
		db = d10.db.db("d10");
		
		var preHooks = {
			hits: function() {
				query.reduce = false;
				query.descending = true;
// 				db.reduce(false).descending(true);
			},
			ts_creation: function() {
				query.reduce = false;
				query.descending = true;
				db.reduce(false).descending(true);
			},
			album: function() {
				if ( request.query.album && request.query.album.length ) {
					query.startkey = [request.query.album];
					query.endkey = [request.query.album,[]];
// 					db.startkey( [request.query.album] ).endkey([request.query.album,[]]);
				}
				query.reduce = false;
// 				db.reduce(false);
			},
			artist: function() {
				if ( request.query.artist && request.query.artist.length ) {
					query.startkey = [request.query.artist];
					query.endkey = [request.query.artist,[]];
// 					
// 					db.startkey( [request.query.artist] ).endkey([request.query.artist,[]]);
				}
				query.reduce = false;
// 				db.reduce(false);
			},
			genre: function() {
				if ( !request.query.genre || d10.config.genres.indexOf(request.query.genre) < 0 ) {
					return d10.rest.err(428, request.query.genre, request.ctx);
				}
				query.reduce = false;
				query.startkey = [request.query.genre];
				query.endkey = [request.query.genre,[]];
// 				db.reduce(false).startkey([request.query.genre]).endkey([request.query.genre,[]]);
			},
			title: function () {
				query.reduce = false;
// 				db.reduce(false);
				if ( request.query.title && request.query.title.length ) {
					query.startkey = [request.query.title];
					query.endkey = [request.query.title,[]];
// 					db.startkey([request.query.title]).endkey([request.query.title,[]]);
				}
			},
			s_user: function () {
				query.startkey = [request.ctx.user._id];
				query.endkey = [request.ctx.user._id,[]];
// 				db.startkey([request.ctx.user._id]).endkey([request.ctx.user._id,[]]);
			},
			s_user_likes: function () {
				query.startkey = [request.ctx.user._id];
				query.endkey = [request.ctx.user._id,[]];
// 				
// 				db.startkey([request.ctx.user._id]).endkey([request.ctx.user._id,[]]);
			}
		};
		
		if ( sortTypes.indexOf(request.params.sort) < 0 ){
			return d10.rest.err(427, request.params.sort, request.ctx);
		}
		if ( preHooks[request.params.sort] && preHooks[request.params.sort].call ) {
			preHooks[request.params.sort].call(this);
		}
		
// 		$data = $this->couch_ci->getForeignList("pagination","mapping",$this->uri->segment(3),"name",
//              array('rpp'=>$this->config->item('rpp')));
		d10.couch.d10.list("pagination/mapping/"+request.params.sort+"/name",query,function(err,resp) {
			if ( err ) {
				d10.rest.err(423, request.params.sort, request.ctx);
			} else {
				d10.rest.success(resp.pages,request.ctx);
			}
		});
		/*
		db.getForeignList(
			{
				data: {rpp: d10.config.rpp},
				success: function(resp) {
					d10.rest.success(resp.pages,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, request.params.sort, request.ctx);
				}
			},
			"pagination",
			"mapping",
			request.params.sort,
			"name"
		);
		*/
		
	});


	app.get("/api/ts_creation",function(request,response) {
		var query = {include_docs: true, reduce: false, descending: true, limit: d10.config.rpp};
// 		var db = d10.db.db("d10").include_docs(true).reduce(false).descending(true).limit(d10.config.rpp);
// 		d10.log("debug",request.query);
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
			request.query["startkey[]"][0] = parseInt(request.query["startkey[]"][0]);
			query.startkey = request.query["startkey[]"];
			query.startkey_docid = request.query.startkey_docid;
// 			db.startkey_docid( request.query.startkey_docid ).startkey( request.query["startkey[]"] );
		}
		d10.couch.d10.view("ts_creation/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, request.params.sort, request.ctx);
			}
			d10.rest.success(resp,request.ctx);
		});
		/*
		db.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, request.params.sort, request.ctx);
				}
			},
			"ts_creation",
			"name"
		);
	*/
		
	});

	app.get("/api/hits",function(request,response) {
		var query = {include_docs: true, reduce: false, descending: true, limit: d10.config.rpp};
// 		var db = d10.db.db("d10").include_docs(true).reduce(false).descending(true).limit(d10.config.rpp);
// 		d10.log("debug",request.query);
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
			request.query["startkey[]"][0] = parseInt(request.query["startkey[]"][0]);
			query.startkey = request.query["startkey[]"];
			query.startkey_docid = request.query.startkey_docid
// 			db.startkey_docid( request.query.startkey_docid ).startkey( request.query["startkey[]"] );
		}
		d10.couch.d10.view("hits/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, request.params.sort, request.ctx);
			}
			d10.rest.success(resp,request.ctx);
		});
		/*
		db.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, request.params.sort, request.ctx);
				}
			},
			"hits",
			"name"
		);
		*/
	});
	
	app.get("/api/titles/titles",function(request,response) {
// 		var db = d10.db.db("d10").include_docs(true).reduce(false).limit(d10.config.rpp);
		var query = {include_docs: true, reduce: false, limit: d10.config.rpp};
// 		d10.log("debug",request.query);
		if ( request.query.title && request.query.title.length ) {
// 			d10.log("debug",request.url,"setting endkey");
			query.endkey = [request.query.title,[]];
// 			db.endkey([request.query.title,[]]);
		}
		
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
// 			request.query["startkey[]"][0] = parseInt(request.query["startkey[]"][0]);
// 			db.startkey_docid( request.query.startkey_docid ).startkey( request.query["startkey[]"] );
			query.startkey = request.query["startkey[]"];
			query.startkey_docid = request.query.startkey_docid;
		}
		
		d10.couch.d10.view("title/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, request.params.sort, request.ctx);
			}
			d10.rest.success(resp,request.ctx);
		});
		/*
		db.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, request.params.sort, request.ctx);
				}
			},
			"title",
			"name"
		);
		*/
	});
	
	app.get("/api/artists/artists",function(request,response) {
		var query = {include_docs: true, reduce: false, limit: d10.config.rpp};
// 		var db = d10.db.db("d10").include_docs(true).reduce(false).limit(d10.config.rpp);
// 		d10.log("debug",request.query);
		if ( request.query.artist && request.query.artist.length ) {
// 			d10.log("debug",request.url,"setting endkey");
			query.endkey = [request.query.artist,[]];
// 			db.endkey([request.query.artist,[]]);
		}
		
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
// 			request.query["startkey[]"][0] = parseInt(request.query["startkey[]"][0]);
// 			db.startkey_docid( request.query.startkey_docid ).startkey( request.query["startkey[]"] );
			query.startkey = request.query["startkey[]"];
			query.startkey_docid = request.query.startkey_docid;
		}
		
		d10.couch.d10.view("artist/name",query,function(err,resp) {
			if( err ) {
				return d10.rest.err(423, request.params.sort, request.ctx);
			}
			d10.rest.success(resp,request.ctx);
		});
		/*
		db.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, request.params.sort, request.ctx);
				}
			},
			"artist",
			"name"
		);
		*/
	});
	
	app.get("/api/albums/albums",function(request,response) {
		var query = {include_docs: true, reduce: false, limit: d10.config.rpp};
// 		var db = d10.db.db("d10").include_docs(true).reduce(false).limit(d10.config.rpp);
		if ( request.query.album && request.query.album.length ) {
// 			db.endkey([request.query.album,[]]);
			query.endkey = [request.query.album,[]];
		}
		
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
			request.query["startkey[]"][1] = parseInt(request.query["startkey[]"][1]);
// 			db.startkey_docid( request.query.startkey_docid ).startkey( request.query["startkey[]"] );
			query.startkey = request.query["startkey[]"];
			query.startkey_docid = request.query.startkey_docid;
		}
		
		d10.couch.d10.view("album/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, err, request.ctx);
			}
			d10.rest.success(resp,request.ctx);
		});
		/*
		db.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, resp, request.ctx);
				}
			},
			"album",
			"name"
		);
		*/
	});
	
	app.get("/api/songs/s_user",function(request,response) {
		var db = d10.db.db("d10").include_docs(true).endkey([request.ctx.user._id,[]]).limit(d10.config.rpp);
		
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
// 			request.query["startkey[]"][1] = parseInt(request.query["startkey[]"][1]);
			db.startkey_docid( request.query.startkey_docid ).startkey( request.query["startkey[]"] );
		}
		
		db.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, resp, request.ctx);
				}
			},
			"s_user",
			"name"
		);
		
	});
	

	app.get("/api/usersongs",function(request,response) {
		var query = {include_docs: true, endkey: [request.ctx.user._id,[]], limit: d10.config.rpp};
// 		var db = d10.db.db("d10").include_docs(true).endkey([request.ctx.user._id,[]]).limit(d10.config.rpp);
		
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
			// 			request.query["startkey[]"][1] = parseInt(request.query["startkey[]"][1]);
			query.startkey = request.query["startkey[]"];
			query.startkey_docid = request.query.startkey_docid;
// 			db.startkey_docid( request.query.startkey_docid ).startkey( request.query["startkey[]"] );
		}
		
		d10.couch.d10.view("s_user_likes/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, err, request.ctx);
			}
			d10.rest.success(resp,request.ctx);
		});
		/*
		db.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, resp, request.ctx);
				}
			},
			"s_user_likes",
			"name"
		);
		*/
	});
	
	
	
	app.get("/api/genres/genres",function(request,response) {
		if ( !request.query.genre || d10.config.genres.indexOf(request.query.genre) < 0 ) {
			return d10.rest.err(428, request.query.genre, request.ctx);
		}
		var query = {include_docs: true, reduce: false, limit: d10.config.rpp,endkey: [request.query.genre, {} ]};
// 		var db = d10.db.db("d10").include_docs(true).reduce(false).limit(d10.config.rpp);
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
// 			db.startkey_docid( request.query.startkey_docid ).startkey( request.query["startkey[]"] );
			query.startkey = request.query["startkey[]"];
			query.startkey_docid = request.query.startkey_docid ;
		}
// 		db.endkey([request.query.genre, {} ] );
		d10.couch.d10.view("genre/name",query,function(err,resp) {
			if ( err ) {
				return d10.rest.err(423, err, request.ctx);
			}
			d10.rest.success(resp,request.ctx);
		});
		/*
		db.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, resp, request.ctx);
				}
			},
			"genre",
			"name"
		);
		*/
	});
	
	
	app.get("/api/title",function(request,response) {
// 		var db = d10.db.db("d10").inclusive_end(false);
		var query = {inclusive_end: false};
		if ( request.query.start && request.query.start.length ) {
			var q = d10.ucwords(request.query.start);
// 			db.startkey([q]).endkey([d10.nextWord(q)]);
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
		/*
		db.getList(
			{
				success: function(resp) {
					response.writeHead(200, request.ctx.headers );
					response.end (
						JSON.stringify(resp.titles)
					);
// 					d10.rest.success(resp.titles,request.ctx);
				},
				error: function(a,b) {
					response.writeHead(200, request.ctx.headers );
					response.end (
						"[]"
					);
				}
			},
			"title",
			"search",
			"search"
		   );
	*/
	});
	
	app.get("/api/artist",function(request,response) {
// 		var db = d10.db.db("d10").inclusive_end(false);
		var query = {inclusive_end: false};
		if ( request.query.start && request.query.start.length ) {
			var q = d10.ucwords(request.query.start);
// 			db.startkey([q]).endkey([d10.nextWord(q)]);
			query.startkey = [q];
			query.endkey = [d10.nextWord(q)];
		}
		
		d10.couch.d10.list("artist/search/search",query,function(err,resp) {
			if ( err ) {
				response.writeHead(200, request.ctx.headers );
				response.end (
					"[]"
				);
			} else {
				response.writeHead(200, request.ctx.headers );
				response.end (
					JSON.stringify(resp.artists)
				);
			}
		});
		/*
		db.getList(
			{
				success: function(resp) {
					response.writeHead(200, request.ctx.headers );
					response.end (
						JSON.stringify(resp.artists)
					);
				},
				error: function(a,b) {
					response.writeHead(200, request.ctx.headers );
					response.end (
						"[]"
					);
				}
			},
			"artist",
			"search",
			"search"
		   );
	*/
	});
	
	app.get("/api/album",function(request,response) {
		var db = d10.db.db("d10").inclusive_end(false);
		var query = {inclusive_end: false};
		if ( request.query.start && request.query.start.length ) {
			var q = d10.ucwords(request.query.start);
// 			db.startkey([q]).endkey([d10.nextWord(q)]);
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
/*
		db.getList(
			{
				success: function(resp) {
// 					d10.log("debug",resp);
					response.writeHead(200, request.ctx.headers );
					response.end (
						JSON.stringify(resp.albums)
					);
				},
				error: function(a,b) {
					response.writeHead(200, request.ctx.headers );
					response.end (
						"[]"
					);
				}
			},
			"album",
			"search",
			"search"
		   );
	*/
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
		d10.couch.d10.view("artist/name",query,function(err,resp) {
			if ( err ) {
				d10.rest.err(423, err, request.ctx);
			}else {
				d10.rest.success(resp,request.ctx);
			}
		});
/* 		d10.db.db("d10").group(true).group_level(1)
		.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function (resp) {
					d10.rest.err(423, resp, request.ctx);
				}
			},
			"artist",
			"name"
		);
	*/
	});
	app.get("/api/genresResume",function(request,response) {
		d10.couch.d10.view("genre/artist",{group:true, group_level: 1},function(err,resp) {
			if ( err ) {
				d10.rest.err(423, err, request.ctx);
			}else {
				d10.rest.success(resp.rows,request.ctx);
			}
		});
		/*
		d10.db.db("d10").group(true).group_level(1)
		.getView(
			{
				success: function(resp) {
					d10.rest.success(resp.rows,request.ctx);
				},
				error: function (resp) {
					d10.rest.err(423, resp, request.ctx);
				}
			},
			"genre",
			"artist"
		);
	*/
	});
	

}; // exports.api