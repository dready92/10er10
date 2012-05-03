define(["js/d10.templates", "js/d10.utils", "js/d10.imageUtils"], function(tpl, toolbox, imageUtils) {
	function singleAlbumParser(songs) {
		var albumData = {duration: 0, songsNb: songs.length, artists: [], genres: [], image_class: [], songs: "", e_artists: [], e_genres: [], image_url: null, album: "", date: []}, 
			artists = {}, genres = {}, duration = 0, images = {};
		songs.forEach(function(row) {
			albumData.album = row.doc.album || "";
			artists[row.doc.artist] = 1;
			if ( row.doc.genre ) {
				genres[row.doc.genre] = 1;
			}
			duration+=row.doc.duration;
			if ( row.doc.images ) {
				row.doc.images.forEach(function(i) {
					if ( images[i.filename] ) {
						images[i.filename]++;
					} else {
						images[i.filename]=1;
					}
				});
			}
			if ( row.doc.date ) {
              albumData.date.push(row.doc.date);
            }
			albumData.songs+=tpl.song_template(row.doc);
		});
        albumData.date.sort(function (a, b){  return a - b; });
		for ( var k in artists ) {
			var e = encodeURIComponent(k);
			albumData.artists.push({name: k, encoded: e});
			albumData.e_artists.push( encodeURIComponent( k ) );
		}
		for ( var k in genres ) {
			var e = encodeURIComponent(k);
			albumData.genres.push({name: k, encoded: e}); 
			albumData.e_genres.push( encodeURIComponent( k ) );
		}
		var d = new Date(1970,1,1,0,0,duration),
			h = d.getHours(),
			m = d.getMinutes();
		albumData.minutes = m < 10 ? ["0"+m] : [m] ;
		albumData.hours = [] ;
		if ( h ) {
		  albumData.hours.push(h);
		}
// 		albumData.duration = h ? h+" hour(s) " : "";//d.getMinutes()+':'+d.getSeconds();
// 		albumData.duration += m;
		albumData.image_url = toolbox.keyOfHighestValue(images);
		albumData.e_album = encodeURIComponent(albumData.album);
		if ( albumData.image_url ) { 
			albumData.image_url = imageUtils.getImageUrl(albumData.image_url);
		} else {
			albumData.image_url = imageUtils.getAlbumDefaultImage();
			albumData.image_class.push("dropbox");
		}
		return albumData;
	};
	
	function multiAlbumsParser(songs) {
		var back = [];
		var sap = new streamAlbumParser(function(album) {back.push(album);});
		sap.onData(songs);
		sap.end();
		sap = null;
		return back;
	};
	
    
	function streamAlbumParser (onAlbumComplete) {
		
		var currentAlbumName = null, currentAlbumSongs = [];
		
		this.onData = function(songs) {
			songs.forEach(function(row) {
				var key = row.doc.album ? row.doc.album : "__no_album_name__" ;
				if ( currentAlbumName == key ) {
					return currentAlbumSongs.push(row);
				}
				if ( currentAlbumSongs.length ) {
					onAlbumComplete(singleAlbumParser(currentAlbumSongs));
					currentAlbumSongs = [];
				}
				currentAlbumName = key;
				currentAlbumSongs.push(row);
			});
		};
		
		this.end = function() {
			if ( currentAlbumSongs.length ) {
				onAlbumComplete(singleAlbumParser(currentAlbumSongs));
				currentAlbumSongs = [];
			}
		};
	};
	
	
    
	return {
		singleAlbumParser: singleAlbumParser,
        multiAlbumsParser: multiAlbumsParser,
		streamAlbumParser: streamAlbumParser
	};
});
