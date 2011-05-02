$(document).one("bootstrap:playlist",function() {
	var module = new d10.fn.playlistModule("image",{
		"playlist:currentSongChanged": function() {
			var s = d10.playlist.current();
			var images = s.attr("data-images");
			if ( images && images.length ) {
				var alreadyVisible = $("#side > .audioImage").find("img").length;
				var image = images.split(",").shift();
				$("#side > .audioImage").html(
					"<img src=\""+d10.config.img_root+"/"+image+"\">"
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

	d10.playlist.modules[module.name] = module;

});

