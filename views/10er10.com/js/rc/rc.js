
"use strict";

(function() {
    
  angular.module("d10rc",[])
  .factory("d10rc",["d10notification", function(d10notification) {
    var remot = require("js/d10.websocket.protocol.remot");
    return {
      playSongAtIndex: function(index) {
        remot.playSongAtIndex(index, function(err,resp) {
          debug("playSongAtIndex returns : ",err,resp);
          if ( err ) {
            d10notification.notify("Failed to play song",d10notification.TYPE_ERROR);
          } else {
            d10notification.notify("Song playback started", d10notification.TYPE_INFO, "play");
          }
        });
      },
      
      removeSongAtIndex: function(index) {
        remot.removeSongAtIndex(index, function(err,resp) {
          debug("removeSongAtIndex returns : ",err,resp);
          if ( err ) {
            d10notification.notify("Failed to remove song from the player queue",d10notification.TYPE_ERROR);
          } else {
            d10notification.notify("Song removed");
          }
        });
      },
      
      play: function(evt) {
        debug("sending play command to peer");
        remot.play(function(err) {
          debug("play command response: ",err);
          if ( err ) {
            d10notification.notify("Failed to play",d10notification.TYPE_ERROR);
          } else {
            d10notification.notify("Playback started",d10notification.TYPE_INFO, "play");
          }
        });
        evt.stopPropagation();
        evt.preventDefault();
      },
      pause: function(evt) {
        debug("sending pause command to peer");
        remot.pause(function(err) {
          debug("pause command response: ",err);
          if ( err ) {
            d10notification.notify("Failed to pause playback",d10notification.TYPE_ERROR);
          } else {
            d10notification.notify("Playback paused",d10notification.TYPE_INFO, "pause");
          }
        });
        evt.stopPropagation();
        evt.preventDefault();
      },
      playNext: function() {
        remot.next(function(err,done) {
          debug("next command response: ",err,"done:",done);
          if ( err ) {
            d10notification.notify("Failed to switch to next song",d10notification.TYPE_ERROR);
          } else {
            d10notification.notify("Next song playback started",d10notification.TYPE_INFO, "next");
          }
        });
      },
      playPrevious: function() {
        remot.previous(function(err,done) {
          debug("previous command response: ",err,"done:",done);
          if ( err ) {
            d10notification.notify("Failed to play previous song",d10notification.TYPE_ERROR);
          } else {
            d10notification.notify("Previous song playback started",d10notification.TYPE_INFO,"previous");
          }
        });
      },
      volume: function(volume) {
        volume = parseInt(volume,10) / 100;
        remot.volume(volume, function(err) {
          debug("volume err ? ",err);
        });
      },
      volumeDelayedTimeoutId: null,
      volumeDelayed: function(volume, delay) {
        this.removeVolumeDelayedTimeout();
        delay = parseInt(delay,10);
        if ( isNaN(delay) ) {
          this.volume(volume);
          return ;
        }
        var self = this;
        this.volumeDelayedTimeoutId = setTimeout(function() {
          self.volume(volume);
        },delay);
      },
      removeVolumeDelayedTimeout: function() {
        if ( this.volumeDelayedTimeoutId ) {
          clearTimeout(this.volumeDelayedTimeoutId);
          this.volumeDelayedTimeoutId = null;
        }
      },
      mixSongAtIndex: function(mixLabel, mixDescription, index) {
        remot.mixSongAtIndex(mixLabel, mixDescription, index,function(err,done) {
          debug("mixSongAtIndex command response: ",err,"done:",done);
          if ( err ) {
            d10notification.notify("Mix failed to start",d10notification.TYPE_ERROR);
          } else {
            d10notification.notify("Mix started");
          }
        });
      },
      appendToCurrentAndPlay: function(id) {
        remot.appendToCurrentAndPlay(id, function(err,done) {
          debug("appendToCurrentAndPlay command response: ",err,"done:",done);
          if ( err ) {
            d10notification.notify("Failed to play song",d10notification.TYPE_ERROR);
          } else {
            d10notification.notify("Song playback started", d10notification.TYPE_INFO, "play");
          }
        });
      },
      appendToPlayerList: function(id) {
        remot.appendToPlayerList(id, function(err,done) {
          debug("appendToPlayerList command response: ",err,"done:",done);
          if ( err ) {
            d10notification.notify("Failed to add song to the player list",d10notification.TYPE_ERROR);
          } else {
            d10notification.notify("Song added to the player list");
          }
        });
      },
      mixSong: function(mixLabel, mixDescription, id) {
        remot.mixSong(mixLabel, mixDescription, id, function(err,done) {
          debug("mixSong command response: ",err,"done:",done);
          if ( err ) {
            d10notification.notify("Failed to start the mix",d10notification.TYPE_ERROR);
          } else {
            d10notification.notify("Mix started");
          }
        });
      }
    };
  }])
  .factory("d10rcView",["$rootScope","d10artistTokenizer","$timeout",
           function($rootScope, d10artistTokenizer, $timeout) {
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
      $timeout(function() {
        debug("Broadcasting playlist:changed");
        $rootScope.$broadcast("playlist:changed");
      });
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
      setVolume(response.volume);
      updatePlaylist(response.playlist);
      updateIndex(response.index);
    };
    
    function setVolume(volume) {
      rcView.volume = volume * 100;
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
        rcView.currentTime = 0;
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
        setVolume(volume);
      });
    });
    
    return rcView;
    
  }])
  ;
  
  
})();