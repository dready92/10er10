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
		fade: function() { 
          var af = user.get_preferences().audioFade;
          if ( isNaN(af) || af < 0 ) {
            return 15;
          }
          return af;
        },
		prefectchMinStartupTime: 9,
        prefetchInterval: 5,
		title: tpl.mustacheView("playlist.anonymous.name")
	},options);
	var current = null; // current playing track
	var next = null; // next track
	var currentLoadProgressEnded = false;
	var last = null;
    var inTheMix = false;
	var trackEvents = this.trackEvents = {
						"progressUpdate": function(e) {
							if ( currentLoadProgressEnded ) return ;
							if ( current && this === current.audio ) {
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
											this.prefetchStart = secs + settings.prefetchInterval;
										}
//                                         if ( secs > settings. prefectchMinStartupTime && secs % 8 == 0 ) { optimistPrefetch(); }
										var fade = settings.fade();
                                        if ( fade > 0 && !isNaN(dur) && dur > 0 && dur - secs == fade && !inTheMix ) {
                                                beginFade(createDefaultMix());
                                        }
                                }
                                
                        },
                        "canplaythrough":function() {
                                if ( current && this === current.audio ) {
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
                                  flipNextToCurrent();
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

	var updatePrefetchStartupTime = function() {
		settings.prefectchMinStartupTime = settings.fade() + 2;
	};

	var getNextId = function() {
		var widget = playlist.next();
		if ( widget.length )	return playlist.songId(widget);
		return false;
	};
	
	var createTrack = function(id,url,duration,options) {
		options = options || {};
        options.volume = user.get_volume();
		$.each(allEvents,function(i,e) {
			debug("binding track evt on topic ",e);
			options[e] = pubsub.topic(e).publish;
		});
		return new track(id, url,duration , options);
	};

	var optimistPrefetch = function() {
		//debug("oPrefetch on id");
		if ( !current )	return ;
        if ( inTheMix ) return ;
        debug("optimistPrefetch: ",current.getProgressPC(),"% and ",current.audio.readyState, "< ",current.audio.HAVE_ENOUGH_DATA);
		if (  current.getProgressPC() < 70 || current.audio.readyState < current.audio.HAVE_ENOUGH_DATA ) {
			return;
		}
		debug("playlistDriverDefault:optimistPrefetch");
		var nextWidget = playlist.next();
		if ( nextWidget.length ) {
			var infos = playlist.getTrackParameters(nextWidget);
            if ( next && next.id == infos[0] ) {
              debug("Already in cache, readyState = ",next.audio.readyState, ", percentLoaded = ",next.getProgressPC());
              if ( next.audio.readyState >= current.audio.HAVE_ENOUGH_DATA ) {
                pubsub.topic("nextSongPreloaded").publish();
              }
              return ;
            }
            debug(infos);
            infos[3] = infos[3] || {};
            infos[3].onCreated = function(track) {
              if ( next ) {
                next.destroy();
              }
              next = track;
              debug("starting prefetch of "+infos[0]+" at "+current.audio.currentTime+" s");
            };
            debug(infos);
			createTrack.apply(this,infos);
		}
	}

    var createDefaultMix = function() {
      var secs = settings.fade();
      var mixSteps = [];
      mixSteps.push(
        new mix.mixStep("currentTrack", 0, secs,"volume",0)
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
      if ( !nextId  ) {
        debug("no way to fade: no next song");
        return false;
      }
      if ( !next || next.id != nextId ) {
        return false;
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
      inTheMix = fadeMix;
      
      if ( fadeMix.start(current.audio, next.audio, function() { inTheMix = false; onFadeEnded();}) ) {
        var previous = current;
        flipNextToCurrent();
        trigger("currentSongChanged",{previous: previous, current: current});
        updatePrefetchStartupTime();
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
          return play(id.shift(),id.shift(),id.shift(),id.shift());
		}
		debug("playlistDriverDefault:play",arguments);
		if ( !current || current.id != id ) {
          if ( next && next.id == id ) {
            flipNextToCurrent();
            return play(id,url,duration,options);
          } else {
            if ( current ) {
              flipNextToCurrent();
            }
            options = options || {};
            options.onCreated = function(track) {
              if ( current ) {
                flipCurrentToLast();
              }
              current = track;
              play(id,url,duration,options);
            };
            return createTrack(id,url,duration,options);
          }
        }
		debug("playlistDriverDefault:play track",current);
		current.audio.pause();
		if ( current.audio.currentTime != 0 ) {
          try {
            current.audio.currentTime=0;
          } catch (e) {
            current.destroy();
            var widget = playlist.songWidget(current.id);
            current = null;
            currentLoadProgressEnded = false;
            if( widget.length ) {
              return play.apply(this, playlist.getTrackParameters(widget));
            }
            return false;
          }
		}
		current.audio.volume = user.get_volume();
		current.audio.play();
		debug("playlistDriverDefault:play called play() on audio element : ",current.audio);
		
		// FF bug: sometimes audio play again and have audio/paused == true...
        if ( next ) { next.audio.pause(); }
        if ( last ) { last.audio.pause(); }
		trigger("currentSongChanged",{current: current});
		updatePrefetchStartupTime();
		return true;
	};

	var pause = this.pause = function() {
      [last, current, next].forEach(function(track) {
        if ( track && "audio" in track ) {
          track.audio.pause();
        }
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

  var destroyLast = function () {
    debug("playlistDriverDefault: detroying last: ",last);
    if ( last && last !== null && "destroy" in last ) {
      last.destroy();
    }
  };

  var flipNextToCurrent = function() {
    flipCurrentToLast();
    current = next;
    next = null;
  };

  var flipCurrentToLast = function() {
    destroyLast();
    last = current;
    current = null;
  };
  
  
	this.current = function(track) { 
		if ( arguments.length ) {
            flipCurrentToLast();
			current = track;
			return this;
		}
		return current;
	};
	var playing = this.playing = function() {
      if  (current && current.paused != false ) {
        return current;
      }
	};

	var currentLoadProgress = this.currentLoadProgress = function() {
		if ( currentLoadProgressEnded )	return 100;
		else	return current.getProgressPC();
	};
	var volume = this.volume = function(vol) {
      if ( vol < 0 || vol > 1 ) 	return false;
      [last, current, next].forEach(function(track) {
        if ( track && "audio" in track ) {
          if ( !track.fading() ) {
            track.audio.volume = vol;
          }
        }
      });
	};
	
	var seek = this.seek = function(secs) {
		if ( current )	current.seek(secs);
	};

	var writable = this.writable = function() {
		return true;
	};

	var subscribedEvents = [];
	
	var enable = this.enable = function(previousDriver) {
		if ( previousDriver ) {
			var track = previousDriver.current();
// 			debug("driver try to get back current song : ",track);
			if ( track && track.audio && track.audio.paused === false ) {
              flipCurrentToLast();
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
			return ;
		}
		
		var checkNext = function() {
			var nextWidget = widget.next();
			if ( !nextWidget.length ) {
              if (next) {
                next.destroy();
              }
              next = null;
              return ;
			}
			var uid = playlist.songId(nextWidget);
			if ( next != null && uid != next.id ) {
				next.destroy();
                next = null;
			}
		};
		
		debug("playlistDriverDefault list modified event: ",e);
		// check widget of current track
		var widget = playlist.current();
		if ( !widget.length ) {
			pause();
            flipCurrentToLast();
            if ( next ) {
              next.destroy();
            }
			next = null;
			return ;
		}
		var uid = playlist.songId(widget);
		if ( current ) {
			if ( uid != current.id ) {
				pause();
                flipCurrentToLast();
				play.apply(this, playlist.getTrackParameters(widget));
			}
		} else {
			pause();
			play.apply(this, playlist.getTrackParameters(widget));
		}
		checkNext();
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
