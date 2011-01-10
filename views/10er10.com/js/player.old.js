(function($){


function player( url_arg ) {

    var url = url_arg;
	var songReg = /^aa.*$/;
    var audios = {};
    var audio_volume = 0.5;
	//var current = null;
	var current_id = null;
	//var current_secs = null;
	//var next = null;
	var next_id = null;
	var div = document.createElement('div');
  var h = null;
  $(document).ready(function() {
    h = document.querySelectorAll('header')[0];
    h.appendChild(div);
  });
	var buffer_length = 5;
	var prefetch_secs = 30;

	

	this.dbg = function() {
		debug("audioplayer");
		debug(div);
		debug("audios:");
		debug(audios);
	}

	var uid = function (song) {
// 		debug("player: uid");
// 		debug(song);
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
		if ( audios[id] ) {
			debug("player: "+id+" found !");
		}
		var audio  = document.createElement('audio');
		audio.id = id;
		audio.last_secs_update = -1;
		audio.volume=audio_volume;
		audio.autobuffer = true;
		audio.timestamp = new Date().getTime();
		audio.setAttribute('src',url+song.attr('name')+'.ogg');
		audio.load();
		audios[id] = song;
		div.appendChild(audio);
		return id;
    }

	var getAudio = function(id) {
		//debug(id);
		//debug(typeof id);
		if ( typeof id == 'object' && id != null ) {			return getAudio(uid(id));	}
		var audio = null;
		audio=document.getElementById(id);

		//debug(div);
		if ( !audio ) {
			debug("getAudio: nothin found for "+id);
			return false;
		}
		return {'audio':audio, 'song': audios[id]};
	}

	var objLength = function(obj) {
		var size = 0, key;
		for (key in obj) {
			if (obj.hasOwnProperty(key)) size++;
		}
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
					oldest_id = audio.audio.id;
					oldest_timestamp = audio.audio.timestamp;
				} else if ( audio.audio.timestamp < oldest_timestamp ) {
					oldest_id = audio.audio.id;
					oldest_timestamp = audio.audio.timestamp;
				}
			}
			debug("player: audio garbage removing "+oldest_id);
			destroyAudio ( oldest_id );
			audioGarbage();
		}
	}

	var rmAudio = function (id) {
		var audio = getAudio(id);
		if ( !audio )	return false;
		audio.audio.pause();
		delete audios[id];
		div.removeChild(audio.audio);
	}

	var getAllAudio = function () {
		var back = {};
		//debug(div.innerHTML);
		var indexes = div.querySelectorAll('audio');
		///debug(indexes);
		for(var i=0; i< indexes.length; i++)
		{
			back[indexes[i].id] = true;
		}

		return back;
	}

	var optimistPrefetch = function(data, concern) {
		//debug("oPrefetch on id");
		if (  concern.audio.readyState != concern.audio.HAVE_ENOUGH_DATA ) {
			return;
		}
		var nextone = concern.song.next('.song[name]');
		if ( !nextone.length ) {
			return ;
		}
		var id = uid(nextone);
		//debug("prefetch on id");
		if (  audios[id] ) {
			return ;
		}
		// no prefetch while fade is going
		if ( data.currentTime < audioFadeSecs() ) {
			return ;
		}
		debug("starting prefetch of "+id+" at "+data.currentTime+" s");
		addBinding(createAudio(nextone));


	}

	// launch
	// 'playbackTimeUpdate' on any song
	// 'player.mainTimeUpdate' if song is the one designed as "current"
	var timeupdateHandler = function ( e, data ) {
		//debug('duration:'+data.duration);
// 		debug("timeupdateHandler");
// 		debug(data);
		var concern = getAudio(data.id);
/*		$(document).trigger('playbackTimeUpdate',
			{'currentTime': data.currentTime, 'duration': concern.audio.duration }
		);*/
		//debug("id: "+data.id+", current_id:"+current_id+", duration: "+data.duration+", currentTime:"+data.currentTime);

		
		if ( data.id == current_id ) {
			$(document).trigger('player.mainTimeUpdate',
				{'currentTime': data.currentTime, 'duration': concern.audio.duration }
			);
			if ( data.currentTime> 0 && data.currentTime % 8 == 0 ) {
				optimistPrefetch(data,concern);
			}

			if ( audioFadeSecs() > 0 && data.duration != 'NaN' && data.duration > 0 && data.duration - data.currentTime == audioFadeSecs() ) {
				beginFade();
			}

		}
	}
	$(document).bind('audioTimeUpdate',timeupdateHandler);
