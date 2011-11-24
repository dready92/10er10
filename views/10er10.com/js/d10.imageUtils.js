define({
	getAlbumDefaultImage: function() {
		var randomnumber=Math.floor(Math.random()*d10.config.img_default.length);
		return d10.config.img_default[randomnumber];
	},
	isImage: function (file) {
		return file.type.match(/^image/);
	},
	getImageRatio: function (width,height) {
		if ( width == 0 || height == 0 ) { return 0; }
		var ratio;
		if ( width > height ) {
			ratio = width / height;
		} else {
			ratio = height / width;
		}
		debug("image ratio : ",ratio);
		return ratio;
	}
});