define(["js/playlist.new", "js/d10.events", "js/d10.rest", "js/paginer", "js/d10.libraryScope", "js/d10.dataParsers", 
	   "js/d10.templates", "js/d10.router", "js/d10.albumCoverUploader"], 
	   function(playlist, pubsub, rest, restHelpers, libraryScope, dataParsers, tpl, router, albumCoverUploader) {
	
	var albumResultsParser = function(rows) { //[ [ {key:.., doc: song}, ...], ... ]
		var html=null ;
		rows.forEach(function(songs) {
			var albumData = dataParsers.singleAlbumParser(songs);
			if ( !html ) {
				html=$(tpl.mustacheView("library.content.album.widget",albumData));
			} else {
				html = html.add($(tpl.mustacheView("library.content.album.widget",albumData)));
			}
		});
		if ( !html ) {
// 				debug("no html for ",rows.length, rows);
			html = "";
		}
		return html;
	};
	
	var createInfiniteScroll = function(categorydiv, topic, category) {
		var section = categorydiv.find("section");
		var restBase = (topic == "hits" || libraryScope.current == "full") ? rest.song.list : rest.user.song.list;
		var data = {}, endpoint = restBase[topic];
		if ( topic == "genres" ) {
			data.genre = category;
		} else if ( topic == "albums" ) {
			data.album = category ? category : "";
		} else if ( topic == "artists" ) {
			data.artist = category ? category : "";
		} else if ( topic == "titles" ) {
			data.title = category ? category : "";
		} else if ( topic != "creations" && topic != "hits" ) {
			return false;
		}
		var loadTimeout = null, 
			innerLoading = categorydiv.find(".innerLoading"), cursor;
		
		var isOpts = 
		{
			onFirstContent: function(length) {
				categorydiv.find(".pleaseWait").hide();
				categorydiv.find("article").show();
				if ( !length ) {
					categorydiv.find("article").hide();
					categorydiv.find(".noResult").show();
					return ;
				}
				
				var list = categorydiv.find(".list");
				section.next(".grippie").show();
				section.makeResizable(
					{
						vertical: true,
						minHeight: 100,
						maxHeight: function() {
							// always the scrollHeight
							var sh = list.prop("scrollHeight");
							if ( sh ) {
								return sh -10;
							}
							return 0;
						},
						grippie: $(categorydiv).find(".grippie")
					}
				);
				require(["js/libraryExtendedInfos"], function(extendedInfos) {
					if ( extendedInfos[topic] ) {
						extendedInfos[topic](category,categorydiv);
					}
				});
			},
			onQuery: function() {
				loadTimeout = setTimeout(function() {
					loadTimeout = null;
// 						debug("Loading...");
					innerLoading.css("top", section.height() - 32).removeClass("hidden");
				},500);
			},
			onContent: function() {
				if ( loadTimeout ) {
					clearTimeout(loadTimeout);
				} else {
					innerLoading.addClass("hidden");
				}
			}
		};

		if ( topic == "albums" && !category ) {
			cursor = new restHelpers.couchMapMergedCursor(restBase.albums,{},"album");
			isOpts.parseResults = albumResultsParser;
		} else {
			cursor = new restHelpers.couchMapCursor(endpoint, data);
		}

		section.data("infiniteScroll",
			section.d10scroll(cursor,section.find(".list"),isOpts)
		);
	};
	
	
	var selectVisible = function(categorydiv) {
		var list = categorydiv.find(".list"),
			parent = list.parent(),
			songs = list.children(),
			coutHeight = parent.outerHeight(),
			ctop = parent.position().top;

		songs.removeClass("selected");
		for ( var i = 0, last = songs.length; i<last; i++ ) {
			var song = songs.eq(i),
			postop = song.position().top -ctop,
			outheight = song.outerHeight(),
			delta = outheight * 0.1;
			if ( postop >= -delta ) {
				if (  (postop + outheight - delta) < coutHeight ) {
				song.addClass("selected");
				} else {
					break;
				}
			}
		}
	};
	
	var bindControls = function(categorydiv, topic, category) {
		categorydiv.find(".pushAll").click(function() {
			playlist.append(categorydiv.find(".song").clone().removeClass("selected"));
		});
		categorydiv.find(".selectVisible").click(function() {
			selectVisible(categorydiv);
		});
		
		var refresh = function() {
			categorydiv.find(".list").empty();
			categorydiv.find(".extendedInfos").empty();
			categorydiv.find("article").hide();
			categorydiv.find(".noResult").hide();
			categorydiv.find(".pleaseWait").show();

			var is = categorydiv.find("section").data("infiniteScroll");
			if ( is && "remove" in is ) {
				is.remove();
			}
			createInfiniteScroll(categorydiv, topic, category);
		};
		
		categorydiv.find(".refresh").click(function() {
			refresh();
		});
		pubsub.topic("libraryScopeChange").subscribe(function() {
			refresh();
		});
	};
	
	
	
	var onContainerCreation = function(topicdiv, categorydiv, topic, category, param) {
		if ( topic == "genres" ) {
			categorydiv.html(tpl.mustacheView("loading")+tpl.mustacheView("library.content.genre"));
			categorydiv.find("article h2 > span:first-child").text(category);
			categorydiv.find("article h2 > .link").click(function() { router.navigateTo(["library","genres"]); });
		} else {
			categorydiv.html(tpl.mustacheView("loading")+tpl.mustacheView("library.content.simple"));
			if ( topic == "albums" && !category ) {
				categorydiv.prepend(tpl.mustacheView("library.content.album.list.header"));
				categorydiv.find(".link[name=all]").click(function() { router.navigateTo(["library","albums", "<covers>"]); });
				categorydiv.find(".selectVisible").hide();
				categorydiv.find(".pushAll").hide();
				albumCoverUploader.setListeners(categorydiv);
			}
		}
		bindControls(categorydiv, topic, category);
	};
	
	var onRoute = function(topicdiv, categorydiv, topic, category, param) {
		var section = categorydiv.find("section");
		if ( !section.data("infiniteScroll") ) {
			createInfiniteScroll(categorydiv, topic, category);
		}
	};
	
	return {
		onContainerCreation: onContainerCreation,
		onRoute: onRoute
	};
});
