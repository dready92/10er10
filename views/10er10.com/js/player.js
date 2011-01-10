(function($){


function player( url ) {

	var songReg = /^aa.*$/;
	var audios = {};
	var audio_volume = 0.5;
	var current_id = null;
	var next_id = null;

	var buffer_length = 5;
	var prefetch_secs = 30;

	var uid = function (song) {
		return song.attr('name')+'-'+song.prevAll('.song[name='+song.attr('name')+']').length;
	}

	/**
	* createAudio :
	*
	* - create audio element
	* - adjust volume, autobuffer
	*
	* 
	*
	*/
	var createAudio = function (song) {
		debug("createAudio starts");
		var id=uid(song);
		if ( audios[id] ) { debug("player: "+id+" found !"); }
  
		audios[id] = {"song": song};
		audios[id].track = new track(id, {"audio/ogg": url(song.attr('name')) },song.find("span.length").attr("seconds") ,{
			"ontimeupdate":function() {
				if ( this.id == current_id ) {
					var secs = Math.floor(this.currentTime);
					if ( secs == this.last_secs_update ) {return true;}
					this.last_secs_update = secs;
					var dur = Math.floor(this.duration);
					$(document).trigger('player.mainTimeUpdate',{'currentTime': secs, 'duration': dur }	);
					if ( secs > prefetch_secs && secs % 8 == 0 ) { optimistPrefetch(getAudio(this.id)); }
					if ( audioFadeSecs() > 0 && !isNaN(dur) && dur > 0 && dur - secs == audioFadeSecs() ) {
					  beginFade();
					}
			  }
			},
			"oncanplaythrough":function() {
				if ( this.id == current_id ) {
					$(document).trigger('player.currentSongProgress', {'progress': { 'lengthComputable': true,'total': 1, 'loaded':1}  }  );
			  }
			},
			"onended": function() {
				$(document).trigger('audioEnded', {'id': this.id }  );
			},
			"onprogressUpdate": function(e) {
				if ( this.id == current_id ) {
					if ( this.networkState == this.NETWORK_IDLE && this.readyState == this.HAVE_ENOUGH_DATA )  {
						$(document).trigger('player.currentSongProgress', {'progress': { 'lengthComputable': true,'total': 1, 'loaded':1}  }  );
						return ;
					}
				  $(document).trigger('player.currentSongProgress', {'progress': { 'lengthComputable': true,'total': 100, 'loaded': getAudio(this.id).track.getProgressPC()} }  );
				}
			}
		});
	  
		return id;
	};

	var getAudio = function(id) {
		if ( typeof id == 'object' && id != null ) { return getAudio(uid(id)); }
		if ( id in audios ) { return audios[id]; }
		return false;
	}

	var objLength = function(obj) {
		var size = 0, key;
		for (key in obj) { if (obj.hasOwnProperty(key)) size++; }
		return size;
	};


	var audioGarbage = function () {
		//debug("player: audioGarbage, array = "+objLength(audios)+" , config = "+buffer_length);
		if ( objLength(audios) > buffer_length ) {
			//find oldest audio
			var oldest_id = 0;
			var oldest_timestamp = 0;
			for ( var index in audios ) {
				var audio  = getAudio(index);
				if ( oldest_id == 0 ) {
					oldest_id = audio.track.id;
					oldest_timestamp = audio.track.getCreationTimestamp();
        } else if ( audio.track.getCreationTimestamp() < oldest_timestamp ) {
					oldest_id = audio.id;
					oldest_timestamp = audio.track.getCreationTimestamp();
				}
			}
			debug("player: audio garbage removing "+oldest_id);
			rmAudio ( oldest_id );
			audioGarbage();
		}
	};



	var rmAudio = function (id) {
		if (!id)  return false;
		var track = getAudio(id);
		if ( !track )	return false;
		track.track.destroy();
		delete audios[id];
	};

	var optimistPrefetch = function(concern) {
		//debug("oPrefetch on id");
		if (  concern.track.audio.readyState < concern.track.audio.HAVE_ENOUGH_DATA ) {
			return;
		}
		var nextone = concern.song.next('.song');
		if ( !nextone.length ) {
			return ;
		}
		var id = uid(nextone);
		//debug("prefetch on id");
		if (  audios[id] ) {
			return ;
		}
		// no prefetch while fade is going
// 		if ( data.currentTime < audioFadeSecs() ) {
// 			return ;
// 		}
		debug("starting prefetch of "+id+" at "+concern.track.audio.currentTime+" s");
		createAudio(nextone);


	}



	var endedHandler = function (e,data) {
		var audio = getAudio(data.id);
// 		$(document).trigger('playbackEnded', {'song': audio.song }  );
		if ( data.id == current_id ) {
			$(document).trigger('player.currentSongEnded', {'song': audio.song }  );
		}
	}
	$(document).bind('audioEnded',endedHandler);

	this.seek = function(secs) {
		var a = getAudio(current_id);
		if ( a ) {  a.track.seek(secs); }
	}

	
	this.play = function (song) {
		if ( ! songReg.test(song.attr('name')) ) {
			debug('invalid song id');
			return false;
		}
		var audio=getAudio(current_id);
		if ( audio && audio.track.audio ) {
			audio.track.audio.pause();
		}
		var eventData = {'old': audio};

		audio = getAudio(song);
		if ( audio && audio.track.audio ) {
			debug("using cached audio");
			eventData.current = audio;
			audio.track.audio.timestamp = new Date().getTime();
			try {
				audio.track.audio.currentTime=0;
			} catch (e) {
				rmAudio(audio.track.audio.id);
				return this.play(song);
			}
			audio.track.audio.volume = $('body').data('volume');
			audio.track.audio.play();
			current_id = audio.track.audio.id;
			$(document).trigger('player.currentSongChanged',eventData);
		} else {
			current_id = createAudio(song);
			debug("player: back from createAudio, id = "+current_id);
			audio = getAudio(current_id);
			eventData.current = audio;
			debug("player: calling play() on", audio);
// 			debug(audio.audio);
			audio.track.audio.play();
			audioGarbage();
			$(document).trigger('player.currentSongChanged',eventData);
			return current_id;
		}
  };

	this.resume = function() {
		if ( !current_id ) return false;
		debug("resume on "+current_id);
		if ( getAudio(current_id) ) {
			getAudio(current_id).track.audio.play();
			if ( !getAudio(current_id).track.audio.paused ) {
				debug("resume OK");
				return true;
			}
		}
		return false;
	}

	this.pause = function () {
		for ( var item in audios ) {
			audios[item].track.audio.pause();
		}
	}

	this.empty = function () {
		this.pause();
		this._removeCurrent();
		next = null;
		next_id = null;
	}

	this._removeCurrent = function () {
		for ( var item in audios ) {
			rmAudio(item);
		}
	}

	this.volume = function () {
      audio_volume = $('body').data('volume');
      for ( var item in audios ) {
        if ( typeof audios[item].track == 'object' ) {
          audios[item].track.volume(audio_volume);
        }
      }
	}

	var audioFadeSecs = function() {
		var test = $('body').data('audioFade');
		if ( !test )	return 0;
		return test;
	}

	var beginFade = function () {
		debug("fade algorithm begins");
		var s_audio = getAudio(current_id);
		var d_node = s_audio.song.next('.song[name]');
		var secs = audioFadeSecs();
		if ( !d_node.length ) {
			debug("no way to fade: next song doesn't exist");
			return ;
		}
		var next = getAudio(d_node);
		if ( !next ) {
			debug("next dong not created yet : no way to fade");
			return ;
		}
		var d_id = next.track.fadeIn(secs);
		if ( d_id == false ) {
			debug('Fade In startup failed');
			return ;
		}
// 		beginFadeOut(current_id,secs);
		s_audio.track.fadeOut(secs);
// 		current_id = uid(d_node);
		current_id = next.track.id;
		$(document).trigger('player.currentSongChanged',{'old': s_audio, 'current': next});
	}

	this.getCurrent = function() {
		if ( current_id ) {
			return getAudio(current_id);
		}
	};

	
  
	this.dump = function () {
		var len = 0;
		for ( var index in audios ) {
			len++;
		}
		return {"audios": len};
	};
	
	this.setUrlBuilder = function (fn) {
		url = fn;
	};
	
	this.setScriptUrl = function () {
		this.setUrlBuilder( function (id) { return site_url+"/audio/play/"+id; } );
	};
	this.setDirectUrl = function () {
		this.setUrlBuilder( function (id) { return "/audio/"+id.substr(2,1)+"/"+id+".ogg"; } );
	};
};

/*
d10.player = new player (
	function (id) { return base_url+"/audio/"+id+".ogg"; }
);
*/

d10.player = new player (
        function (id) { return "audio/"+id+".ogg"; }
) ;
d10.player.setDirectUrl();


})(jQuery);
