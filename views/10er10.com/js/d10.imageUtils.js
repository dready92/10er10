define(["js/config"], function(config) {
	return {
	getAlbumDefaultImage: function() {
		var randomnumber=Math.floor(Math.random()*config.img_default.length);
		return config.img_default[randomnumber];
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
	},
	getImageUrl: function(name) {
		return config.img_root+"/"+encodeURIComponent(name);
	}
	};
});
