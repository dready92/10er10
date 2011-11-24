define(["js/httpbroker","js/d10.events"],function(bghttp, emitter) {

	var useFileReader = false;
	if ( typeof FileReader != "undefined" ) {
		var fr = new FileReader();
		if ( fr.addEventListener ) {
			useFileReader = true;
		}
		delete fr;
	}
	
	var restQuery = function(endpoint, method, url, options) {
			var query = {
				method: method,
				complete: function(err,data) {
					if ( options.load ) {
						options.load.apply(this,arguments);
					}
					emitter.trigger("whenRestEnd",{
						endpoint: endpoint,
						status: this.code,
						headers: this.headers,
						response: data
					});
				},
				restMode: true,
				url: url
			};
			if ( options.data ) {
				query.data = options.data;
			}
			if ( options.contentType ) {
				query.contentType = options.contentType;
			}
			bghttp.request(query);
			emitter.trigger("whenRestBegin",{ endpoint: endpoint });
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
			var url = site_url+"/api/song?"+$.d10param({"filesize": filesize, "filename": filename } );
			xhr.upload.onprogress = function(event) {
				if ( options.progress ) options.progress.call(this,event);
				emitter.trigger("whenRestUploadProgress",{endpoint: endpoint, event: event});
			}
			if ( options.end ) xhr.upload.onload = options.end;
			if ( options.readystatechange ) xhr.onreadystatechange = options.readystatechange;
			xhr.onerror = function(event) {
// 				debug("got error on upload",arguments);
				if ( options.error ) options.error.call(this,event);
				emitter.trigger("whenRestError",{endpoint: endpoint,event: event});
				xhr= null;
			};
			xhr.onabort = function (event) {
				if ( options.abort ) options.abort.call(this,event);
				emitter.trigger("whenRestAbort",{endpoint: endpoint,event: event});
				xhr= null;
			};
			xhr.onload = function() {
				if ( options.load ) options.load.call(this, this.status, this.getAllResponseHeaders(), this.responseText);
				callback(this.status, this.getAllResponseHeaders(), this.responseText);
				emitter.trigger("whenRestEnd",{
					endpoint: endpoint,
					status: this.status,
					headers: this.getAllResponseHeaders(),
					response: this.responseText
				});
				xhr=null;
			};
 
			if ( useFileReader ) {
				debug("using filereader");
				var reader = new FileReader();
				reader.onload = function() {
					xhr.open("PUT",url);
					xhr.sendAsBinary(reader.result);
					reader = null;
					file = null;
				};
				reader.readAsBinaryString(file);
			} else {
				debug("NOT using filereader");
				xhr.open("PUT",url);
				xhr.send(file);
				file = null;
			}
			emitter.trigger("whenRestBegin",{
				endpoint: endpoint,
				filename: filename,
				filesize: filesize,
				options: options
			});
		},
		remove: function(song_id, options) {
			restQuery("song.remove","DELETE",site_url+"/api/song/"+song_id,options);
		},
		get: function(song_id, options) {
			if ( $.isArray(song_id) ) {
				options.data = {ids: song_id};
				restQuery("song.get","POST",site_url+"/api/songs",options);
				
			} else {
				restQuery("song.get","GET",site_url+"/api/song/"+song_id,options);
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
			restQuery("song.listByTitle","GET",site_url+"/api/title",options);
		},
 
		uploadImage: function(song_id, file, filename, filesize, options) {
			var endpoint = "song.uploadImage";
			var xhr = new XMLHttpRequest();
			var url ;
			if ( $.isArray(song_id) ) {
				url = site_url+"/api/songImage?"+$.d10param({filesize: file.size, filename: file.name, "ids[]": song_id});
				debug(url);
			} else {
				url = site_url+"/api/songImage/"+song_id+"?"+$.d10param({filesize: file.size, filename: file.name});
			}
			xhr.upload.onprogress = function(event) {
				if ( options.progress ) options.progress.call(this,event);
				emitter.trigger("whenRestUploadProgress",{endpoint: endpoint, event: event});
			}
			if ( options.end ) xhr.upload.onload = options.end;
			if ( options.readystatechange ) xhr.onreadystatechange = options.readystatechange;
			xhr.onerror = function(event) {
// 				debug("got error on upload",arguments);
				if ( options.error ) options.error.call(this,event);
				emitter.trigger("whenRestError",{endpoint: endpoint,event: event});
				xhr= null;
			};
			xhr.onabort = function (event) {
				if ( options.abort ) options.abort.call(this,event);
				emitter.trigger("whenRestAbort",{endpoint: endpoint,event: event});
				xhr= null;
			};
			xhr.onload = function() {
				var data = this.responseText, contentType = this.getResponseHeader("Content-Type") || "text/html";
				if ( contentType.match(/json$/) ) {
					try  { data = JSON.parse(data); }
					catch (e) { data = this.responseText; }
				}
				if ( options.load ) options.load.call(this, this.status == 200 ? null: this.status, this.getAllResponseHeaders(), data);
				emitter.trigger("whenRestEnd",{
					endpoint: endpoint,
					status: this.status,
					headers: this.getAllResponseHeaders(),
					response: data
				});
				xhr=null;
			};
 
			if ( useFileReader ) {
				debug("using filereader");
				var reader = new FileReader();
				reader.onload = function() {
					xhr.open("POST",url);
					xhr.sendAsBinary(reader.result);
					reader = null;
					file = null;
				};
				reader.readAsBinaryString(file);
			} else {
				debug("NOT using filereader");
				xhr.open("POST",url);
				xhr.send(file);
				file = null;
			}
			emitter.trigger("whenRestBegin",{
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
				restQuery("song.starring.set","PUT",site_url+"/api/starring/"+type+"/"+id, options);
			}
		},
		list: {
			hits: function(query, options) {
				if ( query.startkey && query.startkey_docid ) {
					options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
				}
				restQuery("song.list.hits","GET",site_url+"/api/list/hits",options);
			},
			creations: function(query, options) {
				if ( query.startkey && query.startkey_docid ) {
					options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
				}
				restQuery("song.list.creations","GET",site_url+"/api/list/creations",options);
			},
			genres: function(query, options) {
				options.data = {};
				if ( query.startkey && query.startkey_docid ) {
					options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
				}
				options.data.genre = query.genre;
				restQuery("song.list.genres","GET",site_url+"/api/list/genres",options);
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
				restQuery("song.list.albums","GET",site_url+"/api/list/albums",options);
			},
 			artists: function(query, options) {
				options.data = {};
				if ( query.startkey && query.startkey_docid ) {
					options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
				}
				if( query.artist ) {
					options.data.artist = query.artist;
				}
				restQuery("song.list.artists","GET",site_url+"/api/list/artists",options);
			},
 			titles: function(query, options) {
				options.data = {};
				if ( query.startkey && query.startkey_docid ) {
					options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
				}
				if( query.title ) {
					options.data.title = query.title;
				}
				restQuery("song.list.titles","GET",site_url+"/api/list/titles",options);
			}
		}
	};
	
	rest.templates = function(options) {
		restQuery("templates","GET",site_url+"/api/htmlElements",options);
	};
	

	rest.user = {
		infos: function(options) {
			restQuery("user.infos","GET",site_url+"/api/userinfos",options);
		},
 		setPreference: function(name, value, options) {
			options.data = {value: value};
			restQuery("user.setPreference","PUT",site_url+"/api/preference/"+name,options);
		},
		logout: function(options) {
			restQuery("user.logout","GET",site_url+"/welcome/goodbye",options);
		},	
		review: {
			count: function(options) {
				restQuery("user.review.count","GET",site_url+"/api/toReview",options);
			},
			list: function(options) {
				restQuery("user.review.list","GET",site_url+"/api/review/list",options);
			},
			post: function(id, data,options) {
				options.data = data;
				restQuery("user.review.post", "PUT", site_url+"/api/meta/"+id,options);
			}
		},
		invites: {
			/*
			 * 
			 * @return void
			 */
			send: function(email, options) {
				options.data = {email: email};
				restQuery("user.invites.send","POST",site_url+"/api/sendInvite",options);
			},
			/*
			 *
			 * @return int nr of invites a user can give
			 */
			count: function(options) {
				restQuery("user.invites.cont","GET",site_url+"/api/invites/count",options);
			}
		},
		storeVolume: function(volume, options) {
			options.data = {volume: volume};
			restQuery("user.storeVolume","POST",site_url+"/api/volume",options);
		},
		playerList: {
			default: {
				store: function(list,options) {
					options.data = { list: list, type: "default"};
					restQuery("user.playerList.default.store","PUT",site_url+"/api/current_playlist",options);
				}
			},
			rpl: {
				store: function(id, options) {
					options.data = { rpl: id, type: "rpl"};
					restQuery("user.playerList.rpl.store","PUT",site_url+"/api/current_playlist",options);
				}
			}
		},
		likes: function(query, options) {
			if ( query.startkey && query.startkey_docid ) {
				options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
			}
			restQuery("user.likes","GET",site_url+"/api/list/likes",options);
		},
		songs: function(query, options) {
			if ( query.startkey && query.startkey_docid ) {
				options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
			}
			restQuery("user.songs","GET",site_url+"/api/list/s_user",options);
		},
		search: {
			all: function(query, options) {
				options.data = { start: query };
				restQuery("user.search.all","GET",site_url+"/api/own/search",options);
			}
		},
		artist: {
			list: function(start, options) {
				if ( !options && $.isPlainObject(start) ) {
					options = start;
					start = null;
				}
				if ( start ) {
					options.data = {start: start};
				}
				restQuery("user.artist.list","GET",site_url+"/api/own/artist",options);
			},
			allByName: function(options) {
				restQuery("user.artist.allByName","GET",site_url+"/api/own/artistsListing",options);
			}
		},
		album: {
			list: function(start, options) {
				if ( !options && $.isPlainObject(start) ) {
					options = start;
					start = null;
				}
				if ( start ) {
					options.data = {start: start};
				}
				restQuery("user.album.list","GET",site_url+"/api/own/album",options);
			},
			/*
			* @return [ {key: "A", value: 23}, {key: "G", value: 34}, ...]
			*/
			firstLetter: function(options) {
				restQuery("user.album.firstLetter","GET",site_url+"/api/own/album/firstLetter",options);
			}
		},
		genre: {
			resume: function(options) {
				restQuery("user.genre.resume","GET",site_url+"/api/own/genresResume",options);
			}
		},
		song: {
			random: function(options) {
				restQuery("user.song.random","POST","/api/own/random",options);
			},
			listByTitle: function(start, options) {
				if ( !options && $.isPlainObject(start) ) {
					options = start;
					start = null;
				}
				if ( start ) {
					options.data = {start: start};
				}
				restQuery("user.song.listByTitle","GET",site_url+"/api/own/title",options);
			},
			list: {
				creations: function(query, options) {
					if ( query.startkey && query.startkey_docid ) {
						options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
					}
					restQuery("user.song.list.creations","GET",site_url+"/api/own/list/creations",options);
				},
				genres: function(query, options) {
					options.data = {};
					if ( query.startkey && query.startkey_docid ) {
						options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
					}
					options.data.genre = query.genre;
					restQuery("user.song.list.genres","GET",site_url+"/api/own/list/genres",options);
				},
				albums: function(query, options) {
					options.data = {};
					if ( query.startkey && query.startkey_docid ) {
						options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
					}
					if( query.album ) {
						options.data.album = query.album;
					}
					restQuery("user.song.list.albums","GET",site_url+"/api/own/list/albums",options);
				},
				artists: function(query, options) {
					options.data = {};
					if ( query.startkey && query.startkey_docid ) {
						options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
					}
					if( query.artist ) {
						options.data.artist = query.artist;
					}
					restQuery("user.song.list.artists","GET",site_url+"/api/own/list/artists",options);
				},
				titles: function(query, options) {
					options.data = {};
					if ( query.startkey && query.startkey_docid ) {
						options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
					}
					if( query.title ) {
						options.data.title = query.title;
					}
					restQuery("user.song.list.titles","GET",site_url+"/api/own/list/titles",options);
				}
			}
		}
 		
	};
	
	rest.server = {
		length: function(options) {
			restQuery("server.length","GET",site_url+"/api/length",options);
		},
		load: function(options) {
			restQuery("server.load","GET",site_url+"/api/serverLoad",options);
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
			restQuery("album.list","GET",site_url+"/api/album",options);
		},
		/*
		 * @param album String album name
		 * 
		 * @return [ {key: [album, "artist 1"], value: 4}, ...]
		 */
		artists: function(album, options) {
			restQuery("album.artists","GET",site_url+"/api/list/albums/artists/"+ encodeURIComponent(album),options);
		},

		/*
		 * @return [ {key: "A", value: 23}, {key: "G", value: 34}, ...]
		 */
		firstLetter: function(options) {
			restQuery("album.firstLetter","GET",site_url+"/api/album/firstLetter",options);
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
			restQuery("artist.list","GET",site_url+"/api/artist",options);
		},
 
 		/*
		 * 
		 * @return [ {key: ["ACDC"], value: 4} ]
		 */
		allByName: function(options) {
			restQuery("artist.allByName","GET",site_url+"/api/artistsListing",options);
		},
  
		/*
		 * @param artist String artist name
		 * 
		 * @return { artists: { "artist name": 45, "other name": 5, ... }, artistsRelated: { "other artist name": 5, ...}}
		 */
		related: function(artist, options) {
			restQuery("artist.related","GET",site_url+"/api/relatedArtists/"+ encodeURIComponent(artist),options);
		},
 
		/*
		 * @param artist String artist name
		 * 
		 * @return [ {key: [artist, "album 1"], value: 4}, ...] 
		 */
		albums: function(artist, options) {
			restQuery("artist.albums","GET",site_url+"/api/list/artists/albums/"+ encodeURIComponent(artist),options);
		},
 
		/*
		 * @param artist String artist name
		 * 
		 * @return [ {key: [artist, "genre 1"], value: 4}, ...]
		 */
		genres: function(artist, options) {
			restQuery("artist.genres","GET",site_url+"/api/list/artists/genres/"+ encodeURIComponent(artist),options);
		}
	};
	
	rest.genre = {
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
			restQuery("genre.list","GET",site_url+"/api/genre",options);
		},
		/*
		 * 
		 * 
		 * @return [ {"key":["Dub"],"value":{"count":50,"artists":["Velvet Shadows","Tommy McCook & The Aggrovators","Thomsons All Stars"]}}, ... ]
		 */
		resume: function(options) {
			restQuery("genre.resume","GET",site_url+"/api/genresResume",options);
		},
		/*
		 * @param genre String genre the album should belong to
		 * 
		 * @return [ {key: [genre, "album1"], value: 4}, ...], 
		 */
		albums: function(genre, options) {
			restQuery("genre.albums","GET",site_url+"/api/list/genres/albums/"+encodeURIComponent(genre),options);
		},
 		/*
		 * @param genre String genre the artist should belong to
		 * 
		 * @return [ {key: [genre, "artist 1"], value: 4}, ...], 
		 */
		artists: function(genre, options) {
			restQuery("genre.artists","GET",site_url+"/api/list/genres/artists/"+encodeURIComponent(genre),options);
		}
	};	
	
	rest.rpl = {
		/*
		 * 
		 * @return {_id: "pl....", ...}
		 */
		get: function(id,options) {
			restQuery("rpl.get","GET",site_url+"/api/plm/"+id,options);
		},

		create: function(name, songs, options) {
			options.data = {
				name: name,
				"songs[]": songs ? songs : []
			};
			restQuery("rpl.create","PUT",site_url+"/api/plm/create",options);

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
			restQuery("rpl.update","PUT",site_url+"/api/plm/update",options);
		},
		/*
		 * 
		 * @return {_id: "pl....", ...}
		 */		
		remove: function(id, options) {
			restQuery("rpl.delete","DELETE",site_url+"/api/plm/"+id,options);
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
			restQuery("rpl.rename","PUT",site_url+"/api/plm/rename/"+id,options);
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
			restQuery("rpl.append","PUT",site_url+"/api/plm/append/"+id,options);
		}
	};
	
	rest.search = {
		all: function(query, options) {
			options.data = { start: query };
			restQuery("search.all","GET",site_url+"/api/search",options);
		},
		details: function(details, options) {
			options.data = details;
			restQuery("search.details","POST",site_url+"/api/details",options);
		}
	};
	return rest;
});
