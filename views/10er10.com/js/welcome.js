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
							return then(resp2);
						}
					}
				);
			}
		});
	},
	arrangeLatest = function(latest) {
		var songs = $.map(latest,function(v) { return v.doc });
		var songsByAlbum = {};
		var songsByAlbumMeta = {};
		
		for ( var i in songs ) {
			var album = "__undefined_album__";
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
	};
	
	findLatest(arrangeLatest);
};

})( window.d10 ? window.d10 : {}  , jQuery) ;


$(document).one("bootstrap:router",function() {
	var welcomeRouteHandler = function() { this._activate("main","welcome",this.switchMainContainer); };
	d10.welcome = new d10.fn.welcome($('#welcome'));
	d10.router.route("welcome","welcome",welcomeRouteHandler);
});



// d10.welcome = new welcome();

// delete welcome;

