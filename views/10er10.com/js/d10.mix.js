"use strict";
define(["js/d10.toolbox"], function(toolbox) {

  var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  
  // opts.propertyStartValue , opts.stopPlaybackOnEnd, opts.startPlaybackOnBegin
  function mixStep (target, startTime, duration, property, propertyValue, opts) {
    this.PROPERTY_VALUE_CURRENT_VOLUME = "PROPERTY_VALUE_CURRENT_VOLUME";
    this.target = target;
    this.startTime = startTime;
    this.duration = duration;
    this.property = property;
    this.propertyValue = propertyValue;
    this.opts = opts || {};
  }

  // assets: [ {label: "someCry", url: "Audio Url"} ]
  function mix ( assets, ms ) {
    var startTime = 0;
    var ready = false;
    var uidCount = 1;
    var mixStepsByStartTime = {};
    var mixStepsByUid = {};
    var notStarted = [];
    var started = [];
    var ended = [];
    var media = {
      currentTrack: null,
      nextTrack: null
    };
    //order mixSteps by startTime
    ms.forEach(function(mixStep) {
      mixStep.uid = uidCount++;
      mixStepsByUid[mixStep.uid] = mixStep;
      notStarted.push(mixStep.uid);
      if ( ms.startTime in mixStepsByStartTime ) {
        mixStepsByStartTime[ms.startTime].push(mixStep.uid);
      } else {
        mixStepsByStartTime[ms.startTime]= [mixStep.uid];
      }
    });
    
    //load assets
    this.load = function(then) {
      //create HTMLAudioElement from assets list
      if ( !assets.length ) {
        then();
      }
      var toLoad = 0;
      var onCanPlayThrough = function() {
        debug("Asset loaded, still",toLoad,"assets to wait");
        toLoad--;
        if( toLoad == 0 ) {
          ready = true;
          then();
        }
      };
      for (var i = 0; i < assets.length; i++) {
        debug("Creating audio asset",assets[i].label);
        toLoad++;
        var audio  = document.createElement('audio');
        audio.volume=$("body").data("volume");
        audio.autobuffer = true;
        audio.preload = "auto";
        audio.addEventListener("canplaythrough", onCanPlayThrough, true);
        for ( var index in url ) {
            var s = document.createElement("source");
            s.setAttribute("src", assets[i].url);
            s.setAttribute("type", "audio/ogg");
            audio.appendChild(s);
        }
        audio.load();
        media[assets[i].label] = audio;
      };
    };

    this.start = function(currentTrack, nextTrack) {
      if (!ready ) {
        return false;
      }
      startTime = toolbox.microtime();
      media.currentTrack = currentTrack.audio;
      media.nextTrack = nextTrack.audio;
      requestAnimationFrame(onFrame);
      return true;
    };

    //this should add step's uid in started
    var startStep = function(step, currentDuration) {
      var audio;
      if ( step.target in media ) {
        audio = media[step.target];
      } else {
        return false;
      }
      if ( step.opts.propertyStartValue ) {
        audio[step.property] = step.opts.propertyStartValue == step.PROPERTY_VALUE_CURRENT_VOLUME ? $("body").data("volume") : step.opts.propertyStartValue;
      }
      step.__startTime = currentDuration;
      step.__startValue = audio[step.property];
      if ( step.opts.startPlaybackOnBegin && audio.paused) {
        audio.play();
      }
      started.push(step.uid);
    };
    
    //this should return false if process ended
    var processStepFrame = function(step, currentDuration) {
      var audio = media[step.target];
      var stepCurrentDuration = currentDuration - step.__startTime;
      var propertyValue = step.propertyValue == step.PROPERTY_VALUE_CURRENT_VOLUME ? $("body").data("volume") : step.propertyValue;
      //check if we are stopped
      if ( stepCurrentDuration > step.duration ) {
        audio[step.property] = propertyValue;
        //should we stop playback ?
        if ( step.opts.stopPlaybackOnEnd && !media.paused ) {
          media.pause();
        }
        return false;
      }
      //set property value
      
      var newValue = step.__startValue + ( ( step.__startValue - propertyValue ) / step.duration * stepCurrentDuration );
      audio[step.property] = newValue;
    };
    
    var onFrame = function() {
      var currentDuration = toolbox.microtime() - startTime;
      
      //special End of work case
      if ( started.length == 0 && notStarted.length == 0 ) {
        return ;
      }
      
      
      //should I start a step
      var newNotStarted = [];
      for ( var i in notStarted ) {
        if ( mixStepsByUid[notStarted[i]].startTime < currentDuration ) {
          startStep(mixStepsByUid[notStarted[i]], currentDuration);
        } else {
          newNotStarted.push(notStarted[i]);
        }
      }
      notStarted = newNotStarted;
      //should I process a step's frame
      var newStarted = [];
      for ( var i in started ) {
        var goOn = processStepFrame( mixStepsByUid[started[i]], currentDuration );
        if ( goOn !== false ) {
          newStarted.push(started[i]);
        }
      }
      started = newStarted;
      requestAnimationFrame(onFrame);
    };
    
  };
  
  
  return {
    mixStep: mixStep,
    mix: mix
  };
  
});


