"use strict";
define(["js/domReady","js/d10.playlistModule", "js/playlist", "js/user", "js/d10.events", "js/d10.mix"], 
       function(foo, playlistModule, playlist, user, pubsub, d10mix) {


  var module = new playlistModule("mix",{},{});
  var uiTimeout = null;
  var ui = $("#controls div.mixControl"),
      select = ui.find("select"),
       description = ui.find(".description"),
      button = ui.find("button"),
      notPreloaded = ui.find(".notPreloaded"),
      preloaded = ui.find(".preloaded");

  var currentMix;
  var mixes = [];
  
  mixes.push (
    {
      label: "Very fast fade",
      description: "Very fast fade out/in (3 secs)",
      builder: function() {
        var steps = [];
        steps.push(
          new d10mix.mixStep(
            "currentTrack",
            0,
            3,
            "volume",
            0,
            {stopPlaybackOnEnd: true}
          )
        );
        steps.push(
          new d10mix.mixStep(
            "nextTrack",
            0,
            3,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: 0,
              startPlaybackOnBegin: true
            }
          )
        );
        return new d10mix.mix([], steps);
      }
    }
  );
  
  mixes.push (
    {
      label: "Fast fade",
      description: "Fast fade out/in (5 secs)",
      builder: function() {
        var steps = [];
        steps.push(
          new d10mix.mixStep(
            "currentTrack",
            0,
            4,
            "volume",
            0,
            {stopPlaybackOnEnd: true}
          )
        );
        steps.push(
          new d10mix.mixStep(
            "nextTrack",
            1,
            5,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: 0,
              startPlaybackOnBegin: true
            }
          )
        );
        return new d10mix.mix([], steps);
      }
    }
  );
  
  mixes.push (
    {
      label: "Medium fade",
      description: "Medium fade out/in (10 secs)",
      builder: function() {
        var steps = [];
        steps.push(
          new d10mix.mixStep(
            "currentTrack",
            0,
            9,
            "volume",
            0,
            {stopPlaybackOnEnd: true}
          )
        );
        steps.push(
          new d10mix.mixStep(
            "nextTrack",
            1,
            10,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: 0,
              startPlaybackOnBegin: true
            }
          )
        );
        return new d10mix.mix([], steps);
      }
    }
  );
  
  mixes.push (
    {
      label: "Long fade",
      description: "Long fade out/in (15 secs)",
      builder: function() {
        var steps = [];
        steps.push(
          new d10mix.mixStep(
            "currentTrack",
            0,
            13,
            "volume",
            0,
            {stopPlaybackOnEnd: true}
          )
        );
        steps.push(
          new d10mix.mixStep(
            "nextTrack",
            1.7,
            15,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: 0,
              startPlaybackOnBegin: true
            }
          )
        );
        return new d10mix.mix([], steps);
      }
    }
  );
  
  mixes.push (
    {
      label: "explosion",
      description: "An explosion ends up the current song, then the new song starts almost directly",
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
            0,
            {stopPlaybackOnEnd: true}
          )
        );
        steps.push(
          new d10mix.mixStep(
            "nextTrack",
            3,
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
      description: "A bomb is falling, an explosion ends up the current song, then the new song starts almost directly",
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
            0,
            {stopPlaybackOnEnd: true}
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
    button.text("<< Choose");
  };
  
  var statusLoading = function() {
    button.text("Loading");
  };
  
  var statusError = function() {
    button.text("Error");
  };
  
  var statusOk = function() {
    button.text("Fire !");
  };
  
  var getMix = function(label) {
    for ( var i in mixes ) {
      if ( mixes[i].label == label ) {
        return mixes[i].builder();
      }
    }
  };
  
  var getMixDescription = function(label) {
    for ( var i in mixes ) {
      if ( mixes[i].label == label ) {
        return mixes[i].description;
      }
    }
  };
  
  var onMixLoaded = function(mix) {
    if ( mix === currentMix ) {
      statusOk();
      button.removeAttr("disabled");
    }
  };
  
  var resetSelect = function () {
    select.get(0).selectedIndex = 0;
    setDescription("");
  };
  
  var startMix = function() {
    playlist.driver().launchMix(currentMix);
    resetSelect();
    button.attr("disabled","true");
    statusNone();
  };
  
  var setDescription = function(text) {
    if ( !text ) {
      description.slideUp("fast");
    } else if ( description.text().length == 0 ) {
      description.slideDown("fast");
    }
    description.text(text);
  };
  button.bind("click",startMix);
  
  select.bind("change",function() {
    var val = select.val();
    debug("val",val);
    button.attr("disabled",true);
    if ( val == "none" ) {
      statusNone();
      setDescription("");
      return ;
    }
    setDescription(getMixDescription(val));
    var mix = getMix(val);
    statusLoading();
    currentMix = mix;
    mix.load(function() {
      onMixLoaded(mix);
    });
  });
  playlist.modules[module.name] = module;
  statusNone();
  return module;
});