/*
	// playHandler not good : in case of network fail & recover the play handler can be called other times on the same song
	var playHandler = function (e,data) {
		if ( data.readyState > 0 ) {
// 				$(document).trigger('playbackStart', {'song': getAudio(data.id).song, 'duration': getAudio(data.id).audio.duration } );
				return true;
		}
		getAudio(data.id).audio.addEventListener('loadedmetadata',function() {
			var secs = Math.floor(this.duration);
			$(document).trigger('audioLoadedMetadata', {'id': this.id, 'duration': secs }  );
		},false);
// 		$(document).trigger('playbackStart', {'song': getAudio(data.id).song, 'duration': 0 } );
	}
	$(document).bind('audioPlay',playHandler);

	var loadedMetadataHandler = function (e,data) {
		$(document).trigger('audioMetadata', {'song': getAudio(data.id).song, 'duration': data.duration }  );
	}
	$(document).bind('audioLoadedMetadata',loadedMetadataHandler);
*/
	var endedHandler = function (e,data) {
		var audio = getAudio(data.id);
// 		$(document).trigger('playbackEnded', {'song': audio.song }  );
		if ( data.id == current_id ) {
			$(document).trigger('player.currentSongEnded', {'song': audio.song }  );
		}
	}
	$(document).bind('audioEnded',endedHandler);




    var addBinding = function (id) {
      //debug(audios);
      //debug(audios[index]);
		var audio = getAudio(id).audio;
		//debug("adding bindings on :");
		//debug(audio);

		// timeupdate event creates an "audioTimeUpdate" once on each new second
		audio.addEventListener('timeupdate',function() {
			//debug(audios);
			var secs = Math.floor(this.currentTime);
			if ( secs == this.last_secs_update ) {return true;}
			this.last_secs_update = secs;
			var dur = Math.floor(this.duration);
			$(document).trigger('audioTimeUpdate', { 'id':this.id,'currentTime':secs,'duration':dur });
		}, false);

		// the play event triggers an audioPlay event...
// 		audio.addEventListener('play',function() {
// 			$(document).trigger('audioPlay', {'id':this.id, 'duration':this.duration, 'readyState':this.readyState} );
// 		},false);

		// when canplaythrough event is received, we take it as "audio data reception completed, that is false...
		// but due to changes on HTML5 specs concerning the networkState property, we have to wait ff implementation
		// if song is the "current" song, we create a "player.currentSongProgress" with loaded=1, total=1
		audio.addEventListener('canplaythrough',function() {
			if ( this.id == current_id ) {
				$(document).trigger('player.currentSongProgress', {'progress': { 'lengthComputable': true,'total': 1, 'loaded':1}  }  );
			}
		},false);

		audio.addEventListener('ended',function() {
			$(document).trigger('audioEnded', {'id': this.id }  );
		}, false);

		audio.addEventListener('seeking',function() {
			debug("audioplayer seeking "+this.id);
		}, false);
		audio.addEventListener('stalled',function() {
			debug("audioplayer stalled "+this.id);
		}, false);
		audio.addEventListener('emptied',function() {
			debug("audioplayer emptied "+this.id);
		}, false);
		audio.addEventListener('error',function(e) {
// 			console.log("audioplayer error "+this.id,e);
		}, false);
		audio.addEventListener('progress',function(e) {
			if ( this.id == current_id ) {
				$(document).trigger('player.currentSongProgress', {'progress': e }  );
			}
			//debug(e);

		}, false);
	}



    var destroyAudio = function ( id ) {
      if (!id || !getAudio(id) ) {
        debug("audioplayer: id "+id+' not found');
        return false;
      }
      getAudio(id).audio.pause();
      rmAudio(id);
      return true;
    }

    /* TODO */
	this.seek = function(secs) {
		if ( getAudio(current_id) && getAudio(current_id).audio.readyState == getAudio(current_id).audio.HAVE_ENOUGH_DATA ) {
			debug("audioplayer: setting currentTime to "+secs+", currentTime= "+getAudio(current_id).audio.currentTime+", duration = "+getAudio(current_id).audio.duration+", seeking = "+getAudio(current_id).audio.seeking);
			var audio = getAudio(current_id);
			audio.audio.pause();
			audio.audio.currentTime = secs;
			audio.audio.play();
		}
	}

    this.playNew = function (song) {
		if ( ! songReg.test(song.attr('name')) ) {
			this.pdebug('invalid song id');
			return false;
		}
		var audio=getAudio(current_id);
		if ( audio && audio.audio ) {
			audio.audio.pause();
		}
      //destroyAudio(current_id);
		//getAudio(current_id).audio.pause;
		var eventData = {'old': audio};
		debug("player: getAudio on dom node");
		audio = getAudio(song);
		if ( audio && audio.audio ) {
			eventData.current = audio;
			audio.audio.timestamp = new Date().getTime();
			audio.audio.currentTime=0;
			audio.audio.play();
			current_id = audio.audio.id;
			$(document).trigger('player.currentSongChanged',eventData);
		} else {
			current_id = createAudio(song);
			debug("player: back from createAudio, id = "+current_id);
			addBinding(current_id);
			audio = getAudio(current_id);
			eventData.current = audio;
			debug("player: calling play() on :");
			debug(audio.audio);
			audio.audio.play();
			audioGarbage();
			$(document).trigger('player.currentSongChanged',eventData);
			return current_id;
		}
    }

    this.play = function (song) {
      return this.playNew(song);
    }

	this.resume = function() {
		if ( !current_id ) return false;
		debug("resume on "+current_id);
		if ( getAudio(current_id) ) {
// 			debug(getAudio(current_id).audio.paused);
			getAudio(current_id).audio.play();
// 			debug(getAudio(current_id).audio);
// 			debug(getAudio(current_id).audio.paused);
      if ( !getAudio(current_id).audio.paused ) {
        debug("resume OK");
        return true;
      }
		}
    return false;
	}

	this.pause = function () {
		debug(getAllAudio());
		for ( var item in getAllAudio() ) {
			debug("getAudio on "+item);
			getAudio(item).audio.pause();
		}
	}

	this.empty = function () {
		this.pause();
		this._removeCurrent();
		next = null;
		next_id = null;
	}

	this._removeCurrent = function () {
		for ( var item in getAllAudio() ) {
			destroyAudio(item);
		}
	}

	this.volume = function () {
      audio_volume = $('body').data('volume');
      for ( var item in getAllAudio() ) {
        if ( typeof getAudio(item).audio == 'object' ) {
          getAudio(item).audio.volume = audio_volume;
        }
      }
	}

	this.pdebug = function(msg) {
			debug('player: '+msg);
	}


	var audioFadeSecs = function() {
		var test = $('body').data('audioFade');
		if ( !test )	return 0;
		return test;
	}


	var fadeOutStep = function (node) {
		var d = node.data('fadeOut');
		if ( ! d ) return ;
// 		debug("fadeOutStep: ");
// 		debug(d);
		var steps = d.total - d.current;
		var audio = getAudio(node);
		audio.audio.volume = audio.audio.volume - audio.audio.volume/steps ;
		d.current++;
		if ( d.current == d.total ) {
			audio.audio.pause();
			audio.audio.volume = audio_volume;
			audio.audio.currentTime = 0;
			node.removeData('fadeOut');
			debug("fadeOut end");
			audioGarbage();
			return ;
		}
		node.data('fadeOut',d);
		setTimeout(fadeOutStep,900,node);
	}

	var fadeInStep = function (node) {
		var d = node.data('fadeIn');
		if ( ! d ) return ;
		//debug("fadeInStep: ");
		//debug(d);
		var steps = d.total - d.current;
		var audio = getAudio(node);
		var newvolume = audio.audio.volume + (audio_volume - audio.audio.volume)/steps;
		//debug("new volume : "+newvolume);
		audio.audio.volume = newvolume ;
		d.current++;
		if ( d.current == d.total ) {
			//audio.audio.pause();
			audio.audio.volume = audio_volume;
			node.removeData('fadeIn');
			debug("fadeIn end");
			return ;
		}
		node.data('fadeIn',d);
		setTimeout(fadeInStep,1000,node);
	}

	var beginFadeIn = function (id,secs) {
		var d_audio = getAudio(id);
		if ( !d_audio || !d_audio.audio ) {
			debug("no way to fade in: next audio element not ready");
			return false;
		}

		if ( d_audio.audio.readyState < 4 ) {	//4 = have enough_data
			debug("don't have enough data to fade in. networkState = "+d_audio.audio.networkState+' and readyState = '+d_audio.audio.readyState);
			return false;
		}
		d_audio.audio.volume = 0;
		d_audio.audio.play();
		d_audio.audio.timestamp = new Date().getTime();
		d_audio.song.data('fadeIn',{'total': secs, 'current': 0});
		d_audio.song.removeData('fadeOut');
		setTimeout(fadeInStep,1000,d_audio.song);
		return d_audio.audio.id;
	}

	var beginFadeOut = function (id,secs) {
		var s_audio = getAudio(id);
		if ( !s_audio || !s_audio.audio ) {
			debug("fadeout error : no current song or not playing");
			return false;
		}
		s_audio.song.data('fadeOut',{'total': secs, 'current': 0});
		s_audio.song.removeData('fadeIn');
		setTimeout(fadeOutStep,900,s_audio.song);
	}

	var beginFade = function () {
		var s_audio = getAudio(current_id);
		var d_node = s_audio.song.next('.song[name]');
		var secs =audioFadeSecs();
		if ( !d_node.length ) {
			debug("no way to fade: next song doesn't exist");
			return ;
		}

		var d_id = beginFadeIn(d_node,secs);
		if ( d_id == false ) {
			debug('Fade In startup failed');
			return ;
		}
		beginFadeOut(current_id,secs);
		current_id = uid(d_node);
		$(document).trigger('player.currentSongChanged',{'old': s_audio, 'current': getAudio(d_node)});
	}
}

d10.player = new player (base_url+"/audio/") ;

})(jQuery);