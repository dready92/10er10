/* eslint-disable prefer-arrow-callback */
/* eslint-disable no-undef */
/* eslint-disable import/no-amd */
define(['js/d10.events', 'js/playlist', 'js/d10.imageUtils'], (pubsub, playlist, imageUtils) => {
  let MEDIA_PLAYING = 'playing';
  let MEDIA_PAUSED = 'paused';
  let MEDIA_OFF = 'none';
  let song;
  let duration;
  if (!navigator || !navigator.mediaSession) {
    return;
  }

  let supportPositionState = !!navigator.setPositionState;

  pubsub.topic('playlist:currentSongChanged').subscribe(onSongChange);
  pubsub.topic('playlist:ended').subscribe(onEnded);
  pubsub.topic('playlist:paused').subscribe(onPaused);
  pubsub.topic('playlist:resumed').subscribe(onResumed);
  if (supportPositionState) {
    pubsub.topic('playlist:currentTimeUpdate').subscribe(onTimeUpdate);
  }

  navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
  navigator.mediaSession.setActionHandler('nexttrack', playNext);


  function onSongChange() {
    song = playlist.current();
    duration = playlist.driver().current().duration;
    let md = {
      title: song.find('.title').text(),
      artist: song.find('.artist').text(),
      album: song.find('.album').text(),
      artwork: getArtwork(song),
    };
    navigator.mediaSession.metadata = new MediaMetadata(md);
    if (supportPositionState) {
      navigator.mediaSession.setPositionState({
        duration,
        position: 0,
      });
    }
  }

  function onEnded() {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = MEDIA_OFF;
    if (supportPositionState) {
      navigator.mediaSession.setPositionState(null);
    }
    song = null;
  }

  function onPaused() {
    navigator.mediaSession.playbackState = MEDIA_PAUSED;
  }

  function onResumed() {
    navigator.mediaSession.playbackState = MEDIA_PLAYING;
  }

  function onTimeUpdate(e) {
    let totalSecs = parseInt(e.currentTime, 10);
    navigator.mediaSession.setPositionState({
      duration,
      position: totalSecs,
    });
  }

  function playPrevious() {
    playlist.playPrevious();
  }

  function playNext() {
    playlist.playNext();
  }

  function getArtwork(sng) {
    let artwork = [];
    let images = sng.data('image-alternatives');
    if (!images) {
      return artwork;
    }

    let url = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    if (url[url.length - 1] !== '/') {
      url += '/';
    }

    Object.keys(images).forEach(function eachImage(imageName) {
      Object.keys(images[imageName]).forEach(function eachAlt(imageSize) {
        const imgDef = images[imageName][imageSize];
        artwork.push({
          src: url + imageUtils.getImageUrl(imageUtils.getAlternateFileName(imageName, imgDef)),
          sizes: `${imgDef.width}x${imgDef.height}`,
        });
      });
    });
    return artwork;
  }
});
