(function($){

/*

events binding :

1/ audio [all events] bound to proxyHandler
2/ proxyHandler calling CURRENT driver's handleEvent
3/ current driver calling this.trigger to feedback to the playlist 

*/

var proxyHandler = function() {
// 	debug("proxyHandler: ",d10.playlist.currentDriverName() , this,arguments);
	d10.playlist.driver().handleEvent.apply(this,arguments);
};

var allEvents = [
"onloadstart",
"onprogress",
"onsuspend",
"onabort",
"onerror",
"onemptied",
"onstalled",
"onplay",
"onpause",
"onloadedmetadata",
"onloadeddata",
"onwaiting",
"onplaying",
"oncanplay",
"oncanplaytrough",
"onseeking",
"onseeked",
"ontimeupdate",
"onended",
"onratechange",
"ondurationchange",
"onvolumechange",
"onprogressUpdate"
];


d10.playlistDrivers = d10.playlistDrivers || {};
d10.playlistDrivers.default = function(options) {
	options = options || {};
	var settings = $.extend({
		fade: (function() {
					var body = $("body");
					return function() { return body.data("audioFade") }
		})(),
		prefectchMinStartupTime: 9,
		title: d10.mustacheView("playlist.anonymous.name")
	},options);
// 	var playlist = d10.playlist;
	var current = null; // current playing track
	var next = null; // next track
	var currentLoadProgressEnded = false;
	var cache = {};
	this.fadeSettings = {
		source_duration: settings.fade(),
		source_startup:  - settings.fade(),
		target_duration: 10,
		target_startup: - 10,
		target_starttime: 0
	};
//	var events = {};
// 	var modules = [];
	var trackEvents = this.trackEvents = {
						"progressUpdate": function(e) {
							if ( currentLoadProgressEnded ) return ;
							if ( this === current.audio ) {
								if ( this.networkState == this.NETWORK_IDLE && this.readyState == this.HAVE_ENOUGH_DATA )  {
									currentLoadProgressEnded = true;
									//                                                      $(document).trigger('player.currentSongProgress', {'progress': { 'lengthComputable': true,'total': 1, 'loaded':1}  }  );
									//                                                      return ;
								}
								trigger("currentLoadProgress", {track:current});
								
								//                                              $(document).trigger('player.currentSongProgress', {'progress': { 'lengthComputable': true,'total': 100, 'loaded': getAudio(this.id).track.getProgressPC()} }  );
							}
						},
                        "timeupdate":function() {
//                              debug("playlistDriverDefault:ontimeupdate",this);
                                if ( current && this === current.audio ) {
                                        var secs = Math.floor(this.currentTime);
										var dur = current.duration;
                                        if ( secs == this.last_secs_update ) {return true;}
                                        this.last_secs_update = secs;
                                        trigger('currentTimeUpdate',{currentTime: secs});
										if ( !this.prefetchStart ) {
											this.prefetchStart = secs + settings.prefectchMinStartupTime;
										} else if ( this.prefetchStart == secs ) {
											optimistPrefetch();
											this.prefetchStart = secs + settings.prefectchMinStartupTime;
										}
//                                         if ( secs > settings. prefectchMinStartupTime && secs % 8 == 0 ) { optimistPrefetch(); }
										var fade = settings.fade();
                                        if ( fade > 0 && !isNaN(dur) && dur > 0 && dur - secs == fade ) {
                                                beginFade();
                                        }
                                }
                        },
                        "canplaythrough":function() {
                                if ( this === current.audio ) {
                                        trigger("currentLoadProgress", {track:current});
                                        currentLoadProgressEnded = true;
                                        //                                              $(document).trigger('player.currentSongProgress', {'progress': { 'lengthComputable': true,'total': 1, 'loaded':1}  }  );
                                }
                        },
                        "ended": function() {
                                //                                      $(document).trigger('audioEnded', {'id': this.id }  );
                                if ( !current || ! current.audio || this !== current.audio ) {  return false; }
//                                 trigger("songEnded",{});
                                var nextWidget = d10.playlist.next();
                                if ( nextWidget.length ) {
                                        play(d10.playlist.getTrackParameters(nextWidget));
                                } else {
                                        current = null;
                                        next = null;
                                        currentLoadProgressEnded = false;
                                        trigger("ended",{});
                                        debug("playlistDriverDefault:onended playlist: ",d10.playlist);
                                }
                        }
                };
	
	
	var eventEmitter = d10.fn.eventEmitter();
	var bind = this.bind = eventEmitter.bind;
	var trigger = this.trigger = eventEmitter.trigger;
	var unbind = this.unbind = eventEmitter.unbind;
	var unbindAll = this.unbindAll = eventEmitter.unbindAll;

	/*
	 * called when this class is the driver , "this" = <audio> element, e = event
	 */
	var handleEvent = this.handleEvent = function(e) {
		if ( trackEvents[e.type] ) {
			trackEvents[e.type].apply(this,arguments);
		}
	};

	var getNextId = function() {
		var widget = d10.playlist.next();
		if ( widget.length )	return d10.playlist.songId(widget);
		return false;
	};
	
	var createTrack = function(id,url,duration,options) {
		options = options || {};
		$.each(allEvents,function(i,e) {
			options[e] = proxyHandler;
		});
		return new track(id, url,duration , options);
// 		return d10.createDriverTrack(id,url,duration,options);
		
	};

	var optimistPrefetch = function() {
		//debug("oPrefetch on id");
		if ( !current )	return ;
		if (  current.audio.readyState < current.audio.HAVE_ENOUGH_DATA ) {
			return;
		}
		debug("playlistDriverDefault:optimistPrefetch");
		var nextWidget = d10.playlist.next();
		if ( nextWidget.length ) {
			var infos = d10.playlist.getTrackParameters(nextWidget);
			if ( cache[infos[0]] )	return ;
			cache[infos[0]] = createTrack.apply(this,infos);
			next = cache[infos[0]];
			debug("starting prefetch of "+infos[0]+" at "+current.audio.currentTime+" s");
// 			createAudio(nextone);
		}
	}
	
	var removeFromCache=function(id) {
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
		var secs = settings.fade();
		
		var nextId = getNextId();
		if ( !nextId || ! cache[nextId] ) {
			if ( !nextId ) {
				debug("no way to fade: no next song");
			}else{
				debug("no way to fade: track not in cache",nextId,cache);
			}
			return ;
		}
		
		if ( !next || next.id != nextId ) {
			next = cache[nextId];
		}

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
		if ( id && $.isArray(id) ) {
// 			debug("redirectiong play.... ",id,url,duration,options);
			return play(id.shift(),id.shift(),id.shift(),id.shift());
		}
		debug("playlistDriverDefault:play",arguments);
		if ( !cache[id] ) {
			cache[id] = createTrack(id,url,duration,options);
		}
		debug("playlistDriverDefault:play track",cache[id]);
		if ( cache[id] === current && !cache[id].audio.paused ) return ;

		if ( current && cache[id] !== current  )	{
			current.audio.pause();
			current.audio.currentTime = 0;
		}
 
 
 
// 			debug("using cached audio");
		if ( cache[id] !== current ) {
			current = cache[id];
		}
		current.audio.cacheTimestamp = new Date().getTime();
		if ( current.audio.currentTime != 0 ) {
			try { 
				current.audio.currentTime=0;
			} catch (e) {
				removeFromCache(current.id);
				var widget = d10.playlist.songWidget(current.id);
				current = null;
				currentLoadProgressEnded = false;
				next = null;
				if( widget.length ) {
					return play.apply(this, d10.playlist.getTrackParameters(widget));
				}
				return false;
			}
		}
		current.audio.volume = $('body').data('volume');
		current.audio.play();
		debug("playlistDriverDefault:play called play() on audio element : ",current.audio);
		
		// FF bug: sometimes audio play again and have audio/paused == true...
		for ( var i in cache ) {
			if ( cache[i] != current ) {
				debug("calling pause on",i,cache[i].audio.paused);
				cache[i].audio.pause();
			}
		}
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
			current.audio.play();
			if ( current.audio.paused )	return false;
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
	
	this.current = function(track) { 
		if ( arguments.length ) {
			current = track;
			return this;
		}
		return current;
	};
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
			if ( !track.fading() ) {
				track.audio.volume = vol;
			}
		});
	};
	
	var seek = this.seek = function(secs) {
		if ( current )	current.seek(secs);
	};

	var writable = this.writable = function() {
		// d'n'd allowed
		return true;
	};

	var enable = this.enable = function(previousDriver) {
		if ( previousDriver ) {
			var track = previousDriver.current();
// 			debug("driver try to get back current song : ",track);
			if ( track && track.audio && track.audio.paused === false ) {
// 				debug("driver setting track to current");
				cache[track.id] = track;
				current = track;
			}
		}
		d10.playlist.title(settings.title);
	};

	var disable = this.disable = function() {
		
	};

	this.listModified = function(e) {
		
		if ( d10.playlist.allIds().length == 0 ) {
			cacheEmpty(true);
			return ;
		}
		
		var checkNext = function() {
			var nextWidget = widget.next();
			if ( !nextWidget.length ) {
				next = null;
				return ;
			}
			var uid = d10.playlist.songId(nextWidget);
			if ( next == null || uid != next.id ) {
				next = cache[uid] ? cache[uid] : null;
			}
		};
		
		debug("playlistDriverDefault list modified event: ",e);
		// check widget of current track
		var widget = d10.playlist.current();
		if ( !widget.length ) {
			pause();
			current = null;
			next = null;
			return ;
		}
		var uid = d10.playlist.songId(widget);
		if ( current ) {
			if ( uid != current.id ) {
				pause();
				current = null;
				play.apply(this,d10.playlist.getTrackParameters(widget));
			}
		} else {
			pause();
			play.apply(this,d10.playlist.getTrackParameters(widget));
		}
		checkNext();
	};
	
	var cacheGet = this.cacheGet = function(id) {
		return cache[id];
	};
	
	var cacheRemove = this.cacheRemove = function(id) {
		if ( cache[id] )	delete cache[id];
	};
	
	var cacheEmpty = this.cacheEmpty = function(destroyTracks) {
		if ( destroyTracks ) {
			$.each(cache,function(k,track) {
				track.destroy();
			});
		}
		cache = {};
	};
	
	var record = this.record = function() {
		var options = {
			url: site_url+"/api/current_playlist",
			data: {
				list: d10.playlist.allIds(),
				type: "default"
			}
		};
		d10.bghttp.put(options);
		
	};
	
	this.load = function(options,cb) {
// 		var infos = d10.user.get_preferences().playlist;
		debug("playlistDriverDefault load: ",options);
		d10.playlist.title(settings.title);
		if ( !options ) {
			return cb.call(this);
		}
		if ( !options.list || !options.list.length ) {
			return cb.call(this);
		}
// 		debug("posting...");
		var self = this;
		var res = d10.bghttp.post({
			url: site_url+"/api/songs",
			dataType: "json",
			data: { ids: options.list },
			success: function(resp) {
// 				debug("load success: ",resp);
				var html = "";
				$.each(resp.data.songs,function(i,song) {
					html+=d10.song_template(song);
				});
				if ( html.length ) {
					cb.call(self,null,$(html));
				} else {
					cb.call(self);
				}
				
			},
			error: function(e) {
				debug("load error: ",e);
				cb.call(self,e);
			}
		});
// 		debug("posting res: ",res);
	};
	
};

})(jQuery);
