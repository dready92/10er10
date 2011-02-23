(function($){

var module = {
	name: "controls",
	events: {
		currentSongChanged: function() {
			play.hide();
			pause.show();
		},
		ended: function() {
			pause.hide();
			play.show();
		}
	},
	enable: function() {},
	disable: function(){}
};



var ui,play,pause,next,prev;

$(document).ready(function() {
	ui = $("#controls");
	play = ui.find('img[name=play]');
	pause = ui.find('img[name=pause]');
	next = ui.find('img[name=next]');
	prev = ui.find('img[name=previous]');
	play.bind("click",function() {
		var widget = d10.playlist.current(),
			track = d10.playlist.driver().current();
		if ( widget.length ) {
			if ( !track ) {
				d10.playlist.driver().play( d10.playlist.getTrackParameters( widget ));
			} else {
				var ok = d10.playlist.resume();
				if ( ok ) {
					module.events.currentSongChanged.call(this);
				}
			}
		} else {
			var first = d10.playlist.all().eq(0);
			if ( first.length ) {
				d10.playlist.driver().play( first );
			}
		}
	});

	pause.bind("click",function() {
		var ok = d10.playlist.pause();
		if ( ok ) {
			pause.hide();
			play.show();
		};
	});

	next.bind("click",function() {
		var widget = d10.playlist.current().next();
		if ( widget.length ) {
			d10.playlist.driver().play( d10.playlist.getTrackParameters(widget) );
		}
	});
	
	prev.bind("click",function() {
                var widget = d10.playlist.current().prev();
                if ( widget.length ) {
                        d10.playlist.driver().play( d10.playlist.getTrackParameters(widget) );
                }
        });
});


d10.fn.playlistModules = d10.fn.playlistModules || {};
d10.fn.playlistModules.controls = function()  {
        return module;
};

})(jQuery);



})(jQuery);
