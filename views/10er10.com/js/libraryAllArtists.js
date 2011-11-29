define(["js/localcache", "js/d10.rest", "js/d10.events", "js/d10.templates","js/d10.router", "js/d10.libraryScope"], 
		function(localcache,rest,events, tpl, router, libraryScope) {
	var allArtists = function (container) {
		var cacheNotExpired = localcache.getJSON("artists.allartists");
		var restEndPoint = libraryScope.current == "full" ? rest.artist.allByName : rest.user.artist.allByName;
		if ( cacheNotExpired ) { return ; }
		localcache.setJSON("artists.allartists", {"f":"b"},true);
		container.empty();
		
		restEndPoint({
			"load": function(err, data) {
				if ( !err ) {
					displayAllArtists(container,data);
				}
			}
		});
	};

	var displayAllArtists = function (container, data) {
// 			debug("displayAllArtists",container,data);
// 			data = data.data;
		var letter = '';
		var letter_container = null;
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

		$("span.link",container).click(function() {
			router.navigateTo(["library","artists",$(this).text()]);
		});
	};
	
	var onContainerCreation = function(topicdiv, categorydiv, topic, category, param) {
		events.topic("libraryScopeChange").subscribe(function() {
			allArtists(categorydiv);
		});
// 		categorydiv.html(tpl.mustacheView("loading")+tpl.mustacheView("library.content.simple"));
	};
	
	var onRoute = function(topicdiv, categorydiv, topic, category, param) {
		allArtists(categorydiv);
	};
	
	
	return {
		onContainerCreation: onContainerCreation,
		onRoute: onRoute
	};
	
});
