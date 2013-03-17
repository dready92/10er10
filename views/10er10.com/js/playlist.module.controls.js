define(["js/playlist", "js/d10.playlistModule", "js/user", "js/d10.rest", "js/d10.events"],
       function(playlist, playlistModule, user, rest, pubsub) {
	
	
var createModule = function(ui) {	

	var module = new playlistModule("controls",{
		"playlist:currentSongChanged": function() {
			play.hide();
			pause.show();
			starringControls();
		},
		"playlist:ended": function() {
			pause.hide();
			play.show();
		}
	},{});
    
    pubsub.topic('songStarring').subscribe(function(resp) { 
      starringUpdated(resp.id, resp.star);
    });
    
	var starringControls = function () {
		// test if user likes this song
		starUp.removeClass('littletrans');
		starDown.removeClass('littletrans');
		var id = playlist.current().attr('name');
		var upref = user.get_preferences();
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
		rest.song.starring.set(id, type, {
			load: function(err,resp) {
				if ( !err ) {
                  user.refresh_infos(function() {
                    pubsub.topic('songStarring').publish(resp);
                  });
				}
			}
		});
	};

	var starringUpdated = function (id,star) {
			var current_id = playlist.current().attr('name');
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


	var play,pause,next,prev,starUp,starDown;

	play = ui.find('img[name=play]');
	pause = ui.find('img[name=pause]');
	next = ui.find('img[name=next]');
	prev = ui.find('img[name=previous]');
	starUp = ui.find('img[name=likes]');
	starDown = ui.find('img[name=dislikes]');
	play.bind("click",function() {
// 		debug("click on play",binder.enabled);
		if ( !module.isEnabled() )	return ;
		var widget = playlist.current(),
			track = playlist.driver().current();
		if ( widget.length ) {
			if ( !track ) {
				playlist.driver().play( playlist.getTrackParameters( widget ));
			} else {
				var ok = playlist.resume();
				if ( ok ) {
					play.hide();
					pause.show();
// 					starringControls();
				}
			}
		} else {
// 			debug("playlist all",playlist.all());
			var first = playlist.all().eq(0);
			if ( first.length ) {
				playlist.driver().play( playlist.getTrackParameters(first) );
			}
		}
	});

	pause.bind("click",function() {
		if ( !module.isEnabled() )	return ;
		var ok = playlist.pause();
		if ( ok ) {
			pause.hide();
			play.show();
		};
	});

	next.bind("click",function() {
		if ( !module.isEnabled() )	return ;
		debug("calling next");
		var widget = playlist.current().next();
		debug("next: playlist: ", playlist.current(),", next = ",widget);
		if ( widget.length ) {
			playlist.driver().play( playlist.getTrackParameters(widget) );
		}
	});

	prev.bind("click",function() {
		if ( !module.isEnabled() )	return ;
		var widget = playlist.current().prev();
		if ( widget.length ) {
				playlist.driver().play( playlist.getTrackParameters(widget) );
		}
	});
	starUp.click(function() {
		if ( !module.isEnabled() )	return ;
		var test = playlist.current().attr('name');
		if ( test ) handleStarring('likes',test);
	});
	starDown.click(function() {
		if ( !module.isEnabled() )	return ;
		var test = playlist.current().attr('name');
		if ( test ) handleStarring('dislikes',test);
	});
	return module;
};


	var mod = createModule($("#player"));

	playlist.modules[mod.name] = mod;
	
	return mod;
});
