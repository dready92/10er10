define(["js/domReady","js/d10.playlistModule", "js/playlist.new", "js/d10.imageUtils"], function(foo, playlistModule, playlist, imageUtils) {
	var module = new playlistModule("image",{
		"playlist:currentSongChanged": function() {
			var s = playlist.current();
			var images = s.attr("data-images");
			if ( images && images.length ) {
				var alreadyVisible = $("#side > .audioImage").find("img").length;
				var image = images.split(",").shift();
				$("#side > .audioImage").html(
					"<img src=\""+imageUtils.getImageUrl(image)+"\">"
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

