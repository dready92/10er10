
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
      }
    };
  })
  ;
  
  
})();