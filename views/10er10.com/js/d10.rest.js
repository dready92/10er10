define(["js/d10.httpbroker","js/d10.events", "js/config"],function(bghttp, emitter, config) {
	
	var restQuery = function(endpoint, method, url, options) {
			var query = {
				method: method,
				complete: function(err,data) {
					if ( options.load ) {
						options.load.apply(this,arguments);
					}
					emitter.topic("whenRestEnd").publish({
						endpoint: endpoint,
						status: this.code,
						headers: this.headers,
						response: data
					});
				},
				url: url
			};
			if ( options.data ) {
				query.data = options.data;
			}
			if ( options.contentType ) {
				query.contentType = options.contentType;
			}
			if ( method == "GET" ) {
              query.ws = true;
            }
			bghttp.request(query);
			emitter.topic("whenRestBegin").publish({ endpoint: endpoint });
	};
	
	var rest = {};
	rest.song = {
		upload: function (file, filename, filesize, options, callback) {
			var endpoint = "song.upload";
			if ( !callback ) {
				callback = options;
				options = null;
			}
			var xhr = new XMLHttpRequest();
			var url = config.site_url+"/api/song?"+$.d10param({"filesize": filesize, "filename": filename, bgencoding: "true" } );
			xhr.upload.onprogress = function(event) {
				if ( options.progress ) options.progress.call(this,event);
				emitter.topic("whenRestUploadProgress").publish({endpoint: endpoint, event: event});
			}
			if ( options.end ) xhr.upload.onload = options.end;
			if ( options.readystatechange ) xhr.onreadystatechange = options.readystatechange;
			xhr.onerror = function(event) {
// 				debug("got error on upload",arguments);
				if ( options.error ) options.error.call(this,event);
				emitter.topic("whenRestError").publish({endpoint: endpoint,event: event});
				xhr= null;
			};
			xhr.onabort = function (event) {
				if ( options.abort ) options.abort.call(this,event);
				emitter.topic("whenRestAbort").publish({endpoint: endpoint,event: event});
				xhr= null;
			};
			xhr.onload = function() {
				if ( options.load ) options.load.call(this, this.status, this.getAllResponseHeaders(), this.responseText);
				callback(this.status, this.getAllResponseHeaders(), this.responseText);
				emitter.topic("whenRestEnd").publish({
					endpoint: endpoint,
					status: this.status,
					headers: this.getAllResponseHeaders(),
					response: this.responseText
				});
				xhr=null;
			};
            xhr.open("PUT",url);
            xhr.send(file);
            file = null;
			emitter.topic("whenRestBegin").publish({
				endpoint: endpoint,
				filename: filename,
				filesize: filesize,
				options: options
			});
		},
		remove: function(song_id, options) {
			restQuery("song.remove","DELETE",config.site_url+"/api/song/"+song_id,options);
		},
		get: function(song_id, options) {
			if ( $.isArray(song_id) ) {
				options.data = {ids: song_id};
				restQuery("song.get","POST",config.site_url+"/api/songs",options);
				
			} else {
				restQuery("song.get","GET",config.site_url+"/api/song/"+song_id,options);
			}
		},
 		/*
		 * @param start starting string of the song title
		 * 
		 * @return ["song title 1","song title 2", ...]
		 */
		listByTitle: function(start, options) {
			if ( !options && $.isPlainObject(start) ) {
				options = start;
				start = null;
			}
			if ( start ) {
				options.data = {start: start};
			}
			restQuery("song.listByTitle","GET",config.site_url+"/api/title",options);
		},
 
		uploadImage: function(song_id, file, filename, filesize, options) {
			var endpoint = "song.uploadImage";
			var xhr = new XMLHttpRequest();
			var url ;
			if ( $.isArray(song_id) ) {
				url = config.site_url+"/api/songImage?"+$.d10param({filesize: file.size, filename: file.name, "ids[]": song_id});
				debug(url);
			} else {
				url = config.site_url+"/api/songImage/"+song_id+"?"+$.d10param({filesize: file.size, filename: file.name});
			}
			xhr.upload.onprogress = function(event) {
				if ( options.progress ) options.progress.call(this,event);
				emitter.topic("whenRestUploadProgress").publish({endpoint: endpoint, event: event});
			}
			if ( options.end ) xhr.upload.onload = options.end;
			if ( options.readystatechange ) xhr.onreadystatechange = options.readystatechange;
			xhr.onerror = function(event) {
				if ( options.error ) options.error.call(this,event);
				emitter.topic("whenRestError").publish({endpoint: endpoint,event: event});
				xhr= null;
			};
			xhr.onabort = function (event) {
				if ( options.abort ) options.abort.call(this,event);
				emitter.topic("whenRestAbort").publish({endpoint: endpoint,event: event});
				xhr= null;
			};
			xhr.onload = function() {
				var data = this.responseText, contentType = this.getResponseHeader("Content-Type") || "text/html";
				if ( contentType.match(/json$/) ) {
					try  { data = JSON.parse(data); }
					catch (e) { data = this.responseText; }
				}
				if ( options.load ) options.load.call(this, this.status == 200 ? null: this.status, this.getAllResponseHeaders(), data);
				emitter.topic("whenRestEnd").publish({
					endpoint: endpoint,
					status: this.status,
					headers: this.getAllResponseHeaders(),
					response: data
				});
				xhr=null;
			};

            xhr.open("POST",url);
            xhr.send(file);
            file = null;
			emitter.topic("whenRestBegin").publish({
				endpoint: endpoint,
				filename: filename,
				filesize: filesize,
				options: options
			});
		},
		removeImage: function(song_id, filename, options) {
			restQuery("song.removeImage","DELETE","/api/songImage/"+song_id+"/"+filename,options);
		},
		random: function(options) {
			restQuery("song.random","POST","/api/random",options);
		},
		starring: {
			/*
			 * @param id String song id
			 * @param type String starring type ( "likes","dislikes")
			 */
			set: function(id, type, options) {
				restQuery("song.starring.set","PUT",config.site_url+"/api/starring/"+type+"/"+id, options);
			}
		},
		list: {
			hits: function(query, options) {
				if ( query.startkey && query.startkey_docid ) {
					options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
				}
				restQuery("song.list.hits","GET",config.site_url+"/api/list/hits",options);
			},
			creations: function(query, options) {
				if ( query.startkey && query.startkey_docid ) {
					options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
				}
				restQuery("song.list.creations","GET",config.site_url+"/api/list/creations",options);
			},
			genres: function(query, options) {
				options.data = {};
				if ( query.startkey && query.startkey_docid ) {
					options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
				}
				options.data.genre = query.genre;
				restQuery("song.list.genres","GET",config.site_url+"/api/list/genres",options);
			},
			albums: function(query, options) {
				options.data = {};
				if ( query.startkey  ) {
					options.data.startkey = query.startkey;
					if ( query.startkey_docid ) {
						options.data.startkey_docid = query.startkey_docid;
					}
				}
				if ( query.endkey  ) {
					options.data.endkey = query.endkey;
				}
				if( query.album ) {
					options.data.album = query.album;
				}
				if ( query.full ) {
				  options.data.full = true;
				}
				restQuery("song.list.albums","GET",config.site_url+"/api/list/albums",options);
			},
 			artists: function(query, options) {
				options.data = {};
				if ( query.startkey && query.startkey_docid ) {
					options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
				}
				if( query.artist ) {
					options.data.artist = query.artist;
				}
				restQuery("song.list.artists","GET",config.site_url+"/api/list/artists",options);
			},
 			titles: function(query, options) {
				options.data = {};
				if ( query.startkey && query.startkey_docid ) {
					options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
				}
				if( query.title ) {
					options.data.title = query.title;
				}
				restQuery("song.list.titles","GET",config.site_url+"/api/list/titles",options);
			}
		}
	};
	
	rest.templates = function(options) {
		restQuery("templates","GET",config.site_url+"/api/htmlElements",options);
	};
	

	rest.user = {
		infos: function(options) {
			restQuery("user.infos","GET",config.site_url+"/api/userinfos",options);
		},
 		setPreference: function(name, value, options) {
			options.data = {value: value};
			restQuery("user.setPreference","PUT",config.site_url+"/api/preference/"+name,options);
		},
		logout: function(options) {
			restQuery("user.logout","GET",config.site_url+"/welcome/goodbye",options);
		},	
		review: {
			count: function(options) {
				restQuery("user.review.count","GET",config.site_url+"/api/toReview",options);
			},
			list: function(options) {
				restQuery("user.review.list","GET",config.site_url+"/api/review/list",options);
			},
			post: function(id, data,options) {
				options.data = data;
				restQuery("user.review.post", "PUT", config.site_url+"/api/meta/"+id,options);
			}
		},
		invites: {
			/*
			 * 
			 * @return void
			 */
			send: function(email, options) {
				options.data = {email: email};
				restQuery("user.invites.send","POST",config.site_url+"/api/sendInvite",options);
			},
			/*
			 *
			 * @return int nr of invites a user can give
			 */
			count: function(options) {
				restQuery("user.invites.cont","GET",config.site_url+"/api/invites/count",options);
			}
		},
		storeVolume: function(volume, options) {
			options.data = {volume: volume};
			restQuery("user.storeVolume","POST",config.site_url+"/api/volume",options);
		},
		playerList: {
			default: {
				store: function(list,options) {
					options.data = { list: list, type: "default"};
					restQuery("user.playerList.default.store","PUT",config.site_url+"/api/current_playlist",options);
				}
			},
			rpl: {
				store: function(id, options) {
					options.data = { rpl: id, type: "rpl"};
					restQuery("user.playerList.rpl.store","PUT",config.site_url+"/api/current_playlist",options);
				}
			}
		},
		likes: function(query, options) {
			if ( query.startkey && query.startkey_docid ) {
				options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
			}
			restQuery("user.likes","GET",config.site_url+"/api/list/likes",options);
		},
		songs: function(query, options) {
			if ( query.startkey && query.startkey_docid ) {
				options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
			}
			restQuery("user.songs","GET",config.site_url+"/api/list/s_user",options);
		},
		search: {
			all: function(query, options) {
				options.data = { start: query };
				restQuery("user.search.all","GET",config.site_url+"/api/own/search",options);
			}
		},
		song: {
			list: {
				genreLastListened: function(genre, query, options) {
					options.data = {};
					if ( query.startkey && query.startkey_docid ) {
						options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
					}
					restQuery("user.song.list.genreLastListened","GET",
							  config.site_url+"/api/own/list/genre/lastPlayed/" +encodeURIComponent(genre),options);
				}
			}
		}
 		
	};
	
	rest.server = {
		length: function(options) {
			restQuery("server.length","GET",config.site_url+"/api/length",options);
		},
		load: function(options) {
			restQuery("server.load","GET",config.site_url+"/api/serverLoad",options);
		}
	};

	
	rest.album = {
		/*
		 * @param start starting string of the album name
		 * 
		 * @return ["album 1","album2", ...]
		 */
		list: function(start, options) {
			if ( !options && $.isPlainObject(start) ) {
				options = start;
				start = null;
			}
			if ( start ) {
				options.data = {start: start};
			}
			restQuery("album.list","GET",config.site_url+"/api/album",options);
		},
		/*
		 * @param album String album name
		 * 
		 * @return [ {key: [album, "artist 1"], value: 4}, ...]
		 */
		artists: function(album, options) {
			restQuery("album.artists","GET",config.site_url+"/api/list/albums/artists/"+ encodeURIComponent(album),options);
		},

		/*
		 * @return [ {key: "A", value: 23}, {key: "G", value: 34}, ...]
		 */
		firstLetter: function(options) {
			restQuery("album.firstLetter","GET",config.site_url+"/api/album/firstLetter",options);
		}

	};
	
	rest.artist = {
		/*
		 * @param start starting string of the artist name
		 * 
		 * @return ["artist 1","artist 2", ...]
		 */
		list: function(start, options) {
			if ( !options && $.isPlainObject(start) ) {
				options = start;
				start = null;
			}
			if ( start ) {
				options.data = {start: start};
			}
			restQuery("artist.list","GET",config.site_url+"/api/artist",options);
		},
 
 		/*
		 * 
		 * @return [ {key: ["ACDC"], value: 4} ]
		 */
		allByName: function(data, options) {
            options.data = data;
			restQuery("artist.allByName","GET",config.site_url+"/api/artistsListing",options);
		},
  
		/*
		 * @param artist String artist name
		 * 
		 * @return { artists: { "artist name": 45, "other name": 5, ... }, artistsRelated: { "other artist name": 5, ...}}
		 */
		related: function(artist, options) {
			restQuery("artist.related","GET",config.site_url+"/api/relatedArtists/"+ encodeURIComponent(artist),options);
		},
 
		/*
		 * @param artist String artist name
		 * 
		 * @return [ {key: [artist, "album 1"], value: 4}, ...] 
		 */
		albums: function(artist, options) {
			restQuery("artist.albums","GET",config.site_url+"/api/list/artists/albums/"+ encodeURIComponent(artist),options);
		},
 
        songsByAlbum: function(artist, options) {
          options = options || {};
          restQuery("artist.songsByAlbums","GET",config.site_url+"/api/list/artists/songsByAlbum/"+ encodeURIComponent(artist),options);
        },
       
		/*
		 * @param artist String artist name
		 * 
		 * @return [ {key: [artist, "genre 1"], value: 4}, ...]
		 */
		genres: function(artist, options) {
			restQuery("artist.genres","GET",config.site_url+"/api/list/artists/genres/"+ encodeURIComponent(artist),options);
		},
       
        songHits: function(artist, options) {
            options = options || {};
            options.data = {artist: artist};
			if ( options.genre ) { options.data.genre = options.genre ; }
            restQuery("artist.songHits","GET",config.site_url+"/api/list/artist/hits", options);
        },
	};
	
	rest.genre = {
        /*
         * number of songs available by genre
         * 
         * @return [ {key: ["genre1"], value: 12}, ... ]
         */
        available: function(options) {
          restQuery("genre.available","GET",config.site_url+"/api/genres/available",options);
        },
       
		/*
		 * @param start starting string of the genre name
		 * 
		 * @return ["genre 1","genre 2", ...]
		 */
		list: function(start, options) {
			if ( !options && $.isPlainObject(start) ) {
				options = start;
				start = null;
			}
			if ( start ) {
				options.data = {start: start};
			}
			restQuery("genre.list","GET",config.site_url+"/api/genre",options);
		},
		/*
		 * 
		 * 
		 * @return [ {"key":["Dub"],"value":{"count":50,"artists":["Velvet Shadows","Tommy McCook & The Aggrovators","Thomsons All Stars"]}}, ... ]
		 */
		resume: function(options) {
			restQuery("genre.resume","GET",config.site_url+"/api/genresResume",options);
		},
		/*
		 * @param genre String genre the album should belong to
		 * 
		 * @return [ {key: [genre, "album1"], value: 4}, ...], 
		 */
		albums: function(genre, options) {
			restQuery("genre.albums","GET",config.site_url+"/api/list/genres/albums/"+encodeURIComponent(genre),options);
		},
 		/*
		 * @param genre String genre the artist should belong to
		 * 
		 * @return [ {key: [genre, "artist 1"], value: 4}, ...], 
		 */
		artists: function(genre, query, options) {
          options.data = {};
          if ( query.startkey && query.startkey_docid ) {
            options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
          }
          restQuery("genre.artists","GET",config.site_url+"/api/list/genres/artists/"+encodeURIComponent(genre),options);
		},
		/*
		 * @param genre String genre the genre we check if albums exists
		 *
		 * @return {albums: true|false}
		 */
		gotAlbums: function(genre, options) {
			restQuery("genre.gotAlbums","GET",config.site_url+"/api/list/genres/gotAlbums/"+encodeURIComponent(genre),options);
		},
		/*
		 * @param genre String genre we query on
		 * @param query {startkey:.., startkey_docid:...} to paginate
		 * @return [ {key: ["genre","album name"], doc: .., value: null } ]
		 */
		albumsSongs: function(genre, query, options) {
			options.data = {};
			if ( query.startkey && query.startkey_docid ) {
				options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
			}
			restQuery("genre.list.albumsSongs","GET",config.site_url+"/api/list/genres/albumsSongs/"+encodeURIComponent(genre),options);
		},
		songsByCreation: function(genre, query, options) {
			options.data = {genre: genre};
			if ( query.startkey && query.startkey_docid ) {
				options.data.startkey = query.startkey;
				options.data.startkey_docid = query.startkey_docid;
			}
			restQuery("genre.list.songsByCreation","GET",config.site_url+"/api/list/creations",options);
		},
	   songsByHits: function(genre, query, options) {
			options.data = {};
			if ( query.startkey && query.startkey_docid ) {
				options.data.startkey = query.startkey;
				options.data.startkey_docid = query.startkey_docid;
			}
			restQuery("genre.list.songsByHits","GET",config.site_url+"/api/genre/songsByHits/"+encodeURIComponent(genre),options);
		},
		artistsByHits: function(genre, query, options) {
			options.data = {};
			if ( query.startkey && query.startkey_docid ) {
				options.data.startkey = query.startkey;
				options.data.startkey_docid = query.startkey_docid;
			}
			restQuery("genre.list.artistsByHits","GET",config.site_url+"/api/genre/artistsByHits/"+encodeURIComponent(genre),options);
		},
		albumsByHits: function(genre, query, options) {
			options.data = {};
			if ( query.startkey && query.startkey_docid ) {
				options.data.startkey = query.startkey;
				options.data.startkey_docid = query.startkey_docid;
			}
			restQuery("genre.list.albumsByHits","GET",config.site_url+"/api/genre/albumsByHits/"+encodeURIComponent(genre),options);
		},
   		genreResume: function(genre, options) {
			restQuery("genre.resume","GET",config.site_url+"/api/genre/resume/"+encodeURIComponent(genre),options);
		},

	};
	
	rest.rpl = {
		/*
		 * 
		 * @return {_id: "pl....", ...}
		 */
		get: function(id,options) {
			restQuery("rpl.get","GET",config.site_url+"/api/plm/"+id,options);
		},

		create: function(name, songs, options) {
			options.data = {
				name: name,
				"songs[]": songs ? songs : []
			};
			restQuery("rpl.create","PUT",config.site_url+"/api/plm/create",options);

		},
		/*
		 * 
		 * @return {playlist: {_id: "pl...",...}, songs: [{_id: "aa...", ...}, ... ]}
		 */
		update: function(id, songs, options) {
			options.data = {
				playlist: id,
				"songs[]": songs
			};
			restQuery("rpl.update","PUT",config.site_url+"/api/plm/update",options);
		},
		/*
		 * 
		 * @return {_id: "pl....", ...}
		 */		
		remove: function(id, options) {
			restQuery("rpl.delete","DELETE",config.site_url+"/api/plm/"+id,options);
		},
		/*
		 * 
		 * @return {_id: "pl....", ...}
		 */
		rename: function(id,name,options) {
			options.data = {
				name:name
			};
// 			options.contentType = "application/x-www-form-urlencoded";
			restQuery("rpl.rename","PUT",config.site_url+"/api/plm/rename/"+id,options);
		},
		/*
		 * 
		 * @return {playlist: {_id: "pl...",...}, song: {_id: "aa...", ...}}
		 */		
		append: function(id,song_id,options) {
			options.data = {
				song:song_id
			};
// 			options.contentType = "application/x-www-form-urlencoded";
			restQuery("rpl.append","PUT",config.site_url+"/api/plm/append/"+id,options);
		}
	};
	
	rest.search = {
		all: function(query, options) {
			options.data = { start: query };
			restQuery("search.all","GET",config.site_url+"/api/search",options);
		},
		details: function(details, options) {
			options.data = details;
			restQuery("search.details","POST",config.site_url+"/api/details",options);
		}
	};
    
    rest.rc = {
      login: function(login, password, options) {
        options.data = {login: login, password: password};
        restQuery("rc.login","POST",config.site_url+"/api/rc/login",options);
      },
      sessionLogin: function(options) {
        restQuery("rc.login","POST",config.site_url+"/api/rc/login",options);
      },
      logout: function(options) {
        restQuery("rc.logout","PUT",config.site_url+"/api/rc/logout",options);
      }
    };
    
	return rest;
});
