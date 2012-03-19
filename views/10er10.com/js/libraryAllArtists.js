define(["js/localcache", "js/d10.rest", "js/d10.events", "js/d10.templates","js/d10.router", "js/d10.libraryScope", "js/paginer"], 
		function(localcache,rest,events, tpl, router, libraryScope, restHelpers) {
    var letter = '', letter_container =null;
	var allArtists = function (container) {
		var cacheNotExpired = localcache.getJSON("artists.allartists");
		var restEndPoint = libraryScope.current == "full" ? rest.artist.allByName : rest.user.artist.allByName;
		if ( cacheNotExpired ) { return ; }
		localcache.setJSON("artists.allartists", {"f":"b"},true);
		container.empty();
        letter = '';
        letter_container = null;
        var cursor = new restHelpers.couchMapCursor(restEndPoint);
        var fetchFromCursor = function() {
          if ( !cursor.hasMoreResults() ) {
            return ;
          }
          cursor.getNext(function(err,resp) {
            if ( err) {
              debug("Error:",err);
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
				if ( letter_container ) container.append(letter_container);
				letter = current_letter;
				letter_container = $( tpl.mustacheView("library.listing.artist", {"letter": letter}) );
			}
			$(">div",letter_container).append( tpl.mustacheView("library.listing.artist.line", {"artist": artist, "songs": songs}) );
		}
		if ( letter_container ) { container.append( letter_container ); }

		
	};
	
	var onContainerCreation = function(topicdiv, categorydiv, topic, category, param) {
        categorydiv.delegate("span.link","click", function() {
            router.navigateTo(["library","artists",$(this).text()]);
        });
		events.topic("libraryScopeChange").subscribe(function() {
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
