(function($){

/*
 * manage the playback of playlist playlist
 * params:
 * - playlist : the playlist doc
 * - ui : the playlist interface
 * - options: optionnal parameter object
 * 

deprecates: 
$(document).trigger('player.mainTimeUpdate',{'currentTime': secs, 'duration': dur }	);
*/



d10.playlistDrivers = d10.playlistDrivers || {};
d10.playlistDrivers.default = function(options) {
	var settings = $.extend({fade: 15,prefectchMinStartupTime: 29},options),
	var playlist = d10.playlist;
	var current = null; // current playing track
	var next = null; // next track
	var currentLoadProgressEnded = false;
	var cache = {};
	var events = {};
	
	var bind = this.bind = function(e,callback) {
		if( events[e] ) events[e].push(callback);
		else			events[e] = [callback];
	};
	
	var trigger = this.trigger = function(e,data) {
		if ( !events[e] )	return ;
		$.each(events[e],function(i,callback) {
			try {
				callback(data);
			} catch(Exception e) {
			}
		});
	};
	
	var unbindAll = this.unbindAll = function() {
		events = {};
	};
	
	var createTrack = function(id,url,duration,options) {
		return new track(id, url,duration ,{
			"ontimeupdate":function() {
				if ( this === current ) {
					var secs = Math.floor(this.currentTime);
					if ( secs == this.last_secs_update ) {return true;}
					this.last_secs_update = secs;
					var dur = Math.floor(this.duration);
					trigger('currentTimeUpdate',{'currentTime': secs, 'duration': dur }	);
					if ( secs > settings. prefectchMinStartupTime && secs % 8 == 0 ) { optimistPrefetch(); }
					if ( fade > 0 && !isNaN(dur) && dur > 0 && dur - secs == fade ) {
						beginFade();
					}
				}
			},
			"oncanplaythrough":function() {
				if ( this.id == current ) {
					trigger("currentLoadProgress", {track:current});
					currentLoadProgressEnded = true;
					// 						$(document).trigger('player.currentSongProgress', {'progress': { 'lengthComputable': true,'total': 1, 'loaded':1}  }  );
				}
			},
			"onended": function() {
				// 					$(document).trigger('audioEnded', {'id': this.id }  );
				if ( this !=== current ) {	return false; }
				trigger("ended",{});
				var nextWidget = playlist.next();
				if ( nextWidget.length ) {
					play.apply(this,playlist.getTrackParameters(nextWidget));
				} else {
					current = null;
					next = null;
					currentLoadProgressEnded = false;
				}
			},
			"onprogressUpdate": function(e) {
				if ( currentLoadProgressEnded )	return ;
				if ( this === current ) {
					if ( this.networkState == this.NETWORK_IDLE && this.readyState == this.HAVE_ENOUGH_DATA )  {
						currentLoadProgressEnded = true;
						// 							$(document).trigger('player.currentSongProgress', {'progress': { 'lengthComputable': true,'total': 1, 'loaded':1}  }  );
						// 							return ;
					}
					trigger("currentLoadProgress", {track:current});
					
					// 						$(document).trigger('player.currentSongProgress', {'progress': { 'lengthComputable': true,'total': 100, 'loaded': getAudio(this.id).track.getProgressPC()} }  );
				}
			}
		});
	};
	
	var optimistPrefetch = function() {
		//debug("oPrefetch on id");
		if ( !current )	return ;
		if (  current.audio.readyState < current.audio.HAVE_ENOUGH_DATA ) {
			return;
		}
		var nextWidget = playlist.next();
		if ( nextWidget.length ) {
			infos = playlist.getTrackParameters(nextWidget);
			if ( cache[infos[0]] )	return ;
			cache[id] = createTrack.apply(this,infos));
			next = cache[id];
		}
		debug("starting prefetch of "+id+" at "+current.audio.currentTime+" s");
		createAudio(nextone);
	}
	
	var removeFromCache(id) {
		var track = null;
		if ( typeof id == "string" ) {
			track = cache[id];
		} else if (id === null ) {
			return ;
		} else {
			track = id;
			id = track.id;
			track.destroy();
			delete cache[id];
		}
	};
	
	var beginFade = function () {
		debug("fade algorithm begins");
		var secs = settings.fade;
		if ( !next ) {
			debug("no way to fade: next song doesn't exist");
			return ;
		}
		var d_id = ;
		if ( !next.fadeIn(secs) ) {
			debug('Fade In startup failed');
			return ;
		}
		current.fadeOut(secs);

		var previous = current;
		current = next;
		next = null;
		trigger('currentSongChanged',{'previous': previous, 'current': current});
	}
	
	var play = this.play = function(id,url,duration,options) {
		if ( !cache[id] ) {
			cache[id] = createTrack(id,url,duration,options);
		}
		
		if ( cache[id] === current && !cache[id].audio.paused ) return ;
		

// 			debug("using cached audio");
		current = cache[id];
		current.audio.cacheTimestamp = new Date().getTime();
		if ( current.audio.currentTime != 0 ) {
			try { 
				current.audio.currentTime=0;
			} catch (e) {
				removeFromCache(current.id);
				var widget = playlist.songWidget(current.id);
				current = null;
				currentLoadProgressEnded = false;
				next = null;
				if( widget.length ) {
					return play.apply(this, playlist.getTrackParameters(widget));
				}
				return false;
			}
		}
		current.audio.volume = $('body').data('volume');
		current.audio.play();
	// 			current_id = audio.track.audio.id;
	// 			$(document).trigger('player.currentSongChanged',eventData);
		trigger("currentSongChanged",{current: current});
		return true;
	};

	var pause = this.pause = function() {
		$.each(cache,function(i,track) {
			track.audio.pause();
		});
		return true;
	};

	var resume = this.resume = function() {
		if ( current )	{
			current.play();
			if ( current.paused )	return false;
			return true;
		} else {
			return false;
		}
	};
	var resumeOrPlay = this.resumeOrPlay = function(infos) {
		if ( current && current.id == infos[0] ) {
			return resume();
		}	else	{
			return play.apply(this,infos);
		}
	};
	
	this.current = function() { return current };
	var playing = this.playing = function() {
		var back = [];
		$.each(cache,function(i,e) {
			if ( e.audio.paused === false )	back.push(e);	
		});
		return e;
	};

	var currentLoadProgress = this.currentLoadProgress = function() {
		if ( currentLoadProgressEnded )	return 100;
		else	return current.getProgressPC();
	};
	var volume = this.volume = function(vol) {
		if ( vol < 0 || vol > 1 ) 	return false;
		$.each(cache,function(i,track) {
			if ( !track.isFading() ) {
				track.audio.volume = vol;
			}
		});
	};
	
	var seek = this.seek = function(secs) {
		if ( current )	current.seek(secs);
	};
	
	var load = this.load = function(doc, options) {
		if ( options.purge ) {
			$.each(cache,function(i,track) {
				track.destroy();
				cache[i] = null;
			});
			cache = {};
			current = null;
			next = null;
			currentLoadProgressEnded = false;
		}
	};
	
	var writable = this.writable = function() {
		// d'n'd allowed
		return true;
	};
};

})(jQuery);
