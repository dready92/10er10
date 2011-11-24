define(["js/domReady","js/d10.playlistModule", "js/playlist.new"], function(foo, playlistModule, playlist) {

	if ( $("html").hasClass("csstransforms") ) {
		var module = new playlistModule("highlight",{
			"playlistUpdate": function() {
				var ui = playlist.container();
				ui.one("transitionend webkitTransitionEnd",function() {
// 					debug("got transitionend");
					ui.unbind("transitionend webkitTransitionEnd");
					ui.removeClass("highlighted");
				});
				ui.addClass("highlighted");
			}
		},{});

		playlist.modules[module.name] = module;
		return module;
	}
});

