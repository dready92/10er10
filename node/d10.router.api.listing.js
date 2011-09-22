var d10 = require ("./d10"),
	querystring = require("querystring"),
	qs = require("qs"),
	exec = require('child_process').exec;

exports.api = function(app) {
	app.get("/api/title",function(request,response) {
		var query = {inclusive_end: false};
		if ( request.query.start && request.query.start.length ) {
			var q = d10.ucwords(request.query.start);
			query.startkey = [q];
			query.endkey = [d10.nextWord(q)];
		}
		d10.couch.d10.list("title/search/search",query, function(err,resp) {
			if ( err ) {
				d10.realrest.success([], request.ctx);
			} else {
				d10.realrest.success(resp.titles, request.ctx);
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
				d10.realrest.success([], request.ctx);
			} else {
				d10.log(resp);
				var buffer = {}, back = [];
				// remote doubles
				resp.rows.forEach(function(row) {
					buffer[row.key[1]] ={text: row.key[1],json: row.key[1]}
				});
				for ( var i in buffer ) {back.push(buffer[i]);}
				
				d10.realrest.success(back, request.ctx);
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
				d10.realrest.success([], request.ctx);
			} else {
				d10.realrest.success(resp.albums, request.ctx);
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
			d10.realrest.success(resp, request.ctx);
		} else {
			d10.realrest.success(d10.config.genres, request.ctx);
		}
	});
	
	
	app.get("/api/artistsListing",function(request,response) {
		var query = {group:true, group_level: 1};
		d10.couch.d10.view("artist/tokenized",query,function(err,resp) {
			if ( err ) {
				d10.realrest.err(423, err, request.ctx);
			}else {
				console.log(resp.rows);
				d10.realrest.success(resp.rows,request.ctx);
			}
		});
	});
	app.get("/api/genresResume",function(request,response) {
		d10.couch.d10.view("genre/artist",{group:true, group_level: 1},function(err,resp) {
			if ( err ) {
				d10.realrest.err(423, err, request.ctx);
			}else {
				d10.realrest.success(resp.rows,request.ctx);
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
				return d10.realrest.err(423, request.params.sort, request.ctx);
			}
// 			setTimeout(function() {
				d10.realrest.success(resp.rows,request.ctx);
// 			},2000);
		});
	});
	
	app.get("/api/list/creations",function(request,response) {
		var query = {include_docs: true, reduce: false, descending: true, limit: d10.config.rpp+1};
		if ( request.query.startkey_docid && request.query["startkey"] ) {
			query.startkey = JSON.parse(request.query["startkey"]);
			query.startkey_docid = request.query.startkey_docid;
		}
		d10.couch.d10.view("ts_creation/name",query,function(err,resp,meta) {
			if ( err ) {
				return d10.realrest.err(423, request.params.sort, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	});
	
	app.get("/api/list/hits",function(request,response) {
		var query = {reduce: false, descending: true, limit: d10.config.rpp+1};
		if ( request.query.startkey_docid && request.query["startkey"] ) {
			query.startkey = JSON.parse(request.query["startkey"]);
			query.startkey_docid = request.query.startkey_docid
		}
		d10.couch.d10wi.view("hits/name",query,function(err,resp) {
			if ( err ) {
				return d10.realrest.err(423, request.params.sort, request.ctx);
			}
			var keys=[];
			for ( var i in resp.rows ) { keys.push(resp.rows[i].id);	}
			d10.couch.d10.getAllDocs( {keys: keys, include_docs: true}, function(err,resp2 ) {
				if ( err ) {
					return d10.realrest.err(423, request.params.sort, request.ctx);
				}
				var back = [];
				resp.rows.forEach(function(v,i) {
					back.push ({
						id: v.id,
						key: v.key,
						doc: resp2.rows[i].doc
					});
				});
				d10.realrest.success(back,request.ctx);
			});
		});
	});
	
	app.get("/api/list/genres",function(request,response) {
		if ( !request.query.genre || d10.config.genres.indexOf(request.query.genre) < 0 ) {
			return d10.realrest.err(428, request.query.genre, request.ctx);
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
				return d10.realrest.err(423, err, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
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
				return d10.realrest.err(423, request.params.sort, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	});

	app.get("/api/list/albums",function(request,response) {
		var query = {include_docs: true, reduce: false, limit: d10.config.rpp+1};
		if ( request.query.album && request.query.album.length ) {
			query.startkey = [request.query.album];
			query.endkey = [request.query.album,[]];
		}
		
		if ( request.query.startkey_docid && request.query["startkey"] ) {
			query.startkey = JSON.parse(request.query["startkey"]);
			query.startkey_docid = request.query.startkey_docid;
		}
		
		d10.couch.d10.view("album/name",query,function(err,resp) {
			if ( err ) {
				return d10.realrest.err(423, err, request.ctx);
			}
			d10.realrest.success(resp.rows, request.ctx);
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
				return d10.realrest.err(423, err, request.ctx);
			} else {
				d10.realrest.success(resp.rows,request.ctx);
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
				return d10.realrest.err(423, err, request.ctx);
			}
			var keys = [];
			for ( var  i in resp.rows ) {
				keys.push(resp.rows[i].value);
			}
			
			d10.couch.d10.getAllDocs({include_docs: true, keys: keys},function(err,resp2) {
				if ( err ) {
					return d10.realrest.err(423, err, request.ctx);
				}
				var back = [];
				resp.rows.forEach(function(v,k) {
					back.push(
						{doc: resp2.rows[k].doc, key: v.key}
						 );
				});
				d10.realrest.success(back,request.ctx);
			});
		});
	});
	
	app.get("/api/list/genres/artists/:genre",function(request,response) {
		if ( !request.params.genre || d10.config.genres.indexOf(request.params.genre) < 0 ) {
			return d10.realrest.err(428, request.params.genre, request.ctx);
		}
		d10.couch.d10.view("genre/artists",{startkey: [request.params.genre], endkey: [request.params.genre,[]], group: true, group_level: 2},function(err,resp) {
			if ( err ) {
				return d10.realrest.err(423, err, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	});
	
	app.get("/api/list/genres/albums/:genre",function(request,response) {
		if ( !request.params.genre || d10.config.genres.indexOf(request.params.genre) < 0 ) {
			return d10.realrest.err(428, request.params.genre, request.ctx);
		}
		d10.couch.d10.view("genre/albums",{startkey: [request.params.genre], endkey: [request.params.genre,[]], group: true, group_level: 2},function(err,resp) {
			if ( err ) {
				return d10.realrest.err(423, err, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	});
	
	app.get("/api/list/artists/albums/:artist",function(request,response) {
		if ( !request.params.artist ) {
			return d10.realrest.err(428, request.params.artist, request.ctx);
		}
		d10.couch.d10.view("artist/albums",{startkey: [request.params.artist], endkey: [request.params.artist,[]], group: true, group_level: 2},function(err,resp) {
			if ( err ) {
				console.log("error: ",err);
				return d10.realrest.err(423, err, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	});
	
	app.get("/api/list/artists/genres/:artist",function(request,response) {
		if ( !request.params.artist ) {
			return d10.realrest.err(428, request.params.artist, request.ctx);
		}
		d10.couch.d10.view("artist/genres",{startkey: [request.params.artist], endkey: [request.params.artist,[]], group: true, group_level: 2},function(err,resp) {
			if ( err ) {
				console.log("error: ",err);
				return d10.realrest.err(423, err, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	});
	app.get("/api/list/albums/artists/:album",function(request,response) {
		if ( !request.params.album ) {
			console.log("no album");
			return d10.realrest.err(428, request.params.album, request.ctx);
		}
		d10.couch.d10.view("album/artists",{startkey: [request.params.album], endkey: [request.params.album,[]], group: true, group_level: 2},function(err,resp) {
			if ( err ) {
				console.log("error: ",err);
				return d10.realrest.err(423, err, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	});
}; // exports.api
