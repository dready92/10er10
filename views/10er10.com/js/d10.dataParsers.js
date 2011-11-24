define(["js/d10.templates", "js/d10.utils", "js/d10.imageUtils"], function(tpl, toolbox, imageUtils) {
	function singleAlbumParser(songs) {
		var albumData = {duration: 0, songsNb: songs.length, artists: [], genres: [], image_class: [], songs: ""}, artists = {}, genres = {}, duration = 0, images = {};
		songs.forEach(function(row) {
			albumData.album = row.doc.album;
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
			albumData.songs+=tpl.song_template(row.doc);
		});
		for ( var k in artists ) { albumData.artists.push(k); }
		for ( var k in genres ) { albumData.genres.push(k); }
		var d = new Date(1970,1,1,0,0,duration);
		albumData.duration = d.getMinutes()+':'+d.getSeconds();
		albumData.image_url = toolbox.keyOfHighestValue(images);
		if ( albumData.image_url ) { 
			albumData.image_url = d10.config.img_root+"/"+albumData.image_url ;
		} else {
			albumData.image_url = imageUtils.getAlbumDefaultImage();
			albumData.image_class.push("dropbox");
		}
		return albumData;
	};
	return {
		singleAlbumParser: singleAlbumParser
	};
});