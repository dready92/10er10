define(["js/config"], function(config) {
  var splitFileAndExtension = function(filename) {
    var dotIndex = filename.lastIndexOf(".");
    if ( dotIndex < 0 ) {
      return false;
    }
    return {
      name: filename.substr(0,dotIndex),
      extension: filename.substr( (dotIndex+1) )
    };
  };
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
	},
    getAlternateFileName: function(filename, size) {
      var targetFileAndExtension = splitFileAndExtension(filename);
      if ( !targetFileAndExtension ) {
        return false;
      }
      // somefile.250x245.jpg
      var targetfileName = targetFileAndExtension.name+
                          "."+
                          size.width+"x"+size.height+
                          "."+targetFileAndExtension.extension;
      return targetfileName;
    }
	};
});
