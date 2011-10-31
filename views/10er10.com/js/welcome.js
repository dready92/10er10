(function(d10,$) {

d10.fn = d10.fn || {};

d10.fn.welcome = function  (ui) {
	//self ref
	var that=this;

	$("div.scrollContainer div.welcomeBox[data-target]").click(function() {
		d10.router.navigateTo($(this).attr("data-target"));
		return false;
	});

	var findLatest = function(then) {
		d10.rest.song.list.creations({},{
			load: function(err,resp) {
				if ( err ) {
					return ;
				}
				if ( !resp.length ) {
					return ;
				}
				if ( resp.length <= d10.config.rpp ) {
					return then(resp);
				}
				last = resp.pop();
				d10.rest.song.list.creations(
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
		debug("arrangeLatest: working with ", latest.length, "songs");
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
				songsByAlbumMeta[album] = {artists: [], images: []};
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
		}
		for ( var i in songsByAlbum ) {
			debug(i, songsByAlbum[i], songsByAlbumMeta[i]);
		}
		then(songsByAlbum, songsByAlbumMeta);
	},
	artistsLimitChars = 300,
	displayLatest = function(songsByAlbum, songsByAlbumMeta) {
		var widgets = [];
		for ( var i in songsByAlbum ) {
			if ( i == undefinedAlbum ) {
				continue;
			}
			if ( !songsByAlbumMeta[i].images.length ) {
				continue;
			}
			var songs = songsByAlbum[i], image = songsByAlbumMeta[i].images[0], artists = songsByAlbumMeta[i].artists;
			var artistsTokenized = "";
			for ( var a in artists ) {
				if ( artistsTokenized.length ) artistsTokenized+=", ";
				artistsTokenized+=artists[a];
				if ( artistsTokenized.length > artistsLimitChars ) {
					artistsTokenized+=", ...";
					break;
				}
			}
			widgets.push(
				$(d10.mustacheView("welcome.wnWidget.album",
					{
						album: i,
						songs: songs.length,
						artists: artistsTokenized,
						image_url: d10.config.img_root+"/"+image
					}
				)).data("songs",songs)
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
			d10.router.navigateTo(["library","albums",$(this).attr("data-album")]);
		})
		.delegate(".whatsNewWidget .footer","click",function() {
			var songs = $(this).closest(".whatsNewWidget").data("songs");
			$.each(songs,function(k,v) {
				d10.playlist.append( $( d10.song_template(v) ) );
			});
		})
		;
	};
	this.whatsNew = function() {
		bindEvents();
		findLatest(function(latest) {
			arrangeLatest(latest,displayLatest);
		});
	};
};

})( window.d10 ? window.d10 : {}  , jQuery) ;


$(document).one("bootstrap:router",function() {
	var welcomeRouteHandler = function() { this._activate("main","welcome",this.switchMainContainer); },
		firstLoad = true;
	d10.welcome = new d10.fn.welcome($('#welcome'));
	d10.router.route("welcome","welcome",welcomeRouteHandler);
	d10.router.bind("route:welcome",function() {
		if ( firstLoad ) {
			d10.welcome.whatsNew();
			firstLoad = false;
		}
	});
});



// d10.welcome = new welcome();

// delete welcome;

