// eslint-disable-next-line import/no-amd,no-undef
define(['js/d10.rest', 'js/d10.templates', 'js/d10.router', 'js/d10.restHelpers'],
  (rest, tpl, router, restHelpers) => {
    let letter = '';
    let letterContainer = null;
    let endOfCursor = false;
    const cacheTtl = 1800000; // half an hour
    let lastUpdate = 0;

    function allArtists(container) {
      const now = new Date().getTime();
      const cacheExpired = now - lastUpdate - cacheTtl;
      if (cacheExpired < 0) { debug('allArtists cache still valid'); return; }
      lastUpdate = now;
      container.html(tpl.mustacheView('library.listing.artist.loading', {}));
      letter = '';
      letterContainer = null;
      const cursor = new restHelpers.mongoPagedCursor(rest.artist.allByName, { limit: 100 });
      function fetchFromCursor() {
        if (!cursor.hasMoreResults()) {
          endOfCursor = true;
          container.find('.loading').remove();
          return;
        }
        cursor.getNext((err, resp) => {
          if (err) {
            return;
          }
          fetchFromCursor();
          displayAllArtists(container, resp);
        });
      }
      fetchFromCursor();
    }

    function displayAllArtists(container, data) {
      data.forEach((elem) => {
        const artist = elem._id;
        const songs = elem.songs;
        const currentLetter = artist.substring(0, 1);
        if (currentLetter != letter) {
          if (letterContainer) {
            container.append(tpl.mustacheView('library.listing.artist', letterContainer));
          }
          letter = currentLetter;
          letterContainer = { letter, artists: [] };
        }
        letterContainer.artists.push({ artist, songs });
      });
      if (endOfCursor && letterContainer && letterContainer.artists.length) {
        container.append(tpl.mustacheView('library.listing.artist', letterContainer));
      }
    }

    function onContainerCreation(topicdiv, categorydiv) {
      categorydiv.attr('name', '_all_');
      categorydiv.delegate('span.link', 'click', function onclick() {
        router.navigateTo(['library', 'artists', $(this).text()]);
      });
    }

    function onRoute(topicdiv, categorydiv) {
      allArtists(categorydiv);
    }


    return {
      onContainerCreation,
      onRoute,
    };
  });
