var d10 = require ("./d10"),
    debug = d10.debug("d10:d10.router.api.listing"),
    artists = require ("./d10.artists"),
		users = require("./d10.users"),
		getAndParseByAlbum = require('./rest-helpers').getAndParseByAlbum;
	qs = require("qs");

var validGenre = function(genre) {
  return d10.config.allowCustomGenres == true || d10.config.genres.indexOf(genre) >= 0;
}
exports.api = function(app) {
	
	app.get("/api/title",function(request,response) {
		_titleSearch("title/search/search",request,response);
	});
	var _titleSearch = function(view, request,response) {
		var query = {inclusive_end: false};
		if ( request.query.start && request.query.start.length ) {
			var q = d10.ucwords(request.query.start);
			query.startkey = [q];
			query.endkey = [d10.nextWord(q)];
		}
		d10.couch.d10.list(view, query, function(err,resp) {
			if ( err ) {
				d10.realrest.success([], request.ctx);
			} else {
				d10.realrest.success(resp.titles, request.ctx);
			}
		});
	};
	
	app.get("/api/artist",function(request,response) {
		_artistSearch("artist/search",request,response);
	});
	var _artistSearch = function(view, request,response) {
		var query = {group: true};
		if ( request.query.start && request.query.start.length ) {
			var q = d10.ucwords(request.query.start);
			query.startkey = [q];
			query.endkey = [d10.nextWord(q)];
		}
		d10.couch.d10.view(view, query, function(err,resp) {
			if ( err ) {
				d10.realrest.success([], request.ctx);
			} else {
				var buffer = {}, back = [];
				// remote doubles
				resp.rows.forEach(function(row) {
					buffer[row.key[1]] ={text: row.key[1],json: row.key[1]}
				});
				for ( var i in buffer ) {back.push(buffer[i]);}
				
				d10.realrest.success(back, request.ctx);
			}
		});
	};
	
	app.get("/api/album",function(request,response) {
		_albumSearch("album/search/search",request,response);
	});
	var _albumSearch = function(view, request,response) {
		var query = {inclusive_end: false};
		if ( request.query.start && request.query.start.length ) {
			var q = d10.ucwords(request.query.start);
			query.startkey = [q];
			query.endkey = [d10.nextWord(q)];
		}
		d10.couch.d10.list(view, query, function(err,resp) {
			if( err ) {
				d10.realrest.success([], request.ctx);
			} else {
				d10.realrest.success(resp.albums, request.ctx);
			}
		});
	};
	
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
		_artistTokenized("artist/tokenized",request,response);
	});
	var _artistTokenized = function(view, request,response) {
		var query = {group:true, group_level: 1};
        if ( request.query.startkey ) {
          query.startkey = JSON.parse(request.query.startkey);
          if ( request.query.startkey_docid ) {
              query.startkey_docid = request.query.startkey_docid;
          }
        }
        if ( request.query.limit ) {
          var limit = parseInt(request.query.limit,10);
          if ( !isNaN(limit) ) {
            query.limit=limit;
          }
        }
		d10.couch.d10.view(view,query,listDefaultCallback.bind(request.ctx));
	};
	
	app.get("/api/genresResume",function(request,response) {
		_genreArtist("genre/artist",request,response);
	});
	var _genreArtist = function(view, request,response) {
		d10.couch.d10.view(view, {group:true, group_level: 1}, listDefaultCallback.bind(request.ctx));
	};
	
	app.get("/api/list/artists",function(request,response) {
		_artistBaseName("artist/",request,response);
	});
	var _artistBaseName = function(view, request,response) {
		var query = {include_docs: true, limit: d10.config.rpp + 1};
		var viewPart = "basename";
		if ( request.query.artist && request.query.artist.length ) {
			query.startkey = [request.query.artist];
			query.endkey = [request.query.artist,[]];
			viewPart = "name";
			query.reduce = false;
		}
		if ( request.query.startkey ) {
			query.startkey = JSON.parse(request.query.startkey);
			if ( request.query.startkey_docid ) {
				query.startkey_docid = request.query.startkey_docid;
			}
		}
		
		d10.couch.d10.view(view+viewPart,query,listDefaultCallback.bind(request.ctx));
	};
	
	app.get("/api/list/creations",function(request,response) {
		
		if ( request.query.genre ) {
			if ( !validGenre(request.query.genre) ) {
				return d10.realrest.err(428, request.query.genre, request.ctx);			
			}
			return _ts_creationGenre("genre/creation",request,response);
		}
		_ts_creationName("ts_creation/name",request,response);
	});
	
	var _ts_creationGenre = function (view, request, response) {
		var query = {include_docs: true, descending: true, limit: d10.config.rpp+1, endkey: request.query.genre};
		if ( request.query.startkey ) {
			query.startkey = JSON.parse(request.query.startkey);
			if ( request.query.startkey_docid ) {
				query.startkey_docid = request.query.startkey_docid;
			}
		}
		if ( !query.startkey ) {
			query.startkey = [request.query.genre,{}];
		}
		d10.couch.d10.view(view,query,listDefaultCallback.bind(request.ctx));
	};
	
	var _ts_creationName = function (view, request, response) {
		var query = {include_docs: true, reduce: false, descending: true, limit: d10.config.rpp+1};
		if ( request.query.startkey ) {
			query.startkey = JSON.parse(request.query.startkey);
			if ( request.query.startkey_docid ) {
				query.startkey_docid = request.query.startkey_docid;
			}
		}
		d10.couch.d10.view(view,query,listDefaultCallback.bind(request.ctx));
	};
	
	function getCouchQuery (query) {
		const couchQuery = { include_docs: true, descending: true, limit: d10.config.rpp + 1 };
		if (query.genre) {
			if (!validGenre(query.genre)) {
				return false;
			}
			couchQuery.genre = query.genre;
			couchQuery.view = 'genre/creation';
			qouchQuery.endkey = couchQuery.genre;
		} else {
			couchQuery.view = 'ts_creation/name';
			couchQuery.reduce = false;
		}
		if ( query.startkey ) {
			couchQuery.startkey = JSON.parse(query.startkey);
			if (query.startkey_docid) {
				couchQuery.startkey_docid = query.startkey_docid;
			}
		}

		if (couchQuery.genre && !couchQuery.startkey) {
			couchQuery.startkey = [couchQuery.genre, {}];
		}

		return couchQuery;
	}



	app.get("/api/list/creations/mergeAlbums", function (request, response) {
		const couchQuery = getCouchQuery (request.query);
		if (!couchQuery) {
			return d10.realrest.err(428, request.query.genre, request.ctx);
		}

		const ignoredAlbums = request.query.ignoredAlbums ? JSON.parse(request.query.ignoredAlbums) : [];
		getAndParseByAlbum(couchQuery, ignoredAlbums)
		.then(response => {
			d10.realrest.success(response, request.ctx);
			}).catch(e => d10.realrest.success(response, request.ctx));
	});


	app.get("/api/list/hits",function(request,response) {
		var query = {reduce: false, descending: true, limit: d10.config.rpp+1};
		if ( request.query.startkey ) {
			query.startkey = JSON.parse(request.query.startkey);
			if ( request.query.startkey_docid ) {
				query.startkey_docid = request.query.startkey_docid;
			}
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
		_genreName("genre/name",request,response);
	});
	var _genreName = function(view, request,response) {
		
		if ( !request.query.genre || !validGenre(request.query.genre) ) {
			return d10.realrest.err(428, request.query.genre, request.ctx);
		}
		var query = {include_docs: true, reduce: false, limit: d10.config.rpp+1 ,endkey: [request.query.genre, {} ]};
		if ( request.query.startkey ) {
			query.startkey = JSON.parse(request.query.startkey);
			if ( request.query.startkey_docid ) {
				query.startkey_docid = request.query.startkey_docid;
			}
		} else {
			query.startkey =  [request.query.genre];
		}
		d10.couch.d10.view(view,query,listDefaultCallback.bind(request.ctx));
	};
	
	app.get("/api/own/list/titles",function(request,response) {
		_titleName(request.ctx.user._id+"/title_name",request,response);
	});
	app.get("/api/list/titles",function(request,response) {
		_titleName("title/name",request,response);
	});
	var _titleName = function(view, request,response) {
		var query = {include_docs: true, reduce: false, limit: d10.config.rpp+1};
		if ( request.query.title && request.query.title.length ) {
			query.startkey = [request.query.title];
			query.endkey = [request.query.title,[]];
		}
		
		if ( request.query.startkey ) {
			query.startkey = JSON.parse(request.query.startkey);
			if ( request.query.startkey_docid ) {
				query.startkey_docid = request.query.startkey_docid;
			}
		}
		
		d10.couch.d10.view(view,query,listDefaultCallback.bind(request.ctx));
	};

	app.get("/api/list/albums",function(request,response) {
		_albumName("album/name",request,response);
	});
	var _albumName = function(view, request,response) {
		var query = {include_docs: true, reduce: false};
		if ( !request.query.full ) {
		  query.limit = d10.config.rpp+1;
		}
		if ( request.query.album && request.query.album.length ) {
			query.startkey = [request.query.album];
			query.endkey = [request.query.album,[]];
		}
		if ( request.query.startkey ) {
			query.startkey = JSON.parse(request.query.startkey);
			if ( request.query.startkey_docid ) {
				query.startkey_docid = request.query.startkey_docid;
			}
		}
		if ( request.query.endkey ) {
			query.endkey = JSON.parse(request.query.endkey);
		}
		d10.couch.d10.view(view,query,listDefaultCallback.bind(request.ctx));
	};
	
	app.get("/api/list/s_user",function(request,response) {
		var query = {include_docs: true, startkey: [request.ctx.user._id], endkey: [request.ctx.user._id,[]], limit: d10.config.rpp + 1};
		if ( request.query.startkey ) {
			query.startkey = JSON.parse(request.query.startkey);
			if ( request.query.startkey_docid ) {
				query.startkey_docid = request.query.startkey_docid;
			}
		}
		
		d10.couch.d10.view("s_user/name",query,listDefaultCallback.bind(request.ctx));
	});
	
	
	app.get("/api/list/likes",function(request,response) {
		var query = {endkey: [request.ctx.user._id,[]], limit: d10.config.rpp + 1};
		if ( request.query.startkey ) {
			query.startkey = JSON.parse(request.query.startkey);
			if ( request.query.startkey_docid ) {
				query.startkey_docid = request.query.startkey_docid;
			}
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
		_genreArtists("genre/artists",request,response);
	});
	var _genreArtists = function(view, request, response) {
		if ( !request.params.genre || !validGenre(request.params.genre) ) {
			return d10.realrest.err(428, request.params.genre, request.ctx);
		}
		var query = {
          startkey: [request.params.genre], 
          endkey: [request.params.genre,[]], 
          group: true, 
          group_level: 2
        };
        if ( request.query.startkey ) {
          query.startkey = JSON.parse(request.query.startkey);
          if ( request.query.startkey_docid ) {
            query.startkey_docid = request.query.startkey_docid;
          }
        }
        d10.couch.d10.view(view,query,listDefaultCallback.bind(request.ctx));
	};
	
	app.get("/api/list/genres/albums/:genre",function(request,response) {
		_genreAlbums("genre/albums",request,response);
	});
	var _genreAlbums = function(view,request,response) {
		if ( !request.params.genre || !validGenre(request.params.genre) ) {
			return d10.realrest.err(428, request.params.genre, request.ctx);
		}
		d10.couch.d10.view(view,{startkey: [request.params.genre], endkey: [request.params.genre,[]], group: true, group_level: 2},listDefaultCallback.bind(request.ctx));
	};
	
	app.get("/api/list/genres/albumsSongs/:genre",function(request,response) {
		_genreAlbumsSongs("genre/albums",request,response);
	});
	var _genreAlbumsSongs = function(view,request,response) {
		if ( !request.params.genre || 
			!validGenre(request.params.genre) ) {
			return d10.realrest.err(428, request.params.genre, request.ctx);
		}
		var opts = {
			startkey: [request.params.genre], 
			endkey: [request.params.genre,[]], 
			reduce: false,
			include_docs: true,
			limit: d10.config.rpp + 1
		};
		if ( request.query.startkey ) {
			opts.startkey = JSON.parse(request.query.startkey);
			if ( request.query.startkey_docid ) {
				opts.startkey_docid = request.query.startkey_docid;
			}
		}
		
		
		d10.couch.d10.view(view, opts, listDefaultCallback.bind(request.ctx));
	};
	
	app.get("/api/list/artists/albums/:artist",function(request,response) {
		_artistAlbums("artist/albums",request,response);
	});
	var _artistAlbums = function(view,request,response) {
		if ( !request.params.artist ) {
			return d10.realrest.err(428, request.params.artist, request.ctx);
		}
		d10.couch.d10.view(view,{startkey: [request.params.artist], endkey: [request.params.artist,[]], group: true, group_level: 2},listDefaultCallback.bind(request.ctx));
	};
	
    app.get("/api/list/artists/songsByAlbum/:artist",function(request,response) {
        _artistSongsOrderedByAlbums("artist/songsOrderedByAlbums",request,response);
    });
    var _artistSongsOrderedByAlbums = function(view,request,response) {
        if ( !request.params.artist ) {
            return d10.realrest.err(428, request.params.artist, request.ctx);
        }
        
        d10.couch.d10.view(view,{startkey: [request.params.artist], endkey: [request.params.artist,[]], include_docs: true},listDefaultCallback.bind(request.ctx));
    };
    
	app.get("/api/list/artists/genres/:artist",function(request,response) {
		_artistGenres("artist/genres",request,response);
	});
	var _artistGenres = function(view,request,response) {
		if ( !request.params.artist ) {
			return d10.realrest.err(428, request.params.artist, request.ctx);
		}
		d10.couch.d10.view(view,{startkey: [request.params.artist], endkey: [request.params.artist,[]], group: true, group_level: 2},listDefaultCallback.bind(request.ctx));
	};
	
	app.get("/api/list/albums/artists/:album",function(request,response) {
		_albumArtists("album/artists", request, response);
	});
	var _albumArtists = function(view,request,response) {
		if ( !request.params.album ) {
			debug("no album");
			return d10.realrest.err(428, request.params.album, request.ctx);
		}
		d10.couch.d10.view(view,{startkey: [request.params.album], endkey: [request.params.album,[]], group: true, group_level: 2},listDefaultCallback.bind(request.ctx));
	};
    
    
    var listDefaultCallback = function(err,resp) {
      if ( err ) {
        debug("error: ",err);
        return d10.realrest.err(423, err, this);
      }
      d10.realrest.success(resp.rows, this);
    };
    
    app.get("/api/list/artist/hits", function(request, response) {
      var artist, startkey, startkey_docid;
	  var opts = {};
	  if ( request.query.genre ) {
		  if ( !validGenre(request.query.genre) ) {
			return d10.realrest.err(428, request.query.genre, request.ctx);
		  }
		  opts.genre = request.query.genre;
	  }
	  
      if ( !request.query.artist ) {
        debug("no artist");
        return d10.realrest.err(428, request.query.artist, request.ctx);
      }
      artist = request.query.artist;
      if ( request.query.startkey ) {
        startkey = JSON.parse(request.query.startkey);
        if ( request.query.startkey_docid ) {
          startkey_docid = request.query.startkey_docid;
        }
      }
      opts.startkey= startkey;
	  opts.startkey_docid = startkey_docid;
	  
      artists.getSongsByHits(artist,listDefaultCallback.bind(request.ctx),opts);
      
    });
    
    app.get("/api/genre/artistsByHits/:genre", function(request, response) {
		if ( !validGenre(request.params.genre) ) {
			return d10.realrest.err(428, request.params.genre, request.ctx);
		}
		var opts = {descending: true, endkey: [request.params.genre]};
		if ( request.query.startkey ) {
			opts.startkey = JSON.parse(request.query.startkey);
			if ( request.query.startkey_docid ) {
			  opts.startkey_docid = request.query.startkey_docid;
			}
		} else {
			opts.startkey = [request.params.genre,{}]
		}
		d10.couch.d10.view("artistHits/artists",opts,listDefaultCallback.bind(request.ctx));
	});
	
	app.get("/api/genre/albumsByHits/:genre", function(request, response) {
		if ( !validGenre(request.params.genre) ) {
			return d10.realrest.err(428, request.params.genre, request.ctx);
		}
		var opts = {descending: true, endkey: [request.params.genre]};
		if ( request.query.startkey ) {
			opts.startkey = JSON.parse(request.query.startkey);
			if ( request.query.startkey_docid ) {
			  opts.startkey_docid = request.query.startkey_docid;
			}
		} else {
			opts.startkey = [request.params.genre,{}]
		}
		
		d10.couch.d10.view("albumHits/albums", opts, function(err,list) {
			if ( err || !list.rows.length ) {
				return listDefaultCallback.call(request.ctx, err, list);
			}
			var albumSongs = {};
			var keys = [];
			list.rows.forEach(function(row) {albumSongs[row.key[2]] = []; row.value = albumSongs[row.key[2]]; keys.push(row.key[2])});
			debug("going to second view", {reduce: false, include_docs: true, keys: keys});
			d10.couch.d10.view("album/album", {reduce:false, include_docs: true, keys: keys}, function(err,docs) {
				if ( err ) {
					return listDefaultCallback.call(request.ctx, err, docs);
				}
				docs.rows.forEach(function(row) { albumSongs[row.doc.album].push(row.doc); });
				return listDefaultCallback.call(request.ctx, err, list);
			});
		});
	});
	
	app.get("/api/genre/songsByHits/:genre", function(request, response) {
		if ( !validGenre(request.params.genre) ) {
			return d10.realrest.err(428, request.params.genre, request.ctx);
		}
		var opts = {include_docs: true, descending: true, endkey: [request.params.genre]};
		if ( request.query.startkey ) {
			opts.startkey = JSON.parse(request.query.startkey);
			if ( request.query.startkey_docid ) {
			  opts.startkey_docid = request.query.startkey_docid;
			}
		} else {
			opts.startkey = [request.params.genre,{}]
		}

		d10.couch.d10.view("genre/song-hits",opts,listDefaultCallback.bind(request.ctx));
	});
	
	app.get("/api/own/list/genre/lastPlayed/:genre",function(request,response) {
		if ( !validGenre(request.params.genre) ) {
			return d10.realrest.err(428, request.params.genre, request.ctx);
		}
		var responseLength = d10.config.rpp + 1;
		var requestLength = d10.config.rpp*3;
		var responses = [];
		var opts = {reduce: false, descending: true, endkey: [request.ctx.user._id], limit: requestLength};
		if ( request.query.startkey ) {
			opts.startkey = JSON.parse(request.query.startkey);
			if ( request.query.startkey_docid ) {
			  opts.startkey_docid = request.query.startkey_docid;
			}
		} else {
			opts.startkey = [request.ctx.user._id, {}]
		}		
		
		var fetchLastPlayed = function() {
			users.getListenedSongsByDate(request.ctx.user._id, opts, function(err, hits) {
				if ( err ) {
					return d10.realrest.err(423, err, request.ctx);
				}
				if( !hits.rows.length ) {
					return d10.realrest.success(responses, request.ctx);
				}
				var ids = hits.rows.map(function(row) {return row.value});
				d10.couch.d10.getAllDocs({include_docs: true, keys: ids},function(err,docs) {
					if ( err ) {
					  return d10.realrest.err(423, err, request.ctx);
					}
					var docHash = {};
					docs.rows.forEach(function(row) { if ( row.doc && row.doc._id ) { docHash[row.doc._id] = row.doc; }  });
					for ( var  i in hits.rows ) {
					  if ( hits.rows[i].value in docHash && docHash[hits.rows[i].value].genre == request.params.genre ) {
						  responses.push({doc: docHash[hits.rows[i].value], id: hits.rows[i].id, key: hits.rows[i].key, value: hits.rows[i].value});
						  if ( responses.length == responseLength ) {
							  return d10.realrest.success(responses, request.ctx);
						  }
					  }
					}
					
					if ( hits.rows.length < requestLength ) {
						return d10.realrest.success(responses, request.ctx);
					}
					
					opts.startkey = hits.rows[ (hits.rows.length -1) ].key;
					opts.startkey_docid = hits.rows[ (hits.rows.length -1) ].id;
					fetchLastPlayed();
				});

				  
				});
		};
		
		fetchLastPlayed();
		
	});
	

}; // exports.api
