/* eslint-disable no-plusplus */
/* eslint-disable prefer-destructuring */
// eslint-disable-next-line no-undef,import/no-amd,prefer-arrow-callback
define(['js/d10.templates', 'js/d10.toolbox', 'js/d10.imageUtils', 'js/d10.artistTokenizer'],
  (tpl, toolbox, imageUtils, artistTokenizer) => {
    function singleAlbumParser(songs) {
      if (!Array.isArray(songs)) {
        return singleAlbumParser2(songs);
      }

      const albumData = {
        duration: 0, songsNb: songs.length, artists: [], genres: [], image_class: [], songs: '', e_artists: [], e_genres: [], image_url: null, album: '', date: [],
      };

      const artists = {};
      const genres = {};
      const images = {};
      const imageAlternatives = {};
      songs.forEach((song) => {
        albumData.album = song.album || '';
        song.artistsToken = artistTokenizer(song, true);
        song.title = song.artistsToken[1];
        song.artistsToken[0].forEach((a) => {
          artists[a] = 1;
        });
        if (song.genre) {
          genres[song.genre] = 1;
        }
        albumData.duration += song.duration;
        if (song.images) {
          song.images.forEach((i) => {
            if (i.alternatives) {
              imageAlternatives[i.filename] = i.alternatives;
            }
            if (images[i.filename]) {
              images[i.filename]++;
            } else {
              images[i.filename] = 1;
            }
          });
        }
        if (song.date) {
          albumData.date.push(song.date);
        }
        albumData.songs += tpl.song_template(song);
      });
      albumData.date.sort((a, b) => a - b);
      Object.keys(artists).forEach((a) => {
        const e = encodeURIComponent(a);
        albumData.artists.push({ name: a, encoded: e });
        albumData.e_artists.push(e);
      });
      Object.keys(genres).forEach((g) => {
        const e = encodeURIComponent(g);
        albumData.artists.push({ name: g, encoded: e });
        albumData.e_artists.push(e);
      });
      const d = new Date(1970, 1, 1, 0, 0, albumData.duration);
      let h = d.getHours();
      const m = d.getMinutes();
      albumData.minutes = m < 10 ? [`0${m}`] : [m];
      albumData.hours = [];
      if (h) {
        albumData.hours.push(h);
      }
      albumData.image_url = toolbox.keyOfHighestValue(images);
      albumData.e_album = encodeURIComponent(albumData.album);
      if (albumData.image_url) {
        if (imageAlternatives[albumData.image_url]) {
          albumData.image_alternatives = {};
          Object.keys(imageAlternatives[albumData.image_url]).forEach((size) => {
            const alternative = imageAlternatives[albumData.image_url][size];
            albumData.image_alternatives[size] = imageUtils.getImageUrl(
              imageUtils.getAlternateFileName(albumData.image_url, alternative),
            );
          });
        }
        albumData.image_url = imageUtils.getImageUrl(albumData.image_url);
      } else {
        albumData.image_url = imageUtils.getAlbumDefaultImage();
        albumData.image_class.push('dropbox');
      }
      return albumData;
    }

    function singleAlbumParser2(album) {
      const d = new Date(1970, 1, 1, 0, 0, album.duration);
      const h = d.getHours();
      const m = d.getMinutes();
      const artists = {};
      const response = {
        album: album._id,
        e_album: encodeURIComponent(album._id),
        artists: [],
        e_artists: [],
        genres: album.genres.map(g => ({ name: g, encoded: encodeURIComponent(g) })),
        e_genres: album.genres.map(encodeURIComponent),
        duration: album.duration,
        imageAlternatives: {},
        images: {},
        image_class: [],
        date: [],
        songs: '',
        minutes: m < 10 ? [`0${m}`] : [m],
        hours: h ? [h] : [],
      };
      album.songs.forEach((song) => {
        const newSong = { ...song };
        newSong.artistsToken = [newSong.tokenartists, newSong.tokentitle];
        newSong.title = song.tokentitle;
        newSong.artistsToken[0].forEach((a) => {
          artists[a] = 1;
        });
        if (song.images) {
          song.images.forEach((i) => {
            if (i.alternatives) {
              response.imageAlternatives[i.filename] = i.alternatives;
            }
            if (response.images[i.filename]) {
              response.images[i.filename]++;
            } else {
              response.images[i.filename] = 1;
            }
          });
        }
        if (song.date) {
          response.date.push(song.date);
        }
        response.songs += tpl.song_template(song);
      });

      response.date.sort((a, b) => a - b);
      Object.keys(artists).forEach((a) => {
        const e = encodeURIComponent(a);
        response.artists.push({ name: a, encoded: e });
        response.e_artists.push(e);
      });
      response.image_url = toolbox.keyOfHighestValue(response.images);
      if (response.image_url) {
        if (response.imageAlternatives[response.image_url]) {
          response.image_alternatives = {};
          Object.keys(response.imageAlternatives[response.image_url]).forEach((size) => {
            const alternative = response.imageAlternatives[response.image_url][size];
            response.image_alternatives[size] = imageUtils.getImageUrl(
              imageUtils.getAlternateFileName(response.image_url, alternative),
            );
          });
        }
        response.image_url = imageUtils.getImageUrl(response.image_url);
      } else {
        response.image_url = imageUtils.getAlbumDefaultImage();
        response.image_class.push('dropbox');
      }
      return response;
    }

    function multiAlbumsParser(songs) {
      const back = [];
      let sap = new streamAlbumParser(((album) => { back.push(album); }));
      sap.onData(songs);
      sap.end();
      sap = null;
      return back;
    }

    function streamAlbumParser(onAlbumComplete) {
      let currentAlbumName = null; let
        currentAlbumSongs = [];

      this.onData = function onData(songs) {
        songs.forEach((song) => {
          let key = song.album ? song.album : '__no_album_name__';
          if (currentAlbumName === key) {
            return currentAlbumSongs.push(song);
          }
          if (currentAlbumSongs.length) {
            onAlbumComplete(singleAlbumParser(currentAlbumSongs));
            currentAlbumSongs = [];
          }
          currentAlbumName = key;
          currentAlbumSongs.push(song);
        });
      };

      this.end = function () {
        if (currentAlbumSongs.length) {
          onAlbumComplete(singleAlbumParser(currentAlbumSongs));
          currentAlbumSongs = [];
        }
      };
    }



    return {
      singleAlbumParser,
      multiAlbumsParser,
      streamAlbumParser,
    };
  });
