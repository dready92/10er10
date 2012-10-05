"use strict";
define(["js/domReady","js/d10.playlistModule", "js/playlist", "js/user", "js/d10.events", "js/d10.mix"], 
       function(foo, playlistModule, playlist, user, pubsub, d10mix) {


  var module = new playlistModule("mix",{},{});
  var uiTimeout = null;
  var ui = $("#controls div.mixControl"),
      select = ui.find("select"),
      button = ui.find("button"),
      readyUi = ui.find(".mixStatus"),
      notPreloaded = ui.find(".notPreloaded"),
      preloaded = ui.find(".preloaded");

  var currentMix;
  var mixes = [];
  mixes.push (
    {
      label: "explosion",
      builder: function() {
        var steps = [];
        steps.push(
          new d10mix.mixStep(
            "explosion",
            0,
            0,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
              startPlaybackOnBegin: true
            })
        );
        steps.push(
          new d10mix.mixStep(
            "currentTrack",
            0.1,
            0.1,
            "volume",
            0
          )
        );
        steps.push(
          new d10mix.mixStep(
            "nextTrack",
            4,
            1,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: 0,
              startPlaybackOnBegin: true
            }
          )
        );
        var assets = [{label: "explosion",url: "css/mix/Explosion_Ultra_Bass-Mark_DiAngelo-1810420658.ogg"}];
        return new d10mix.mix(assets, steps);
      }
    }
  );

  mixes.push (
    {
      label: "bombDrop",
      builder: function() {
        var steps = [];
        steps.push(
          new d10mix.mixStep(
            "bombdrop",
            0,
            8,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
              startPlaybackOnBegin: true
            })
        );
        steps.push(
          new d10mix.mixStep(
            "explosion",
            8,
            0,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
              startPlaybackOnBegin: true
            })
        );
        steps.push(
          new d10mix.mixStep(
            "currentTrack",
            0.1,
            6,
            "volume",
            0
          )
        );
        steps.push(
          new d10mix.mixStep(
            "nextTrack",
            12,
            1,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: 0,
              startPlaybackOnBegin: true
            }
          )
        );
        var assets = [{label: "explosion",url: "/css/mix/Explosion_Ultra_Bass-Mark_DiAngelo-1810420658.ogg",},
          {label: "bombdrop",url: "/css/mix/Bomb_Drop-__-447768269.ogg",}
        ];
        return new d10mix.mix(assets, steps);
      }
    }
  );
  
  mixes.forEach(function(mix) {
    var option = $("<option/>");
    option.attr("value",mix.label);
    option.text(mix.label);
    select.append(option);
  });
  
  var nextSongPreloaded = false;
  pubsub.topic("playlist:currentSongChanged").subscribe(function() {
    debug("currentSongChanged: ",playlist.driver().isNextPreloaded());
    nextSongPreloaded = playlist.driver().isNextPreloaded(); 
    updatePreloadState();
  });
  pubsub.topic("nextSongPreloaded").subscribe(function() { 
    debug("nextSongPreloaded: ",playlist.driver().isNextPreloaded());
    nextSongPreloaded = true; 
    updatePreloadState();
  });

  var updatePreloadState = function() {
    if ( nextSongPreloaded == true ) {
      notPreloaded.hide();
      preloaded.show();
    } else {
      preloaded.hide();
      notPreloaded.show();
    }
  };
  
  var statusNone = function() {
    readyUi.text("-");
  };
  
  var statusLoading = function() {
    readyUi.text("...");
  };
  
  var statusError = function() {
    readyUi.text("X");
  };
  
  var statusOk = function() {
    readyUi.text("OK");
  };
  
  var getMix = function(label) {
    for ( var i in mixes ) {
      if ( mixes[i].label == label ) {
        return mixes[i].builder();
      }
    }
  };
  
  var onMixLoaded = function(mix) {
    if ( mix === currentMix ) {
      statusOk();
      button.removeAttr("disabled");
    }
  };
  
  var startMix = function() {
    playlist.driver().launchMix(currentMix);
    select.get(0).selectedIndex = 0;
    button.attr("disabled","true");
    statusNone();
  };
  
  button.bind("click",startMix);
  
  select.bind("change",function() {
    var val = select.val();
    debug("val",val);
    button.attr("disabled",true);
    if ( val == "none" ) {
      statusNone();
      return ;
    }
    var mix = getMix(val);
    statusLoading();
    currentMix = mix;
    mix.load(function() {
      onMixLoaded(mix);
    });
  });
  playlist.modules[module.name] = module;
  return module;
});




