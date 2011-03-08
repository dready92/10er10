$(document).one("bootstrap:playlist",function() {
	var widget= $("header div.playing");

	var updatePlayingHeader = function (song) {
		if ( !song ) {
		  widget.fadeOut("fast");
		  return ;
		}
		var s = song.clone();
		    if ( $("html").hasClass("csstransitions") && widget.is(":visible") ) {
		            debug("trying css transform trick");
		            var buffer = $("<div></div>");
		            buffer.html($(".title",s)).append(" (").append($(".length",s)).append(")")
		            .append("<br>").append($(".artist",s)).append(" - ").append($(".album",s))
		            widget.addClass("small");
		            setTimeout(function() {
		                    widget.html(buffer.html())
		                    .removeClass("small");
		            }, 500);
		            return ;
		    }

		widget.html($(".title",s)).append(" (").append($(".length",s)).append(")")
		  .append("<br>").append($(".artist",s)).append(" - ").append($(".album",s));
		if ( widget.not(":visible") ) {
		  widget.fadeIn("fast");
		}
	  };

	var module = new d10.fn.playlistModule("topinfos",{
			"playlist:currentSongChanged": function() {
				updatePlayingHeader(d10.playlist.current());
			},
			"playlist:ended": function() {
				updatePlayingHeader();
			}
		},{});

	d10.playlist.modules[module.name] = module;

});
