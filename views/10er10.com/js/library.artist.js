// eslint-disable-next-line no-undef,import/no-amd
define(['js/d10.templates', 'js/d10.rest', 'js/d10.router', 'js/d10.dataParsers', 'js/d10.toolbox', 'js/playlist'],
  (tpl, rest, router, dataParsers, toolbox, playlist) => {
    function getRelatedArtists(artist, template) {
      rest.artist.related(artist, {
        load(err, data) {
          if (err) { return; }
          const template_data = {
            artist, artists: [], moreArtistsLink: [], moreArtists: [],
          }; const sorted = []; let source; const
            initialDisplayCount = 10;
          if (toolbox.count(data.artistsRelated)) {
            source = data.artistsRelated;
          } else {
            source = data.artists;
          }
          for (var i in source) {
            const currentArtist = { artist: i, weight: source[i] };
            let added = false;
            for (const j in sorted) {
              if (sorted[j].weight < currentArtist.weight) {
                sorted.splice(j, 0, currentArtist);
                added = true;
                break;
              }
            }
            if (!added) { sorted.push(currentArtist); }
          }
          if (!sorted.length) {
            return;
          }

          for (var i in sorted) {
            const artistFragment = { artist: sorted[i].artist, artist_e: sorted[i].artist.replace('"', '&quot;') };
            if (i < initialDisplayCount) {
              template_data.artists.push(artistFragment);
            } else {
              template_data.moreArtists.push(artistFragment);
            }
          }
          if (i >= initialDisplayCount) {
            template_data.moreArtistsLink.push(true);
          }
          const artistTemplate = $(tpl.mustacheView('library.content.artist.related', template_data));
          artistTemplate.find('.moreLink').click(function onClick() {
            $(this).remove();
            artistTemplate.find('.link.hidden').fadeIn();
          });
          artistTemplate.find('.artistLink').click(function onClick() {
            router.navigateTo(['library', 'artists', $(this).attr('name')]);
          });
          template.find('.relatedArtists').append(artistTemplate);
        },
      });
    }


    function bindEvents(template, topicdiv, categorydiv, topic, category, param) {
      template.find('span[name=all]').click(() => { router.navigateTo(['library', 'artists', '<all>']); });
      template.find('span.refresh').click(() => {
        onContainerCreation(topicdiv, categorydiv, topic, category, param);
      });
      template.find('button[name=see]').click(function onClick() {
        router.navigateTo(['library', 'albums', $(this).attr('data-album')]);
      });
      template.find('button[name=load]').click(function onClick() {
        const songs = $(this).closest('.oneAlbumRow').find('div.song').clone();
        playlist.append(songs);
      });
      template.find('button[name=loadAll]').click(function onClick() {
        const songs = $(this).closest('article').find('.all div.song').clone();
        playlist.append(songs);
      });
      template.find('.link[data-genre]').click(function onClick() {
        router.navigateTo(['library', 'artists', category, 'genre', $(this).attr('data-genre')]);
      });
      template.find('.link.artistAllGenres').click(() => {
        router.navigateTo(['library', 'artists', category]);
      });
    }

    function onRoute() {}

    function onContainerCreation(topicdiv, categorydiv, topic, category, param) {
      categorydiv.html(tpl.mustacheView('loading', {}));

      function onRestResponse(data) {
        if (data === null) {
          return debug('libraryArtist error', category);
        }
        const artist = { ...data };
        const songs = [...artist.songs];
        songs.sort((a, b) => a.album > b.album);
        const response = parseAlbumSongs(songs, param);
        const topHits = getGreatestHits(artist.songs);
        let topHitsHTML = '';
        if (topHits.length) {
          topHits.forEach((song) => {
            topHitsHTML += tpl.song_template(song);
          });
          response.hits = [topHitsHTML];
        }
        response.artist = data._id;
        const template = $(tpl.mustacheView('library.content.artist', response));
        categorydiv.html(template);
        bindEvents(template, topicdiv, categorydiv, topic, category, param);
        getRelatedArtists(category, template);
      }

      rest.artist.get(category, {
        load(err, resp) {
          if (err) {
            return onRestResponse(null);
          }

          return onRestResponse(resp);
        },
      });
    }

    function getGreatestHits(songs) {
      const newSongs = songs.filter(song => song.hits);
      newSongs.sort((a, b) => {
        return a.hits > b.hits;
      });

      return newSongs.slice(0, 9);
    }

    function parseAlbumSongs(all, param) {
      const template_data = {
        no_album: [],
        albums: [],
        songsNumber: 0,
        hours: 0,
        minutes: 0,
        full: [],
        notFull: [],
      };
      const selectedSongs = [];
      const otherSongs = [];
      let availableGenres = [];
      let duration = 0;

      all.forEach((song) => {
        if (!param || song.genre === param) {
          selectedSongs.push(song);
        } else {
          otherSongs.push(song);
        }
        if ((!param || song.genre !== param) && availableGenres.indexOf(song.genre) < 0) {
          availableGenres.push(song.genre);
        }
      });
      const parsed = dataParsers.multiAlbumsParser(selectedSongs);

      parsed.sort((a, b) => {
        const datea = a.date.length ? a.date[(a.date.length - 1)] : 0;
        const dateb = b.date.length ? b.date[(b.date.length - 1)] : 0;
        return dateb - datea;
      });
      parsed.forEach((album) => {
        template_data.songsNumber += album.songsNb;
        duration += album.duration;
        if (album.album.length) {
          album.album_e = album.album.replace('"', '&quot;');
          if (album.image_alternatives && album.image_alternatives[200]) {
            album.image_url = album.image_alternatives[200];
            album.layoutClass = 'mediumImage';
          }
          template_data.albums.push(album);
        } else {
          template_data.no_album.push(album);
        }
      });
      tpl.secondsToTemplate(duration, template_data);

      if (!param && availableGenres.length > 1) {
        availableGenres = availableGenres.map(g => ({ genre: g, genre_e: g.replace('"', '&quot;') }));
        template_data.full.push({ genres: availableGenres });
      } else if (param && availableGenres.length) {
        template_data.genre = param;
        availableGenres = availableGenres.map(g => ({ genre: g, genre_e: g.replace('"', '&quot;') }));
        template_data.notFull.push({ genres: availableGenres });
      }

      return template_data;
    }

    return {
      onContainerCreation,
      onRoute,
    };
  });
