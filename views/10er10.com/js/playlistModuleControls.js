$(document).one("bootstrap:playlist",function() {
	
	
var createModule = function(ui) {	

	var module = new d10.fn.playlistModule("controls",{
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
		d10.rest.song.starring.set(id, type, {
			load: function(err,resp) {
				if ( !err ) {
					starringUpdated(resp.id, resp.star);
					d10.user.refresh_infos();
				}
			}
		});
		/*
		
		d10.bghttp.put({
			'url': site_url+'/api/starring/'+type+'/'+id,
			'dataType': 'json',
			'success': function(response) {
// 				debug("response",response);
				starringUpdated(response.data.id, response.data.star);
							d10.user.refresh_infos();
			}
		});
		*/
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


	var play,pause,next,prev,starUp,starDown;

// 	ui = $("#controls");
	play = ui.find('img[name=play]');
	pause = ui.find('img[name=pause]');
	next = ui.find('img[name=next]');
	prev = ui.find('img[name=previous]');
	starUp = ui.find('img[name=likes]');
	starDown = ui.find('img[name=dislikes]');
	play.bind("click",function() {
// 		debug("click on play",binder.enabled);
		if ( !module.isEnabled() )	return ;
		var widget = d10.playlist.current(),
			track = d10.playlist.driver().current();
		if ( widget.length ) {
			if ( !track ) {
				d10.playlist.driver().play( d10.playlist.getTrackParameters( widget ));
			} else {
				var ok = d10.playlist.resume();
				if ( ok ) {
					play.hide();
					pause.show();
// 					starringControls();
				}
			}
		} else {
			debug("playlist all",d10.playlist.all());
			var first = d10.playlist.all().eq(0);
			if ( first.length ) {
				d10.playlist.driver().play( d10.playlist.getTrackParameters(first) );
			}
		}
	});

	pause.bind("click",function() {
		if ( !module.isEnabled() )	return ;
		var ok = d10.playlist.pause();
		if ( ok ) {
			pause.hide();
			play.show();
		};
	});

	next.bind("click",function() {
		if ( !module.isEnabled() )	return ;
		debug("calling next");
		var widget = d10.playlist.current().next();
		debug("next: playlist: ",d10.playlist.current(),", next = ",widget);
		if ( widget.length ) {
			d10.playlist.driver().play( d10.playlist.getTrackParameters(widget) );
		}
	});

	prev.bind("click",function() {
		if ( !module.isEnabled() )	return ;
		var widget = d10.playlist.current().prev();
		if ( widget.length ) {
				d10.playlist.driver().play( d10.playlist.getTrackParameters(widget) );
		}
	});
	starUp.click(function() {
		if ( !module.isEnabled() )	return ;
		var test = d10.playlist.current().attr('name');
		if ( test ) handleStarring('likes',test);
	});
	starDown.click(function() {
		if ( !module.isEnabled() )	return ;
		var test = d10.playlist.current().attr('name');
		if ( test ) handleStarring('dislikes',test);
	});
	return module;
};


var mod = createModule($("#controls"));

d10.playlist.modules[mod.name] = mod;

});
