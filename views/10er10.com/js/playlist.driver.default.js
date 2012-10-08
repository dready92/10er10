define(["js/d10.rest",
       "js/d10.eventEmitter",
       "js/track",
       "js/d10.templates", 
       "js/d10.events", 
       "js/user",
       "js/d10.mix"
       ],
	   function(rest, eventEmitterDef, track, tpl, pubsub, user, mix) {

/*

events binding :

1/ audio [all events] bound to proxyHandler
2/ proxyHandler calling CURRENT driver's handleEvent
3/ current driver calling this.trigger to feedback to the playlist 

*/

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


function playlistDriverDefault (playlist, proxyHandler, options) {
	options = options || {};
	var settings = $.extend({
		fade: (function() {
					var body = $("body");
					return function() { return user.get_preferences().audioFade ? user.get_preferences().audioFade : 15 }
		})(),
		prefectchMinStartupTime: 9,
		title: tpl.mustacheView("playlist.anonymous.name")
	},options);
	var current = null; // current playing track
	var next = null; // next track
	var currentLoadProgressEnded = false;
	var cache = {};
    var inTheMix = false;
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
                                        if ( fade > 0 && !isNaN(dur) && dur > 0 && dur - secs == fade && !inTheMix ) {
                                                beginFade(createDefaultMix());
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
                                // do not return false it breaks playback
                                if ( !current || ! current.audio || this !== current.audio ) {  return ; }
                                if ( inTheMix ) { return ; }
                                var nextWidget = playlist.next();
                                if ( nextWidget.length ) {
                                        play(playlist.getTrackParameters(nextWidget));
                                } else {
                                        current = null;
                                        next = null;
                                        currentLoadProgressEnded = false;
                                        trigger("ended",{});
                                        debug("playlistDriverDefault:onended playlist: ",playlist);
                                }
                        }
                };
	
	
	var eventEmitter = new eventEmitterDef();
	var bind = this.bind = eventEmitter.bind;
	var trigger = this.trigger = eventEmitter.trigger;
	var unbind = this.unbind = eventEmitter.unbind;
	var unbindAll = this.unbindAll = eventEmitter.unbindAll;

	/*
	 * called when this class is the driver , "this" = <audio> element, e = event
	 */
	/*
	var handleEvent = this.handleEvent = function(e) {
		if ( trackEvents[e.type] ) {
			trackEvents[e.type].apply(this,arguments);
		}
	};
	*/

	var getNextId = function() {
		var widget = playlist.next();
		if ( widget.length )	return playlist.songId(widget);
		return false;
	};
	
	var createTrack = function(id,url,duration,options) {
		options = options || {};
		$.each(allEvents,function(i,e) {
			debug("binding track evt on topic ",e);
			options[e] = pubsub.topic(e).publish;
			/*
			(function(e) {
				options[e] = function() {
// 					debug("got event ",e,this,arguments);
					pubsub.topic(e).publish.apply(this,arguments);
				}
			})(e);
		*/
		});
		return new track(id, url,duration , options);
	};

	var optimistPrefetch = function() {
		//debug("oPrefetch on id");
		if ( !current )	return ;
        debug("optimistPrefetch: ",current.getProgressPC(),"% and ",current.audio.readyState, "< ",current.audio.HAVE_ENOUGH_DATA);
		if (  current.getProgressPC() < 70 || current.audio.readyState < current.audio.HAVE_ENOUGH_DATA ) {
			return;
		}
		debug("playlistDriverDefault:optimistPrefetch");
		var nextWidget = playlist.next();
		if ( nextWidget.length ) {
			var infos = playlist.getTrackParameters(nextWidget);
			if ( cache[infos[0]] ) {
              debug("Already in cache, readyState = ",cache[infos[0]].audio.readyState);
              if ( cache[infos[0]].audio.readyState >= current.audio.HAVE_ENOUGH_DATA ) {
                pubsub.topic("nextSongPreloaded").publish();
              }
              return ;
            }
			cache[infos[0]] = createTrack.apply(this,infos);
			next = cache[infos[0]];
			debug("starting prefetch of "+infos[0]+" at "+current.audio.currentTime+" s");
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
    
    var createDefaultMix = function() {
      var secs = settings.fade();
      var mixSteps = [];
      mixSteps.push(
        new mix.mixStep("currentTrack", (secs/3), (secs/2),"volume",0)
              );
      mixSteps.push(
        new mix.mixStep("nextTrack", 1, secs, "volume",
                        mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
                        {propertyStartValue: 0, startPlaybackOnBegin: true}
                      )
              );
      var m = new mix.mix([], mixSteps);
      return m;
    };

    var doesNextExists = function() {
      var nextId = getNextId();
      if ( !nextId || ! cache[nextId] ) {
          if ( !nextId ) {
              debug("no way to fade: no next song");
          }else{
              debug("no way to fade: track not in cache",nextId,cache);
          }
          return false;
      }
      if ( !next || next.id != nextId ) {
          next = cache[nextId];
      }
      return true;
    };
    
    var isNextPreloaded = this.isNextPreloaded = function() {
      if ( !doesNextExists() ) {
        return false;
      }
      if ( next.audio.readyState < next.audio.HAVE_ENOUGH_DATA ) {
        return false;
      }
      return true;
    };
    
    var launchMix = this.launchMix = function(fadeMix, onFadeEnded) {
      if ( !isNextPreloaded() ) {
        debug("Next song isn't preloaded");
        return false;
      }
      onFadeEnded = onFadeEnded || function(){};
      inTheMix = true;
      
      if ( fadeMix.start(current.audio, next.audio, function() { inTheMix = false; onFadeEnded();}) ) {
        var previous = current;
        current = next;
        next = null;
        trigger("currentSongChanged",{previous: previous, current: current});
      } else {
        inTheMix = false;
        return false;
      }
      return true;
    };
    
    
    var beginFade = this.beginFade = function (fadeMix) {
      debug("Mix fade algorithm begins");
      if ( !doesNextExists() ) {
        return false;
      }
      if ( next.audio.readyState  < next.audio.HAVE_ENOUGH_DATA ) {
        debug("Not enough data on next track to fade");
        return false;
      }
      var state = {current: current.id, next: next.id};
      fadeMix.load(function() {
        if ( !next || current.id != state.current || next.id != state.next ) {
          // current and|or next song changed between mix loading and now
          debug("song changed between load and start mix",state, next, current.id, next.id);
          return ;
        }
        launchMix(fadeMix);
      });
      return true;
    };
	
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
		debug("playlistDriverDefault:play called play() on audio element : ",current.audio);
		
		// FF bug: sometimes audio play again and have audio/paused == true...
		for ( var i in cache ) {
			if ( cache[i] != current ) {
				debug("calling pause on",i,cache[i].audio.paused);
				cache[i].audio.pause();
			}
		}
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

	var subscribedEvents = [];
	
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
		playlist.title(settings.title);
		for ( var e in trackEvents ) {
			(function(e) {
				var callback = function() { trackEvents[e].apply(this,arguments); },
				topic = "on"+e;
				subscribedEvents.push( {topic: topic, callback: callback } );
				debug("subscribing to topic ",topic);
				pubsub.topic(topic).subscribe(callback);
			})(e);
		}
	};

	var disable = this.disable = function() {
		var handle;
		while ( handle = subscribedEvents.pop() ) {
			pubsub.topic(handle.topic).unsubscribe(handle.callback);
		};
	};

	this.listModified = function(e) {
		
		if ( playlist.allIds().length == 0 ) {
			cacheEmpty(true);
			return ;
		}
		
		var checkNext = function() {
			var nextWidget = widget.next();
			if ( !nextWidget.length ) {
				next = null;
				return ;
			}
			var uid = playlist.songId(nextWidget);
			if ( next == null || uid != next.id ) {
				next = cache[uid] ? cache[uid] : null;
			}
		};
		
		debug("playlistDriverDefault list modified event: ",e);
		// check widget of current track
		var widget = playlist.current();
		if ( !widget.length ) {
			pause();
			current = null;
			next = null;
			return ;
		}
		var uid = playlist.songId(widget);
		if ( current ) {
			if ( uid != current.id ) {
				pause();
				current = null;
				play.apply(this, playlist.getTrackParameters(widget));
			}
		} else {
			pause();
			play.apply(this, playlist.getTrackParameters(widget));
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
		rest.user.playerList.default.store(playlist.allIds(),{});
	};
	
	this.load = function(options,cb) {
		debug("playlistDriverDefault load: ",options);
		playlist.title(settings.title);
		if ( !options ) {
			return cb.call(this);
		}
		if ( !options.list || !options.list.length ) {
			return cb.call(this);
		}
// 		debug("posting...");
		var self = this;
		rest.song.get(options.list, {
			load: function(err,resp) {
				if ( err ) {
					debug("load error: ",err,resp);
					cb.call(self,err);
				} else {
					var html = "";
					$.each(resp,function(i,song) {
						if ( song ) {
							html+=tpl.song_template(song);
						}
					});
					if ( html.length ) {
						cb.call(self,null,$(html));
					} else {
						cb.call(self);
					}
				}
			}
		});
	};
	
};

return playlistDriverDefault;

});
