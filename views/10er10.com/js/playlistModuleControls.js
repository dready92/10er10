(function($){

var module = {
	name: "controls",
	events: {
		currentSongChanged: function() {
			play.hide();
			pause.show();
			starringControls();
		},
		ended: function() {
			pause.hide();
			play.show();
		}
	},
	enable: function() {},
	disable: function(){}
};

var starringControls = function () {
                // test if user likes this song
                starUp.removeClass('littletrans');
                starDown.removeClass('littletrans');
                var id = d10.playlist.current().attr('name');
                var upref = d10.user.get_preferences();
                if ( upref ) {
                        if ( typeof(upref.likes) == 'undefined' || !upref.likes[id] ) {
                                starUp.addClass('littletrans');
                        }
                        if ( typeof(upref.dislikes) == 'undefined' || !upref.dislikes[id] ) {
                                starDown.addClass('littletrans');
                        }
                }
        };

var handleStarring = function ( type, id ) {
                d10.bghttp.put({
			'url': site_url+'/api/starring/'+type+'/'+id,
			'dataType': 'json',
			'success': function(response) {
				starringUpdated(response.id, response.star);
	                        d10.user.refresh_infos();
			}
		});
        };

var starringUpdated = function (id,star) {
                var current_id = d10.playlist.current().attr('name');
                if ( current_id != id ) return ;
                starUp.removeClass('littletrans');
                starDown.removeClass('littletrans');
                if ( star == null ) {
                        starUp.addClass('littletrans');
                        starDown.addClass('littletrans');
                } else if ( star == 'likes' ) {
                        starDown.addClass('littletrans');
                } else if ( star == 'dislikes' ) {
                        starUp.addClass('littletrans');
                }
        };


var ui,play,pause,next,prev,starUp,starDown;

$(document).ready(function() {
	ui = $("#controls");
	play = ui.find('img[name=play]');
	pause = ui.find('img[name=pause]');
	next = ui.find('img[name=next]');
	prev = ui.find('img[name=previous]');
	starUp = ui.find('img[name=likes]');
	starDown = ui.find('img[name=dislikes]');
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
	starUp.click(function() {
                var test = d10.playlist.current().attr('name');
                if ( test ) handleStarring('likes',test);
        });
        starDown.click(function() {
                var test = p.current().attr('name');
                if ( test ) handleStarring('dislikes',test);
        });


/*
	$(document).bind('starringUpdate',function (e, response ) {
                if ( response.status == 'success' && response.data.status == 'success' ) {
                        starringUpdated(response.data.data.id, response.data.data.star);
                        d10.user.refresh_infos();
                }
        });
*/
});


d10.fn.playlistModules = d10.fn.playlistModules || {};
d10.fn.playlistModules.controls = function()  {
        return module;
};

})(jQuery);



})(jQuery);
