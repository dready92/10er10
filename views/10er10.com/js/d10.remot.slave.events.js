define(["js/d10.events",
       "js/d10.websocket.protocol.remot",
       "js/d10.remot.slave.connection",
       "js/playlist"
       ],
       function(pubsub, remot, connection, playlist) {
  
  function playlistCurrentSongChanged() {
    var current = playlist.current();
    var name = current.attr("name");
    var index = current.prevAll().length
    remot.sendEvent('playlist:currentSongChanged', index, name);
  };
  
  function playlistEnded() {
    remot.sendEvent('playlist:ended');
  };
  
  function playlistPaused() {
    remot.sendEvent('playlist:paused');
  };
  
  function playlistResumed() {
    remot.sendEvent('playlist:resumed');
  };
  
  function playlistUpdate() {
    var list = playlist.songsId();
    var current = playlist.current();
    var index = -1;
    if ( current.length ) {
      index = current.prevAll().length;
    }
    remot.sendEvent('playlistUpdate',list, index);
  };
  
  function playlistVolumeChanged (data) {
    remot.sendEvent('playlist:volumeChanged',data.volume);
  };
  
  var events = {
    'playlist:currentSongChanged': playlistCurrentSongChanged,
    'playlist:ended': playlistEnded,
    'playlist:paused': playlistPaused,
    'playlist:resumed': playlistResumed,
    'playlistUpdate': playlistUpdate,
    'playlist:volumeChanged': playlistVolumeChanged
  };
  
  pubsub.topic("remot-connection").subscribe(function(state) {
    debug("remote.events: got remot-connection event",state);
    if ( state == connection.STATUS_ON ) {
      debug("remote.events: subscribing");
      for (var i in events) {
        pubsub.topic(i).subscribe(events[i]);
      }
    } else {
      debug("remote.events: unsubscribing");
      for (var i in events) {
        pubsub.topic(i).unsubscribe(events[i]);
      }
    }
  });
  
  
});