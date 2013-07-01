
"use strict";

(function() {
  
  angular.module("d10rc",[])
  .factory("d10rc", function() {
    var remot = require("js/d10.websocket.protocol.remot");
    return {
      playSongAtIndex: function(index) {
        remot.playSongAtIndex(index, function(err,resp) {
          debug("playSongAtIndex returns : ",err,resp);
        });
      },
      
      removeSongAtIndex: function(index) {
        remot.removeSongAtIndex(index, function(err,resp) {
          debug("removeSongAtIndex returns : ",err,resp);
        });
      },
      
      play: function(evt) {
        debug("sending play command to peer");
        remot.play(function(err) {
          debug("play command response: ",err);
        });
        evt.stopPropagation();
        evt.preventDefault();
      },
      pause: function(evt) {
        debug("sending pause command to peer");
        remot.pause(function(err) {
          debug("pause command response: ",err);
        });
        evt.stopPropagation();
        evt.preventDefault();
      },
      playNext: function() {
        remot.next(function(err,done) {
          debug("next command response: ",err,"done:",done);
        });
      },
      playPrevious: function() {
        remot.previous(function(err,done) {
          debug("previous command response: ",err,"done:",done);
        });
      },
      mixSongAtIndex: function(mixLabel, mixDescription, index) {
        remot.mixSongAtIndex(mixLabel, mixDescription, index,function(err,done) {
          debug("mixSongAtIndex command response: ",err,"done:",done);
        });
      }
    };
  })
  .factory("d10rcView",["$rootScope","d10artistTokenizer",
           function($rootScope, d10artistTokenizer) {
    var rcView = {
    };
    var pubsub = require("js/d10.events");
    var rest = require("js/d10.rest");
    var remotConnection = require("js/d10.remot.master.connection");
    var remot = require("js/d10.websocket.protocol.remot");
    pubsub.topic("remot-connection").subscribe(connectionStatusChanged);
    
    function reset() {
      rcView.song = null;
      rcView.paused = true;
      rcView.currentTime = 0;
      rcView.index = -1;
      rcView.expandedIndex = -1;
      rcView.playlist = [];
      rcView.volume = 0;
      rcView.listening = false;
    };

    function updatePlaylist(songs) {
      rcView.expandedIndex = -1;
      if ( !songs.length ) {
        rcView.playlist = songs;
        rcView.index = -1;
        rcView.song = null;
        rcView.currentTime = 0;
      } else {
        d10artistTokenizer(songs);
        rcView.playlist = songs;
      }
      debug("Broadcasting playlist:changed");
      $rootScope.$broadcast("playlist:changed");
    };
    
    function updateIndex(index) {
      if ( !rcView.playlist[index] ) {
        rcView.index = -1;
        rcView.song = null;
      } else {
        rcView.index = index;
        rcView.song = rcView.playlist[index];
      }
    };
    
    function fillFromFullStatus(response) {
      rcView.currentTime = response.currentTime;
      rcView.paused = response.paused;
      rcView.volume = response.volume;
      updatePlaylist(response.playlist);
      updateIndex(response.index);
    };

    function connectionStatusChanged(status) {
      debug("remoteView: connectionStatusChanged",status);
      if ( status == remotConnection.STATUS_OFF ) {
        rcView.listening = false;
      } else {
        remot.fullPlayStatus(function(err,response) {
          debug("fullPlayStatus returns, ",err,response);
          if ( err ) {
            return ;
          }
          if ( response.playlist.length == 0 ) {
            $rootScope.$apply(function() {
              fillFromFullStatus(response);
              if ( remotConnection.status() == remotConnection.STATUS_PEERED ) {
                rcView.listening = true;
              }
            });
            return ;
          }
          rest.song.get(response.playlist, {
            load: function(err,playlist) {
              if ( err ) {
                debug("Arg, songs ",response.playlist,"not found, err = ",err);
                return ;
              }
              response.playlist = playlist;
              $rootScope.$apply(function() {
                fillFromFullStatus(response);
                if ( remotConnection.status() == remotConnection.STATUS_PEERED ) {
                  rcView.listening = true;
                }
              });
            }
          });
        });
      }
    };
    
    reset();
    pubsub.topic("remot:smallPlayStatus").subscribe(function(response) {
      if ( !rcView.listening ) {
        return ;
      }
      $rootScope.$apply(function() { 
        rcView.paused = response.paused;
        rcView.currentTime = response.currentTime;
        updateIndex(response.index);
      });
    });
    
    pubsub.topic("remot:playlist:ended").subscribe(function() {
      if ( !rcView.listening ) {
        return ;
      }
      $rootScope.$apply(function() { rcView.paused = true; });
    });
    pubsub.topic("remot:playlist:paused").subscribe(function() {
      if ( !rcView.listening ) {
        return ;
      }
      $rootScope.$apply(function() { rcView.paused = true; });
    });
    pubsub.topic("remot:playlist:resumed").subscribe(function() {
      if ( !rcView.listening ) {
        return ;
      }
      $rootScope.$apply(function() { rcView.paused = false; });
    });
    pubsub.topic("remot:playlist:currentSongChanged").subscribe(function(index, id) {
      if ( !rcView.listening ) {
        return ;
      }
      $rootScope.$apply(function() {
        rcView.paused = false;
        updateIndex(index);
      });
    });
    
    pubsub.topic("remot:playlistUpdate").subscribe(function(ids, index) {
      if ( !rcView.listening ) {
        return ;
      }
      if ( !ids.length ) {
        $rootScope.$apply(function() {
          updatePlaylist(ids);
        });
        return ;
      }
      rest.song.get(ids, {
        load: function(err,resp) {
          if ( err ) {
            debug("Arg, songs ",ids,"not found, err = ",err);
            return ;
          }
          $rootScope.$apply(function() {
            updatePlaylist(resp);
            updateIndex(index);
          });
        }
      });
    });
    
    pubsub.topic("remot:playlist:volumeChanged").subscribe(function(volume) {
      if ( !rcView.listening ) {
        return ;
      }
      $rootScope.$apply(function() {
        rcView.volume = volume;
      });
    });
    
    return rcView;
    
  }])
  ;
  
  
})();