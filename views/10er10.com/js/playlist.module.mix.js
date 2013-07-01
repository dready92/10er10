"use strict";
define(["js/domReady","js/d10.playlistModule", "js/playlist", "js/user",
       "js/d10.events", "js/d10.mix", "js/d10.templates", "js/d10.mixes"], 
       function(foo, playlistModule, playlist, user, pubsub, d10mix, templates, mixes) {


  var module = new playlistModule("mix",{},{});
  var uiTimeout = null;
  var ui = $("#container > .mix"),
      select = ui.find("select"),
       description = ui.find(".description"),
      button = ui.find("button"),
      notPreloaded = ui.find(".notPreloaded"),
      preloaded = ui.find(".preloaded");

  var currentMix;
    
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
    button.text(templates.mustacheView("playlist.module.mix.choose"))
      .attr("disabled","true");
  };
  
  var statusLoading = function() {
    button.text("Loading").attr("disabled","true");
  };
  
  var statusError = function() {
    button.text("Error").attr("disabled","true");
  };
  
  var statusOk = function() {
    button.text(templates.mustacheView("playlist.module.mix.launch"))
      .removeAttr("disabled");
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
    }
  };
  
  var resetSelect = function () {
    setDescription("");
    select.get(0).selectedIndex = 0;
  };
  
  var startMix = function() {
    playlist.driver().launchMix(currentMix);
    resetSelect();
    statusNone();
    setDescription("");
  };
  
  var setDescription = function(text) {
    if ( !text ) {
      if ( description.is(":visible") ) {
        description.slideUp("fast");
      } else {
        description.hide();
      }
    } else if ( description.text().length == 0 ) {
      description.slideDown("fast");
    }
    description.text(text);
  };
  
  button.bind("click",startMix);
  
  select.bind("change",function() {
    var val = select.val();
    debug("val",val);
    if ( val == "none" ) {
      statusNone();
      setDescription("");
      return ;
    }
    statusLoading();
    setDescription(select.children(":selected").attr("data-description"));
    var mix = getMix(val);
    currentMix = mix;
    mix.load(function() { onMixLoaded(mix); });
  });
  
  playlist.modules[module.name] = module;
  
  mixes.forEach(function(mix) {
    var option = $("<option/>");
    option.attr("value",mix.label)
          .attr("data-description", mix.description)
          .text(mix.label)
          .appendTo(select);
  });
  return module;
});




