define(["js/d10.toolbox", "js/config", "js/d10.events", "js/d10.audioCapabilities"],
       function(toolbox, config, pubsub, audioCapabilities) {

	/**
	* <audio> wrapper
	* params:
	* - id : unique id (not the song id)
	* - url : the urls of resources, as object: {codec: "http://...", [...]}
	* - seconds : the song length in seconds
	* - options : object. Supported options :
	* 		onprogressUpdate: song availability, fired when something changed in the song loading infos
    *       onCreated: if this callback is set, the track will start buffering and then call the callback
    *       volume: set the default volume of the audio file
	*
	* public properties
	* - id : id of the wrapper
	* - audio : the Audio HTML5 Object
	* - duration : the seconds argument exposed
	*
	* public methods
	* - getProgressPC() : get perdentile of file loaded
	* - destroy() : stop immmediately playing, destroy the inderlying <audio>
	* - volume(vol) : ajust volume (vol: float between 0 and 1)
	* - seek(secs) : immediately switch playback to secipied time (secs: destination playback)
	* - fadeOut(secs,callback) : ajust the volume to go from current situation to 0 in sepcified duration (secs: int seconds the fadeOut lasts)
	* - fadeIn(secs,callback) : ajust the volume to go from 0 to preferences volume in sepcified duration, eventually starting the playback
	*					(secs: int seconds the fadeIn lasts)
	* 					return false if the fadeIn can't be started because we don't have enough data
	* 					return id if the fadeIn is started
	* - isFadding(): returns true if the current song is currently fading in or out
	*/



	function track (id, url, seconds, options) {

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
			"onvolumechange"
		];

		var settings = {
			"onprogressUpdate": function(){} // fired if the song loading progress event fired and computed length is different
		};
		for (var allEventsIndex in allEvents ) {
			settings[allEvents[allEventsIndex]] = null;
		};
		var progressFromBuffered = function() {
			var back = 0;
			if (audio.buffered.length > 0) {
				back = Math.round(100 * audio.buffered.end(audio.buffered.length-1) / audio.duration);
			}
			return back;
		};
		var progressTimeout = null;

		var privateEvents = {
			"onstalled": function() {
				debug("STALLED !",audio);
				state.events.push({
									"time": toolbox.time(),
									"event": "stalled",
									"networkState": audio.networkState,
									"readyState": audio.readyState
				});
			},
			"onerror": function(e) {
				debug("ERROR !",audio,e);
                return true;
			},
			"oncanplaythrough": function(e) {
				debug(this.id,"can play through");
			},
			"onplay": function(e) {
				state.events.push({
									"time": toolbox.time(),
									"event": "play",
									"networkState": audio.networkState,
									"readyState": audio.readyState
				});
			},
			"onpause": function(e) {
				state.events.push({
									"time": toolbox.time(),
									"event": "pause",
									"networkState": audio.networkState,
									"readyState": audio.readyState
				});
			},
			"onsuspend": function(e) {
				state.events.push({
									"time": toolbox.time(),
									"event": "suspend",
									"networkState": audio.networkState,
									"readyState": audio.readyState
				});
			},
			"onwaiting": function(e) {
				state.events.push({
									"time": toolbox.time(),
									"event": "waiting",
									"networkState": audio.networkState,
									"readyState": audio.readyState
				});
			},
			"onended": function(e) {
				state.events.push({
									"time": toolbox.time(),
									"event": "ended",
									"networkState": audio.networkState,
									"readyState": audio.readyState
				});
				debug("track ",audio.id," dumping events: ",state.events);
				dumpEvents();
			},
			"oncanplay": function(e) {
// 				if ( this.networkState == this.NETWORK_IDLE && this.readyState == this.HAVE_ENOUGH_DATA ) {
// 					state.progressPC = 100;
// 					settings.onprogressUpdate.call(audio,{type: "progressUpdate"});
// 				}
			},
			"onprogress": function(e) {
				var progressPC = state.progressPC;
				if( typeof audio.buffered == "object" ) {
					if ( progressTimeout ) {
						clearTimeout(progressTimeout);
					}
					progressPC = progressFromBuffered();
					if ( progressPC < 100 ) {
						progressTimeout = setTimeout(function() {
							var prog = progressFromBuffered();
							if ( prog == 100 && prog != state.progressPC ) {
								state.progressPC = prog;
								settings.onprogressUpdate.call(audio,{type: "progressUpdate"});
							}
						},1000);
					}
				} else if ( e.lengthComputable && e.loaded && e.total ) {
					progressPC = Math.round(100 * e.loaded / e.total);
				}
				if ( progressPC != state.progressPC ) {
					state.progressPC = progressPC;
					settings.onprogressUpdate.call(audio,{type: "progressUpdate"});
				}
			}
		};
		$.extend(settings,options);
		var state = {
			"created": toolbox.time(),
			"progressPC": 0,
			"events": []
		};
		var audio  =  null;
		var fadeInterval = null;
		var fadingOut = false;

		this.id = id;

		this.duration = seconds;

		this.getCreationTimestamp = function() { return state.created; };

		this.fading = function() { return fadeInterval ? true : false; };

		this.getProgressPC = function() {
          if( typeof audio.buffered == "object" ) {
            return progressFromBuffered();
          }
          return state.progressPC;
        };

		this.destroy = function() {
			try { audio.pause(); } catch (e) {}
			delete audio ;
			if ( fadeInterval ) {
				clearInterval(fadeInterval);
				fadeInterval = null;
			}
			dumpEvents();
		}

		this.volume = function(vol) {
			if ( fadingOut )	return ;
			audio.volume = vol;
		};

		this.seek = function(secs) {
            var isPaused = audio.paused;
			if ( audio.readyState >= audio.HAVE_ENOUGH_DATA ) {
				debug("audioplayer: setting currentTime to "+secs+", currentTime= "+audio.currentTime+", duration = "+audio.duration+", seeking = "+audio.seeking);
				if ( !isPaused ) audio.pause();
				audio.currentTime = secs;
				if ( !isPaused ) audio.play();
			}
		}

		this.playbackRate = function() {
			return audio.playbackRate;
		}

		this.incrementPlaybackRate = function() {
			audio.playbackRate += 0.02;
		}

		this.decrementPlaybackRate = function() {
			audio.playbackRate -= 0.02;
		}

		this.fadeOut = function (secs,callback) {
			if ( fadeInterval ) {
				clearInterval(fadeInterval);
				fadeInterval = null;
			}
			var target_volume = audio.volume;
			var remaining = secs;
			var step = target_volume / secs;

			var fadeStep = function () {
				fadingOut=true;
				if ( remaining == 0 ) {
					audio.volume = 0;
					fadingOut = false;
					clearInterval( fadeInterval );
					fadeInterval = null;
					debug("fadeOut ended");
					if ( callback )	callback.call(this);
					return ;
				}
				remaining--;
				var new_volume = audio.volume - step;
				if ( new_volume < 0 ) new_volume = 0;
				audio.volume = new_volume;
			};
			fadeStep();
			fadeInterval = setInterval(fadeStep,900);
			return audio.id;
		};


		this.fadeIn = function (secs,callback,opts) {
			var config = $.extend({
				target_volume: 0.5,
				startTime: 0
			},opts ? opts: {});
			if ( fadeInterval ) {
				clearInterval(fadeInterval);
				fadeInterval = null;
			}

			var remaining = secs;
			var step = config.target_volume / secs;

			var fadeStep = function () {
				if ( remaining == 0 ) {
					audio.volume = config.target_volume;
					clearInterval( fadeInterval );
					fadeInterval = null;
					debug("fadeIn ended");
					if ( callback )	callback.call(this);
					return ;
				}
				remaining--;
				audio.volume = audio.volume + step;
			};
			//debug("progress: ",this.getProgressPC(),"% and readyState: ",audio.readyState);
			if ( audio.readyState < audio.HAVE_ENOUGH_DATA ) { //4 = have enough_data, 3 = have future data
				debug("don't have enough data to fade in. readyState = "+audio.readyState);
				return false;
			}
			audio.currentTime = config.startTime;
			audio.volume = 0;

			audio.timestamp = new Date().getTime();
			audio.play();
			fadeStep();
			fadeInterval = setInterval(fadeStep,1000);
			return audio.id;
		};

		var dumpEvents = function () {
			if ( ! state.events.length ) {
				return ;
			}
			var evts = state.events.slice(0);
			state.events = [];
			pubsub.topic("audioDump").publish({
								"id": id,
								"creation": state.created,
								"events": evts,
								"duration": seconds
								});
		};

		var ael = function(evt) {
          var evtName = evt.replace(/^on/,'');
			if ( evt != "ontimeupdate" && config.debug && config.debug_options.audio ) {
              var fn = function(e) { debug("audio event: ",this.id,e.type,e); };
              audio.addEventListener(evtName,fn,false);
			}
			if ( privateEvents[evt] ) {
              audio.addEventListener(evtName,privateEvents[evt],false);
			}
			if ( settings[evt] ) {
              audio.addEventListener(evtName,settings[evt],false);
			}
		};

        var preloadHack = function(then) {
          return then(this);
          var self = this;
          var initialVolume = audio.volume;
          audio.volume = 0;
          audio.play();
          setTimeout(function() {
            audio.pause();
            self.seek(0);
            audio.volume = initialVolume;
            then(self);
          },10);
        };

        // choose best audio type
        var bestType = audioCapabilities.chooseBestType(url);

		// create song
		audio  = new Audio(bestType.url);
		this.audio = audio;
		for ( var index in allEvents ) { ael(allEvents[index]); }
		audio.id = id;
		audio.last_secs_update = -1;
        if ( "volume" in settings ) {
          audio.volume=settings.volume;
        }
		audio.autobuffer = true;
		audio.preload = "auto";

        audio.load();
        if ( settings.onCreated ) {
          preloadHack.call(this, settings.onCreated);
        }
	};
	return track;
});
