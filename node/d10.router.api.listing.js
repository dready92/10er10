var d10 = require ("./d10"),
    artists = require ("./d10.artists"),
	qs = require("qs");

exports.api = function(app) {
	
	app.get("/api/own/title",function(request,response) {
		_titleSearch("title/search/"+request.ctx.user._id+"/title_search",request,response);
	});
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
	
	app.get("/api/own/artist",function(request,response) {
		_artistSearch(request.ctx.user._id+"/artist_search",request,response);
	});
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
	};
	
	app.get("/api/own/album",function(request,response) {
		_albumSearch("album/search/"+request.ctx.user._id+"/album_search",request,response);
	});
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
	
	app.get("/api/own/artistsListing",function(request,response) {
		_artistTokenized(request.ctx.user._id+"/artist_tokenized",request,response);
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
		d10.couch.d10.view(view,query,function(err,resp) {
			if ( err ) {
				d10.realrest.err(423, err, request.ctx);
			}else {
				console.log(resp.rows);
				d10.realrest.success(resp.rows,request.ctx);
			}
		});
	};
	
	app.get("/api/own/genresResume",function(request,response) {
		_genreArtist(request.ctx.user._id+"/genre_artist",request,response);
	});
	app.get("/api/genresResume",function(request,response) {
		_genreArtist("genre/artist",request,response);
	});
	var _genreArtist = function(view, request,response) {
		d10.couch.d10.view(view, {group:true, group_level: 1}, function(err,resp) {
			if ( err ) {
				d10.realrest.err(423, err, request.ctx);
			}else {
				d10.realrest.success(resp.rows,request.ctx);
			}
		});
	};
	
	app.get("/api/own/list/artists",function(request,response) {
		_artistBaseName(request.ctx.user._id+"/artist_",request,response);
	});
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
		
		d10.couch.d10.view(view+viewPart,query,function(err,resp) {
			if( err ) {
				return d10.realrest.err(423, request.params.sort, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	};
	
	app.get("/api/own/list/creations",function(request,response) {
		_ts_creationName(request.ctx.user._id+"/ts_creation_name",request,response);
	});
	app.get("/api/list/creations",function(request,response) {
		_ts_creationName("ts_creation/name",request,response);
	});
	var _ts_creationName = function (view, request, response) {
		var query = {include_docs: true, reduce: false, descending: true, limit: d10.config.rpp+1};
		if ( request.query.startkey ) {
			query.startkey = JSON.parse(request.query.startkey);
			if ( request.query.startkey_docid ) {
				query.startkey_docid = request.query.startkey_docid;
			}
		}
		d10.couch.d10.view(view,query,function(err,resp,meta) {
			if ( err ) {
				return d10.realrest.err(423, request.params.sort, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	};
	
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
	
	app.get("/api/own/list/genres",function(request,response) {
		_genreName(request.ctx.user._id+"/genre_name",request,response);
	});
	app.get("/api/list/genres",function(request,response) {
		_genreName("genre/name",request,response);
	});
	var _genreName = function(view, request,response) {
		if ( !request.query.genre || d10.config.allowCustomGenres == false && d10.config.genres.indexOf(request.query.genre) < 0 ) {
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
		d10.couch.d10.view(view,query,function(err,resp) {
			if ( err ) {
				return d10.realrest.err(423, err, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
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
		
		d10.couch.d10.view(view,query,function(err,resp) {
			if ( err ) {
				return d10.realrest.err(423, request.params.sort, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	};

	app.get("/api/own/list/albums",function(request,response) {
		_albumName(request.ctx.user._id+"/album_name",request,response);
	});
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
		d10.couch.d10.view(view,query,function(err,resp) {
			if ( err ) {
				return d10.realrest.err(423, err, request.ctx);
			}
			d10.realrest.success(resp.rows, request.ctx);
		});
	};
	
	app.get("/api/list/s_user",function(request,response) {
		var query = {include_docs: true, startkey: [request.ctx.user._id], endkey: [request.ctx.user._id,[]], limit: d10.config.rpp + 1};
		if ( request.query.startkey ) {
			query.startkey = JSON.parse(request.query.startkey);
			if ( request.query.startkey_docid ) {
				query.startkey_docid = request.query.startkey_docid;
			}
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
	
	app.get("/api/own/list/genres/artists/:genre",function(request,response) {
		_genreArtists(request.ctx.user._id+"/genre_artists",request,response);
	});
	app.get("/api/list/genres/artists/:genre",function(request,response) {
		_genreArtists("genre/artists",request,response);
	});
	var _genreArtists = function(view, request,response) {
		if ( !request.params.genre || d10.config.allowCustomGenres == false && d10.config.genres.indexOf(request.params.genre) < 0 ) {
			return d10.realrest.err(428, request.params.genre, request.ctx);
		}
		d10.couch.d10.view(view,{startkey: [request.params.genre], endkey: [request.params.genre,[]], group: true, group_level: 2},function(err,resp) {
			if ( err ) {
				return d10.realrest.err(423, err, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	};
	
	app.get("/api/own/list/genres/albums/:genre",function(request,response) {
		_genreAlbums(request.ctx.user._id+"/genre_albums",request,response);
	});
	app.get("/api/list/genres/albums/:genre",function(request,response) {
		_genreAlbums("genre/albums",request,response);
	});
	var _genreAlbums = function(view,request,response) {
		if ( !request.params.genre || d10.config.allowCustomGenres == false && d10.config.genres.indexOf(request.params.genre) < 0 ) {
			return d10.realrest.err(428, request.params.genre, request.ctx);
		}
		d10.couch.d10.view(view,{startkey: [request.params.genre], endkey: [request.params.genre,[]], group: true, group_level: 2},function(err,resp) {
			if ( err ) {
				return d10.realrest.err(423, err, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	};
	
	app.get("/api/own/list/genres/albumsSongs/:genre",function(request,response) {
		_genreAlbumsSongs(request.ctx.user._id+"/genre_albums",request,response);
	});
	app.get("/api/list/genres/albumsSongs/:genre",function(request,response) {
		_genreAlbumsSongs("genre/albums",request,response);
	});
	var _genreAlbumsSongs = function(view,request,response) {
		if ( !request.params.genre || 
			d10.config.allowCustomGenres == false && d10.config.genres.indexOf(request.params.genre) < 0 ) {
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
		
		
		d10.couch.d10.view(view, opts, function(err,resp) {
			if ( err ) {
				return d10.realrest.err(423, err, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	};
	
	app.get("/api/own/list/artists/albums/:artist",function(request,response) {
		_artistAlbums(request.ctx.user._id+"/artist_albums",request,response);
	});
	app.get("/api/list/artists/albums/:artist",function(request,response) {
		_artistAlbums("artist/albums",request,response);
	});
	var _artistAlbums = function(view,request,response) {
		if ( !request.params.artist ) {
			return d10.realrest.err(428, request.params.artist, request.ctx);
		}
		d10.couch.d10.view(view,{startkey: [request.params.artist], endkey: [request.params.artist,[]], group: true, group_level: 2},function(err,resp) {
			if ( err ) {
				console.log("error: ",err);
				return d10.realrest.err(423, err, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	};
	
    app.get("/api/own/list/artists/songsByAlbum/:artist",function(request,response) {
        _artistSongsOrderedByAlbums(request.ctx.user._id+"/artist_songsOrderedByAlbums",request,response);
    });
    app.get("/api/list/artists/songsByAlbum/:artist",function(request,response) {
        _artistSongsOrderedByAlbums("artist/songsOrderedByAlbums",request,response);
    });
    var _artistSongsOrderedByAlbums = function(view,request,response) {
        if ( !request.params.artist ) {
            return d10.realrest.err(428, request.params.artist, request.ctx);
        }
        
        d10.couch.d10.view(view,{startkey: [request.params.artist], endkey: [request.params.artist,[]], include_docs: true},function(err,resp) {
            if ( err ) {
                console.log("error: ",err);
                return d10.realrest.err(423, err, request.ctx);
            }
            d10.realrest.success(resp.rows,request.ctx);
        });
    };
    
	app.get("/api/own/list/artists/genres/:artist",function(request,response) {
		_artistGenres(request.ctx.user._id+"/artist_genres",request,response);
	});
	app.get("/api/list/artists/genres/:artist",function(request,response) {
		_artistGenres("artist/genres",request,response);
	});
	var _artistGenres = function(view,request,response) {
		if ( !request.params.artist ) {
			return d10.realrest.err(428, request.params.artist, request.ctx);
		}
		d10.couch.d10.view(view,{startkey: [request.params.artist], endkey: [request.params.artist,[]], group: true, group_level: 2},function(err,resp) {
			if ( err ) {
				console.log("error: ",err);
				return d10.realrest.err(423, err, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	};
	
	app.get("/api/own/list/albums/artists/:album",function(request,response) {
		_albumArtists(request.ctx.user._id+"/album_artists", request, response);
	});
	app.get("/api/list/albums/artists/:album",function(request,response) {
		_albumArtists("album/artists", request, response);
	});
	var _albumArtists = function(view,request,response) {
		if ( !request.params.album ) {
			console.log("no album");
			return d10.realrest.err(428, request.params.album, request.ctx);
		}
		d10.couch.d10.view(view,{startkey: [request.params.album], endkey: [request.params.album,[]], group: true, group_level: 2},function(err,resp) {
			if ( err ) {
				console.log("error: ",err);
				return d10.realrest.err(423, err, request.ctx);
			}
			d10.realrest.success(resp.rows,request.ctx);
		});
	};
    
    
    var artistHitsCallback = function(err,resp) {
      if ( err ) {
        console.log("error: ",err);
        return d10.realrest.err(423, err, this);
      }
      d10.realrest.success(resp.rows, this);
    };
    
    app.get("/api/list/artist/hits", function(request, response) {
      var artist, startkey, startkey_docid;
      if ( !request.query.artist ) {
        console.log("no artist");
        return d10.realrest.err(428, request.query.artist, request.ctx);
      }
      artist = request.query.artist;
      if ( request.query.startkey ) {
        startkey = JSON.parse(request.query.startkey);
        if ( request.query.startkey_docid ) {
          startkey_docid = request.query.startkey_docid;
        }
      }
      
      artists.getSongsByHits(artist,artistHitsCallback.bind(request.ctx),startkey,startkey_docid);
      
    });
    
    
}; // exports.api
