define(["js/domReady","js/d10.playlistModule", "js/playlist", "js/d10.imageUtils"], function(foo, playlistModule, playlist, imageUtils) {
  
    var getImageUrl = function(images) {
      if ( !images || !images.length ) {
        return false;
      }
      var image = images.split(",").shift();
      return imageUtils.getImageUrl(image);
    };
    
    var getAlternativeImageUrl = function(s) {
      var alternatives = s.data("image-alternatives");
      if ( !alternatives ) {
        return false;
      }
      for (var i in alternatives ) {
        if ( alternatives[i]["250"] ) {
          return imageUtils.getImageUrl(
            imageUtils.getAlternateFileName(i,alternatives[i]["250"])
          );
        }
      }
      for (var i in alternatives ) {
        if ( alternatives[i]["200"] ) {
          return imageUtils.getImageUrl(
            imageUtils.getAlternateFileName(i,alternatives[i]["200"])
          );
        }
      }
    };
  
	var module = new playlistModule("image",{
		"playlist:currentSongChanged": function() {
			var s = playlist.current();
			var images = s.attr("data-images");
            var imageUrl = getAlternativeImageUrl(s);
            if ( !imageUrl ) {
              imageUrl = getImageUrl(images);
            }
			if ( imageUrl ) {
				var alreadyVisible = $("#side > .audioImage").find("img").length;
				$("#side > .audioImage").html(
					"<img src=\""+imageUrl+"\">"
				);
				if ( ! alreadyVisible ) {
					$("#side > .audioImage").slideDown("fast");
				}
			} else {
				$("#side > .audioImage").slideUp("fast",function() {$(this).empty()});
			}
		},
		"playlist:ended": function() {
				$("#side > .audioImage").slideUp("fast",function() {$(this).empty()});
		}
	},{});

	playlist.modules[module.name] = module;
	return module;
});

