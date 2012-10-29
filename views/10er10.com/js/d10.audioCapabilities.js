"use strict";
define([], function() {

  var types = {
    "audio/ogg": "ogg",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav"
  };

  
  var audio = null;

  var setCapabilities = function(a) {
    debug("Set audio capabilities: ",a);
    audio = a;
  };

  var canPlayType = function(type) {
    if ( audio===null ) {
      return ;
    }
    if ( type in types ) {
      if ( types[type] in audio && audio[types[type]] == "maybe" || audio[types[type]] == "probably" ) {
        return true;
      }
    }
    return false;
  };

  return {
    setCapabilities: setCapabilities,
    canPlaytype: canPlayType
  };
  
});