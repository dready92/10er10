define(["js/domReady","js/d10.router", "js/playlist","js/d10.rest","js/d10.templates","js/d10.utils","js/d10.imageUtils", "js/config"],
	   function(foo,router,playlist,rest,tpl,toolbox,imageUtils, config) {

	function  welcome (ui) {

		ui.find(".welcomeBox[data-target]").click(function() {
			router.navigateTo($(this).attr("data-target"));
			return false;
		});

		var findLatest = function(then) {
			rest.song.list.creations({},{
				load: function(err,resp) {
					if ( err ) {
						return ;
					}
					if ( !resp.length ) {
						return ;
					}
					if ( resp.length <= config.rpp ) {
						return then(resp);
					}
					last = resp.pop();
					rest.song.list.creations(
						{
							startkey: JSON.stringify(last.key),
							startkey_docid: last.doc._id
							
						},{
							load: function(err,resp2) {
								if ( err ) {
									return then(resp);
								}
								if ( !resp2.length ) {
									return then(resp);
								}
								resp = resp.concat(resp2);
								return then(resp);
							}
						}
					);
				}
			});
		},
		undefinedAlbum = "__undefined_album__",
		arrangeLatest = function(latest, then) {
// 			debug("arrangeLatest: working with ", latest.length, "songs");
			var songs = $.map(latest,function(v) { return v.doc });
			var songsByAlbum = {};
			var songsByAlbumMeta = {};
			
			for ( var i in songs ) {
				var album = undefinedAlbum;
				if ( songs[i].album ) {
					album = songs[i].album;
				}
				if ( !songsByAlbum[album] ) {
					songsByAlbum[album] = [];
					songsByAlbumMeta[album] = {artists: [], images: [], genres: {} };
				}
				songsByAlbum[album].push(songs[i]);
				if ( songsByAlbumMeta[album].artists.indexOf(songs[i].artist) < 0 ) {
					songsByAlbumMeta[album].artists.push(songs[i].artist);
				}
				if ( songs[i].images && songs[i].images.length ) {
					for ( var j in songs[i].images ) {
						if ( songsByAlbumMeta[album].images.indexOf(songs[i].images[j].filename) < 0 ) {
							songsByAlbumMeta[album].images.push(songs[i].images[j].filename);
						}
					}
				}
				if ( songs[i].genre ) {
					if ( songs[i].genre in songsByAlbumMeta[album].genres ) {
						songsByAlbumMeta[album].genres[songs[i].genre]++;
					} else {
						songsByAlbumMeta[album].genres[songs[i].genre]=1;
					}
				}
			}
// 			for ( var i in songsByAlbum ) {
// 				debug(i, songsByAlbum[i], songsByAlbumMeta[i]);
// 			}
			then(songsByAlbum, songsByAlbumMeta);
		},
		artistsLimitChars = 140,
		displayLatest = function(songsByAlbum, songsByAlbumMeta) {
			var widgets = [];
			for ( var i in songsByAlbum ) {
				if ( i == undefinedAlbum ) {
					continue;
				}
				var songs = songsByAlbum[i], 
					image = songsByAlbumMeta[i].images.length ? songsByAlbumMeta[i].images[0] : "", 
					artists = songsByAlbumMeta[i].artists, 
					genre = toolbox.keyOfHighestValue(songsByAlbumMeta[i].genres);
				var artistsTokenized = "";
				for ( var a in artists ) {
					if ( artistsTokenized.length ) artistsTokenized+=", ";
					artistsTokenized+=artists[a];
					if ( artistsTokenized.length > artistsLimitChars ) {
						artistsTokenized+=", ...";
						break;
					}
				}
				var widget = $(tpl.mustacheView("welcome.wnWidget.album",
						{
							album: i,
							songs: songs.length,
							artists: artistsTokenized,
							genre: genre ? [ genre ] : [],
							image_url: image ? imageUtils.getImageUrl(image) : imageUtils.getAlbumDefaultImage()
						}
					)).data("songs",songs);
				widgets.push(
					widget
				);
			}
			var container = ui.find(".whatsNew .body");
			if ( widgets.length % 2 != 0 ) {
				widgets.pop();
			}
			if ( widgets.length ) {
				$.each(widgets,function(k,v) {
					container.append(v);
				});
				ui.find(".whatsNew").slideDown();
			}
		},
		bindEvents = function() {
			ui.find(".whatsNew")
			.delegate(".albumWidget .head","click",function() {
				router.navigateTo(["library","albums",$(this).attr("data-album")]);
			})
			.delegate(".albumWidget img","click",function() {
				var widget = $(this).closest(".albumWidget");
				router.navigateTo(["library","albums",widget.find(".head").attr("data-album")]);
			})
			.delegate(".albumWidget .whatsNewGenre","click",function() {
				router.navigateTo(["library","genres",$(this).attr("data-genre")]);
				
			})
			.delegate(".whatsNewWidget .footer","click",function() {
				var songs = JSON.parse(JSON.stringify($(this).closest(".whatsNewWidget").data("songs")));
				$.each(songs,function(k,v) {
					playlist.append( $( tpl.song_template(v) ) );
				});
			})
			;
		};
		this.whatsNew = function() {
			ui.find(".whatsNew .body").empty();
			bindEvents();
			findLatest(function(latest) {
				arrangeLatest(latest,displayLatest);
			});
		};
	};
	
	var w = new welcome($('#welcome'));
	
	var welcomeRouteHandler = function() { this._activate("main","welcome",this.switchMainContainer); },
		firstLoad = true;
	router.route("welcome","welcome",welcomeRouteHandler);
	router.bind("route:welcome",function() {
		if ( firstLoad ) {
			w.whatsNew();
			firstLoad = false;
		}
	});
	return w;
});
