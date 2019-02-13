"use strict";
define([], function() {

  var types = {
    "audio/ogg": "ogg",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
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

  var chooseBestType = function(audioTypes) {
    var result = {};
    var defaultResult = {};
    for (var type in audioTypes) {
      if ( type == "audio/ogg" ) {
        defaultResult.type = type;
        defaultResult.url = audioTypes[type];
      } else {
        if ( canPlayType(type) ) {
          result.type = type;
          result.url = audioTypes[type];
          return result;
        }
      }
    };
    return defaultResult;
  };

  return {
    setCapabilities: setCapabilities,
    canPlaytype: canPlayType,
    chooseBestType: chooseBestType
  };

});
