define(["js/d10.rest", "js/d10.localcache", "js/d10.templates", "js/d10.router"], 
	   function(rest, localcache, tpl, router) {
	
	var displayGenres = function(categorydiv) {
		var cacheNotExpired = localcache.getJSON("genres.index");
		if ( cacheNotExpired ) {
			return ;
		}
		rest.genre.resume({
			load: function(err, data) {
				if ( err ) {
					return ;
				}
				localcache.setJSON("genres.index", {"f":"b"},true);
				var content = "";
				$.each(data,function(k,v) { //{"key":["Dub"],"value":{"count":50,"artists":["Velvet Shadows","Tommy McCook & The Aggrovators","Thomsons All Stars"]}}
					var artists = "";
					$.each(v.value.artists,function(foo,artist) {
						artists+=tpl.mustacheView("library.listing.genre.line", {"artist": artist})
					});
					content+=tpl.mustacheView("library.listing.genre", {"genre": v.key[0],"count": v.value.count},  {"artists": artists});
				});
				categorydiv.find("div.genresLanding").html(content);
				categorydiv.find("div.pleaseWait").hide();
				categorydiv.find("div.genresLanding")
				.show()
				.delegate("span.artistName","click",function() {
					router.navigateTo(["library","artists",$(this).text()]);
				})
				.delegate("div.genre > span","click",function() {
					router.navigateTo(["library","genres",$(this).text()]);
				})
				.delegate("span.all","click",function() {
					var genre = $(this).closest("div.genre").children("span").text();
					router.navigateTo(["library","genres",genre]);
				});
			}
		});
	};
	
	var onContainerCreation = function(topicdiv, categorydiv, topic, category, param) {
		categorydiv.html(tpl.mustacheView("loading")+tpl.mustacheView("library.control.genre"));
	};
	
	var onRoute = function(topicdiv, categorydiv, topic, category, param) {
		displayGenres(categorydiv);
	};
	
	
	return {
		onContainerCreation: onContainerCreation,
		onRoute: onRoute
	};
	
	
	
});
