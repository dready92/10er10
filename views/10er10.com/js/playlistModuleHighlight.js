$(document).one("bootstrap:playlist",function() {

	if ( $("html").hasClass("csstransforms") ) {
		var module = new d10.fn.playlistModule("highlight",{
			"playlistUpdate": function() {
				var ui = d10.playlist.container();
				ui.one("transitionend webkitTransitionEnd",function() {
// 					debug("got transitionend");
					ui.unbind("transitionend webkitTransitionEnd");
					ui.removeClass("highlighted");
				});
				ui.addClass("highlighted");
			}
		},{});

		d10.playlist.modules[module.name] = module;
	}
});

