define(["js/domReady","js/d10.playlistModule", "js/playlist"], function(foo, playlistModule, playlist) {
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
		            .append("<br>").append($(".artist",s)).append("<span class=\"separator\">&nbsp;-&nbsp;</span>").append($(".album",s))
		            widget.addClass("small");
		            setTimeout(function() {
		                    widget.html(buffer.html())
		                    .removeClass("small");
		            }, 500);
		            return ;
		    }

		widget.html($(".title",s)).append(" (").append($(".length",s)).append(")")
		  .append("<br>").append($(".artist",s)).append("<span class=\"separator\">&nbsp;-&nbsp;</span>").append($(".album",s));
		if ( widget.not(":visible") ) {
		  widget.fadeIn("fast");
		}
	  };

	var module = new playlistModule("topinfos",{
			"playlist:currentSongChanged": function() {
				updatePlayingHeader(playlist.current());
			},
			"playlist:ended": function() {
				updatePlayingHeader();
			}
		},{});

	playlist.modules[module.name] = module;
	return module;
});
