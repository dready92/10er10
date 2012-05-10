define(["js/d10.rest", "js/d10.events", "js/d10.templates","js/d10.router", "js/d10.libraryScope", "js/paginer"], 
		function(rest,events, tpl, router, libraryScope, restHelpers) {
    var letter = '', letter_container = null, endOfCursor = false;;
	var cache_ttl = 1800000; //half an hour
	var lastUpdate = 0;
	
	var allArtists = function (container) {
		var restEndPoint = libraryScope.current == "full" ? rest.artist.allByName : rest.user.artist.allByName;
		var now = new Date().getTime();
		var cacheExpired = now - lastUpdate - cache_ttl ;
		if ( cacheExpired < 0 ) { debug("allArtists cache still valid"); return ; }
		lastUpdate = now;
		container.html(tpl.mustacheView("library.listing.artist.loading", {}));
        letter = '';
        letter_container = null;
        var cursor = new restHelpers.couchMapCursor(restEndPoint, {limit: 100});
        var fetchFromCursor = function() {
          if ( !cursor.hasMoreResults() ) {
			endOfCursor = true;
			container.find(".loading").remove();
            return ;
          }
          cursor.getNext(function(err,resp) {
            if ( err) {
              return ;
            }
            fetchFromCursor();
            displayAllArtists(container, resp);
          });
        };
        fetchFromCursor();
	};

	var displayAllArtists = function (container, data) {
		for ( var index in data ) {
			var artist = data[index].key.pop();
			var songs = data[index].value;
			var current_letter = artist.substring(0,1);
			if ( current_letter != letter ) {
				if ( letter_container ) {
				  container.append(tpl.mustacheView("library.listing.artist", letter_container));
				}
				letter = current_letter;
				letter_container = {letter: letter, artists: []};
			}
			letter_container.artists.push({"artist": artist, "songs": songs});
		}
		if ( endOfCursor && letter_container && letter_container.artists.length ) {
			container.append(tpl.mustacheView("library.listing.artist", letter_container));
		}
	};
	
	var onContainerCreation = function(topicdiv, categorydiv, topic, category, param) {
		categorydiv.attr("name","_all_");
        categorydiv.delegate("span.link","click", function() {
            router.navigateTo(["library","artists",$(this).text()]);
        });
		events.topic("libraryScopeChange").subscribe(function() {
			lastUpdate = 0;
			allArtists(categorydiv);
		});
	};
	
	var onRoute = function(topicdiv, categorydiv, topic, category, param) {
		allArtists(categorydiv);
	};
	
	
	return {
		onContainerCreation: onContainerCreation,
		onRoute: onRoute
	};
	
});
