// eslint-disable-next-line no-undef,import/no-amd
define(['js/domReady', 'js/d10.router', 'js/playlist', 'js/d10.rest', 'js/d10.templates',
  'js/d10.toolbox', 'js/d10.imageUtils', 'js/config', 'js/d10.restHelpers'],
(foo, router, playlist, rest, tpl, toolbox, imageUtils, config, restHelpers) => {
  const whatsNewTtl = 3600000;
  function welcome(ui) {
    let lastRefresh = 0;
    function shouldRefresh() {
      return ((new Date().getTime() - whatsNewTtl) > lastRefresh);
    }
    ui.find('.welcomeBox[data-target]').click(function onClick() {
      router.navigateTo($(this).attr('data-target'));
      return false;
    });

    function findLatest(then) {
      const cursor = new restHelpers.mongoPagedCursor(rest.song.list.creations);
      let results = [];
      let requests = 0;
      function appendResults() {
        if (requests === 4) {
          if (results.length) {
            then(results);
          }
          return;
        }
        requests++;
        if (!cursor.hasMoreResults()) {
          return appendResults();
        }
        cursor.getNext((err, res) => {
          if (res) {
            results = results.concat(res);
          }
          appendResults();
        });
      }
      appendResults();
    }


    const undefinedAlbum = '__undefined_album__';


    function arrangeLatest(latest, then) {
      // 			debug("arrangeLatest: working with ", latest.length, "songs");
      const songs = [...latest];
      const songsByAlbum = {};
      const songsByAlbumMeta = {};

      for (const i in songs) {
        let album = undefinedAlbum;
        if (songs[i].album) {
          album = songs[i].album;
        }
        if (!songsByAlbum[album]) {
          songsByAlbum[album] = [];
          songsByAlbumMeta[album] = { artists: [], images: [], genres: {} };
        }
        songsByAlbum[album].push(songs[i]);
        if (songsByAlbumMeta[album].artists.indexOf(songs[i].artist) < 0) {
          songsByAlbumMeta[album].artists.push(songs[i].artist);
        }
        if (songs[i].images && songs[i].images.length) {
          for (const j in songs[i].images) {
            if (songsByAlbumMeta[album].images.indexOf(songs[i].images[j].filename) < 0) {
              songsByAlbumMeta[album].images.push(songs[i].images[j].filename);
            }
          }
        }
        if (songs[i].genre) {
          if (songs[i].genre in songsByAlbumMeta[album].genres) {
            songsByAlbumMeta[album].genres[songs[i].genre]++;
          } else {
            songsByAlbumMeta[album].genres[songs[i].genre] = 1;
          }
        }
      }
      // 			for ( var i in songsByAlbum ) {
      // 				debug(i, songsByAlbum[i], songsByAlbumMeta[i]);
      // 			}
      then(songsByAlbum, songsByAlbumMeta);
    }


    const artistsLimitChars = 140;


    function displayLatest(songsByAlbum, songsByAlbumMeta) {
      const widgets = [];
      for (const i in songsByAlbum) {
        if (i == undefinedAlbum) {
          continue;
        }
        const songs = songsByAlbum[i];
        const image = songsByAlbumMeta[i].images.length ? songsByAlbumMeta[i].images[0] : '';
        const artists = songsByAlbumMeta[i].artists;
        const genre = toolbox.keyOfHighestValue(songsByAlbumMeta[i].genres);
        let artistsTokenized = '';
        for (const a in artists) {
          if (artistsTokenized.length) artistsTokenized += ', ';
          artistsTokenized += artists[a];
          if (artistsTokenized.length > artistsLimitChars) {
            artistsTokenized += ', ...';
            break;
          }
        }
        const widget = $(tpl.mustacheView('welcome.wnWidget.album',
          {
            album: i,
            songs: songs.length,
            artists: artistsTokenized,
            genre: genre ? [genre] : [],
            image_url: image ? imageUtils.getImageUrl(image) : imageUtils.getAlbumDefaultImage(),
          })).data('songs', songs);
        widgets.push(
          widget,
        );
      }
      const whatsNew = ui.find('.whatsNew');


      const container = whatsNew.find('.body');
      container.empty();
      if (widgets.length % 2 != 0) {
        widgets.pop();
      }
      if (widgets.length) {
        $.each(widgets, (k, v) => {
          container.append(v);
        });
        whatsNew.slideDown();
      }
    };
    this.bindEvents = function bindEvents() {
      ui.find('.whatsNew')
        .delegate('.albumWidget .head', 'click', function onClick() {
          router.navigateTo(['library', 'albums', $(this).attr('data-album')]);
        })
        .delegate('.albumWidget img', 'click', function onClick() {
          const widget = $(this).closest('.albumWidget');
          router.navigateTo(['library', 'albums', widget.find('.head').attr('data-album')]);
        })
        .delegate('.albumWidget .whatsNewGenre', 'click', function onClick() {
          router.navigateTo(['library', 'genres', $(this).attr('data-genre')]);
        })
        .delegate('.whatsNewWidget .footer', 'click', function onClick() {
          const songs = JSON.parse(JSON.stringify($(this).closest('.whatsNewWidget').data('songs')));
          const songsHTML = tpl.song_template(songs);
          playlist.append($(songsHTML));
        });
    };
    this.whatsNew = function whatsNew() {
      if (shouldRefresh()) {
        findLatest((latest) => {
          arrangeLatest(latest, displayLatest);
          lastRefresh = new Date().getTime();
        });
      }
    };
  }

  const w = new welcome($('#welcome'));
  w.bindEvents();
  const welcomeRouteHandler = function () { this._activate('main', 'welcome', this.switchMainContainer); };
  router.route('welcome', 'welcome', welcomeRouteHandler);
  router.bind('route:welcome', () => {
    w.whatsNew();
  });
  return w;
});
