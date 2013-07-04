define(
  [
  "js/d10.websocket.protocol.remot",
  "js/playlist",
  "js/d10.mixes",
  "js/d10.rest",
  "js/d10.templates"
  ],
  function(remot, playlist, mixes, rest, templates) {
    
  function getSmallPlayStatus() {
    function noTrack(response) {
      response.currentTime = 0;
      response.paused = true;
    };
    
    var response = {}
    var current = playlist.current();
    if ( current.length ) {
      response.index = current.prevAll().length;
      var track = playlist.driver().current();
      if ( track ) {
        var audio = playlist.driver().current().audio;
        response.currentTime = parseInt(audio.currentTime,10);
        response.paused = audio.paused;
      } else {
        noTrack(response);
      }
    } else {
      noTrack(response);
      response.index = -1;
    }
    current = null;
    return response;
  }
  
  remot.addLocalEndPoint("fullPlayStatus",function(callback) {
    var response = getSmallPlayStatus();
    response.playlist = playlist.songsId();
    response.volume = playlist.volume();
    callback(null,response);
  });
  
  remot.addLocalEndPoint("smallPlayStatus",function(callback) {
    var response = getSmallPlayStatus();
    callback(null,response);
  });
  
  remot.addLocalEndPoint("play",function(callback) {
    playlist.playOrResume();
    callback(null);
  });
  
  remot.addLocalEndPoint("pause",function(callback) {
    playlist.pause();
    callback(null);
  });
  
  remot.addLocalEndPoint("next",function(callback) {
    callback(null, playlist.playNext());
  });
  
  remot.addLocalEndPoint("previous",function(callback) {
    callback(null, playlist.playPrevious());
  });
  
  remot.addLocalEndPoint("playSongAtIndex",function(index, callback) {
    var index = parseInt(index, 10);
    if ( isNaN(index) ) {
      return callback("PARAMETER_ERROR");
    }
    
    if ( !playlist.getSongAtIndex(index) ) {
      return callback("BAD_INDEX_ERROR");
    }
    callback(null, playlist.playSongAtIndex(index));
  });
  
  remot.addLocalEndPoint("removeSongAtIndex",function(index, callback) {
    var index = parseInt(index, 10);
    if ( isNaN(index) ) {
      return callback("PARAMETER_ERROR");
    }
    var widget = playlist.getSongAtIndex(index);
    if ( !widget ) {
      return callback("BAD_INDEX_ERROR");
    }
    callback(null, playlist.remove(widget));
  });
  
  remot.addLocalEndPoint("mixSongAtIndex",function(label, description, index, callback) {
    if ( !$.isFunction(callback) ) {
      debug("mixSongAtIndex: bad number of arguments",arguments);
      return ;
    }
    try {
      var mixDef = null;
      for (var i=0; i<mixes.length; i++) {
        if ( mixes[i].label == label && mixes[i].description == description ) {
          mixDef = mixes[i];
          break;
        }
      }
      if ( !mixDef ) {
        return callback("ERR_MIX_NOT_FOUND");
      }
      var mix = mixDef.builder();
      mix.load(function() {
        var mixStarted = playlist.driver().launchMixRelaxed(mix, {index: index, forceFading: true});
        if ( !mixStarted ) {
          return callback("ERR_MIX_NOT_STARTED");
        }
        return callback();
      });
    } catch(e) {
      debug("mixSongAtIndex: error",e);
    }
  });
  
  
  remot.addLocalEndPoint("mixesList",function(callback) {
    var response = [];
    
    mixes.forEach(function(mix) {
      response.push({label: mix.label, description: mix.description});
    });
    callback(null, response);
  });
  
  remot.addLocalEndPoint("appendToCurrentAndPlay", function(id, callback) {
    if ( !$.isFunction(callback) ) {
      debug("appendToCurrentAndPlay: bad number of arguments",arguments);
      return ;
    }
    if ( !id || id.substr(0,2) != 'aa' ) {
      return callback("ERR_BAD_SONG_ID");
    }
    rest.song.get(id, {
      load: function(err,resp) {
        if ( err ) {
          return callback("ERR_SONG_NOT_FOUND");
        }
        var widget = $(templates.song_template(resp));
        playlist.appendToCurrent(widget);
        return callback(null,playlist.playSongAtIndex(widget.prevAll().length));
      }
    });
  });
  remot.addLocalEndPoint("appendToPlayerList", function(id, callback) {
    if ( !$.isFunction(callback) ) {
      debug("appendToPlayerList: bad number of arguments",arguments);
      return ;
    }
    if ( !id || id.substr(0,2) != 'aa' ) {
      return callback("ERR_BAD_SONG_ID");
    }
    rest.song.get(id, {
      load: function(err,resp) {
        if ( err ) {
          return callback("ERR_SONG_NOT_FOUND");
        }
        var widget = $(templates.song_template(resp));
        playlist.append(widget);
        return callback(null, true);
      }
    });
  });
});