define(
  [
  "js/d10.websocket.protocol.remot",
  "js/playlist"
  ],
  function(remot, playlist) {
    
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
});