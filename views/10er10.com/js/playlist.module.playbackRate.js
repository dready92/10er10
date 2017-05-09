define(['js/domReady', 'js/playlist', 'js/d10.playlistModule'], function (foo, playlist, playlistModule) {

  initializeListeners();
  var ui = $('#player .playbackRate');

  function initializeListeners() {
    var doc = $(document);
    doc.bind('keydown', 'f', incrementPlaybackRate);
    doc.bind('keydown', 's', decrementPlaybackRate);
  }

  function incrementPlaybackRate() {
    var current = playlist.driver().current();
    if (current) {
      playlist.incrementPlaybackRate();
      updateView(current);
    }
  }

  function decrementPlaybackRate() {
    var current = playlist.driver().current();
    if (current) {
      playlist.decrementPlaybackRate();
      updateView(current);
    }
  }

  function updateView(current) {
    if (!current) {
      ui.hide();
      return;
    }
    var playbackRate = Math.floor(current.audio.playbackRate * 100);
    if (playbackRate === 100) {
      ui.hide();
      return;
    }
    ui.text(playbackRate + '%').show();
  }

  var module = new playlistModule('playbackRate',{
    'playlist:currentSongChanged': function () {
      updateView();
    },
    'playlist:ended': function () {
      updateView();
    }
  }, {});

  playlist.modules[module.name] = module;

  return module;
});