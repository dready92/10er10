define(["js/playlist", "js/d10.rest", "js/d10.restHelpers", "js/d10.dataParsers", 
	   "js/d10.templates", "js/d10.router", "js/d10.albumCoverUploader", "js/d10.widgetHelpers"], 
	   function(playlist, rest, restHelpers, dataParsers, tpl, router, albumCoverUploader, widgetHelpers) {
	
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
		var data = {}, endpoint = rest.song.list[topic];
		if ( topic == "genres" ) {
			data.genre = category;
		} else if ( topic != "albums" && topic != "artists" && topic != "titles" && topic != "creations" && topic != "hits" ) {
			return false;
		}

        var opts = {
          onFirstContentPreCallback: function(length) {
            categorydiv.find(".pleaseWait").hide();
            if ( length ) {
              categorydiv.find("article").show();
            } else {
              categorydiv.find("article").hide();
              categorydiv.find(".noResult").show();
              return false;
            }
          },
          onFirstContentPostCallback: function(length) {
            require(["js/library.extendedInfos"], function(extendedInfos) {
              if ( extendedInfos[topic] ) {
                extendedInfos[topic](category,categorydiv);
              }
            });
          }
        };

		if ( topic == "albums" ) {
			cursor = new restHelpers.couchMapMergedCursor(rest.song.list.albums,{},"album");
			opts.parseResults = albumResultsParser;
		} else {
			cursor = new restHelpers.couchMapCursor(endpoint, data);
		}
        categorydiv.find("section").data("infiniteScroll", widgetHelpers.createInfiniteScroll(categorydiv, cursor, opts) );
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
	};
	
	
	
	var onContainerCreation = function(topicdiv, categorydiv, topic, category, param) {
		if ( topic == "genres" ) {
			categorydiv.html(tpl.mustacheView("loading")+tpl.mustacheView("library.content.genre"));
			categorydiv.find("article h1").text(category);
			categorydiv.find("article .link[name=all]").click(function() { router.navigateTo(["library","genres"]); });
            categorydiv.find("a[data-link=albumCovers]").attr("href", "#library/genres/"+encodeURIComponent(category)+"/albums");
		} else {
			categorydiv.html(tpl.mustacheView("loading")+tpl.mustacheView("library.content.simple"));
			if ( topic == "albums" ) {
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
