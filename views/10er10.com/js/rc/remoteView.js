"use strict";

(function() {

angular.module("d10remoteView",[]);
angular.module("d10remoteView").directive("d10remoteViewContainer", function() {
  return {
    restrict: 'A',
    templateUrl: '../html/rc/remoteDisplay/container.html',
    replace: true
  };
});


angular.module("d10remoteView").controller("d10remoteViewController", 
                                           [
                                           "$scope", 
                                           "d10artistTokenizer",
                                           "d10rc",
                                           function(
                                             $scope, 
                                             d10artistTokenizer,
                                             d10remoteControl) {
  var pubsub = require("js/d10.events");
  var rest = require("js/d10.rest");
  var remotConnection = require("js/d10.remot.master.connection");
  var remot = require("js/d10.websocket.protocol.remot");
  $scope.resetRemoteView = function() {
    $scope.remoteView.song = null;
    $scope.remoteView.paused = true;
    $scope.remoteView.currentTime = 0;
    $scope.remoteView.index = -1;
    $scope.remoteView.expandedIndex = -1;
    $scope.remoteView.playlist = [];
    $scope.remoteView.volume = 0;
    $scope.remoteView.listening = false;
  };
  
  $scope.remoteView = {};
  $scope.resetRemoteView();
  
  $scope.toggleExpandedIndex = function(index) {
    if ( $scope.remoteView.expandedIndex === index ) {
      $scope.remoteView.expandedIndex = -1;
    } else {
      $scope.remoteView.expandedIndex = index;
    }
  };
  $scope.remoteControl = d10remoteControl;
  /*
  $scope.remoteControl = {};
  
  $scope.remoteControl.playSongAtIndex = function(index) {
    remot.playSongAtIndex(index, function(err,resp) {
      debug("playSongAtIndex returns : ",err,resp);
    });
  };
  
  $scope.remoteControl.removeSongAtIndex = function(index) {
    remot.removeSongAtIndex(index, function(err,resp) {
      debug("removeSongAtIndex returns : ",err,resp);
    });
  };
  
  $scope.remoteControl.play = function(evt) {
    debug("sending play command to peer");
    remot.play(function(err) {
      debug("play command response: ",err);
    });
    evt.stopPropagation();
    evt.preventDefault();
  };
  $scope.remoteControl.pause = function(evt) {
    debug("sending pause command to peer");
    remot.pause(function(err) {
      debug("pause command response: ",err);
    });
    evt.stopPropagation();
    evt.preventDefault();
  };
  $scope.remoteControl.playNext = function() {
    remot.next(function(err,done) {
      debug("next command response: ",err,"done:",done);
    });
  };
  $scope.remoteControl.playPrevious = function() {
    remot.previous(function(err,done) {
      debug("previous command response: ",err,"done:",done);
    });
  };
  */
  pubsub.topic("remot-connection").subscribe(connectionStatusChanged);
  
  function updatePlaylist(songs) {
    $scope.remoteView.expandedIndex = -1;
    if ( !songs.length ) {
      $scope.remoteView.playlist = songs;
      $scope.remoteView.index = -1;
      $scope.remoteView.song = null;
      $scope.remoteView.currentTime = 0;
    } else {
      d10artistTokenizer(songs);
      $scope.remoteView.playlist = songs;
    }
  };
  
  function updateIndex(index) {
    if ( !$scope.remoteView.playlist[index] ) {
      $scope.remoteView.index = -1;
      $scope.remoteView.song = null;
    } else {
      $scope.remoteView.index = index;
      $scope.remoteView.song = $scope.remoteView.playlist[index];
    }
  };
  
  function fillFromFullStatus(response) {
    $scope.remoteView.currentTime = response.currentTime;
    $scope.remoteView.paused = response.paused;
    $scope.remoteView.volume = response.volume;
    updatePlaylist(response.playlist);
    updateIndex(response.index);
  };
  
  function connectionStatusChanged(status) {
    debug("remoteView: connectionStatusChanged",status);
    if ( status == remotConnection.STATUS_OFF ) {
      $scope.remoteView.listening = false;
    } else {
      remot.fullPlayStatus(function(err,response) {
        debug("fullPlayStatus returns, ",err,response);
        if ( err ) {
          return ;
        }
        if ( response.playlist.length == 0 ) {
          $scope.$apply(function() {
            fillFromFullStatus(response);
            if ( remotConnection.status() == remotConnection.STATUS_PEERED ) {
              $scope.remoteView.listening = true;
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
            $scope.$apply(function() {
              fillFromFullStatus(response);
              if ( remotConnection.status() == remotConnection.STATUS_PEERED ) {
                $scope.remoteView.listening = true;
              }
            });
          }
        });
      });
    }
  };
  
  pubsub.topic("remot:smallPlayStatus").subscribe(function(response) {
    if ( !$scope.remoteView.listening ) {
      return ;
    }
    $scope.$apply(function() { 
      $scope.remoteView.paused = response.paused;
      $scope.remoteView.currentTime = response.currentTime;
      updateIndex(response.index);
    });
  });
  
  pubsub.topic("remot:playlist:ended").subscribe(function() {
    if ( !$scope.remoteView.listening ) {
      return ;
    }
    $scope.$apply(function() { $scope.remoteView.paused = true; });
  });
  pubsub.topic("remot:playlist:paused").subscribe(function() {
    if ( !$scope.remoteView.listening ) {
      return ;
    }
    $scope.$apply(function() { $scope.remoteView.paused = true; });
  });
  pubsub.topic("remot:playlist:resumed").subscribe(function() {
    if ( !$scope.remoteView.listening ) {
      return ;
    }
    $scope.$apply(function() { $scope.remoteView.paused = false; });
  });
  pubsub.topic("remot:playlist:currentSongChanged").subscribe(function(index, id) {
    if ( !$scope.remoteView.listening ) {
      return ;
    }
    $scope.$apply(function() {
      $scope.remoteView.paused = false;
      updateIndex(index);
    });
  });
  
  pubsub.topic("remot:playlistUpdate").subscribe(function(ids, index) {
    if ( !$scope.remoteView.listening ) {
      return ;
    }
    if ( !ids.length ) {
      $scope.$apply(function() {
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
        $scope.$apply(function() {
          updatePlaylist(resp);
          updateIndex(index);
        });
      }
    });
  });
  
  pubsub.topic("remot:playlist:volumeChanged").subscribe(function(volume) {
    if ( !$scope.remoteView.listening ) {
      return ;
    }
    $scope.$apply(function() {
      $scope.remoteView.volume = volume;
    });
  });
}]);


})();