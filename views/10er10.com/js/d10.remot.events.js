define(["js/d10.events",
       "js/d10.websocket.protocol.remot",
       "js/d10.remot.slave.connection",
       "js/playlist"
       ],
       function(pubsub, remot, connection, playlist) {
  
  function playlistCurrentSongChanged() {
    var current = playlist.current().attr("name");
    remot.sendEvent('playlist:currentSongChanged', current);
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
    remote.sendEvent('playlistUpdate',list);
  };
  
  function playlistVolumeChanged (data) {
    remote.sendEvent('playlist:volumeChanged',data.volume);
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