define(["js/domReady", "js/dnd", "js/playlist.new", "js/d10.router", "js/d10.events", "js/d10.libraryScope", 
	   "js/d10.templates", "js/localcache", "js/d10.rest", 
	   "js/osd", "js/d10.imageUtils", "js/user", "js/d10.when", "js/d10.utils", "js/paginer", "js/config"],
	   function(foo, dnd, playlist, router, events, libraryScope, tpl, 
				localcache, rest, osd, imageUtils, user, When, toolbox, restHelpers, config) {
	

	
	
	function library (ui) {

		ui.delegate("div.song",'dragstart', dnd.onDragDefault)
			.delegate("div.song",'dragend', dnd.removeDragItem)
			.delegate("div.song","dblclick",function(e) {
				playlist.append($(this).clone());
			})
			.delegate("div.song","click",function(e) {
				var target = $(e.target);
				if ( target.closest(".add").length == 0 && target.closest(".artist").length == 0 && target.closest(".album").length == 0 )
					$(this).toggleClass("selected");
		});

		ui.delegate(".albumWidget .albumName","click",function() {
			router.navigateTo(["library","albums",$(this).closest(".albumWidget").attr("data-name")]);
		}).delegate(".albumWidget > .head > img","click",function() {
			router.navigateTo(["library","albums",$(this).closest(".albumWidget").attr("data-name")]);
		})
		.delegate(".albumWidget .oneArtist","click",function() {
			router.navigateTo(["library","artists",$(this).attr("data-name")]);
		})
		.delegate(".albumWidget .oneGenre","click",function() {
			router.navigateTo(["library","genres",$(this).attr("data-name")]);
		})
		.delegate(".albumWidget .showSongs","click",function() {
			var widget = $(this).closest(".albumWidget");
			widget.find(".showSongs").hide();
			widget.find(".hideSongs").show();
			widget.find(".list").css("display","table");
		})
		.delegate(".albumWidget .hideSongs","click",function() {
			var widget = $(this).closest(".albumWidget");
			widget.find(".hideSongs").hide();
			widget.find(".showSongs").show();
			widget.find(".list").hide();
		})
		;
			
		events.topic("libraryScopeChange").subscribe(function(current) {
			var hitsTab = ui.children("nav").find("li[action=hits]");
			if ( hitsTab.hasClass("active") ) {
				router.navigateTo(["library","genres"]);
			}
			if ( current == "full" ) {
				hitsTab.fadeIn();
			} else {
				hitsTab.fadeOut();
			}
		});
		
		ui.children("nav").find(".libraryMenuButton").click(function() {
			var button = $(this), offset = button.offset(), height = button.height();
// 			debug(button.offset());
			var label = ( libraryScope.current == "full" ) ? tpl.mustacheView("library.scope.toggle.user",{}) : tpl.mustacheView("library.scope.toggle.full",{}) ;
			var widget = $(
				tpl.mustacheView("hoverbox.library.scope", {toggle_scope: label})
				).hide();
			$("body").append(widget);
			offset.left = offset.left - widget.width();
			offset.top += height;
			widget.offset(offset);
			widget.find(".toggleScope").click(function() {
				widget.ovlay().close();
				libraryScope.toggle();
			});
			widget.ovlay({"onClose": function() {this.getOverlay().remove()}, "closeOnMouseOut": true });
		});
		
		
		var init_topic = function (topic,category, param) {
			debug("library.display start",topic,category, param);
			if ( typeof category == "undefined" ) {
				category = "";
			}
			//
			// create topic div + controls (if any)
			//
			var topicdiv = $('div[name='+topic+']',ui);
			if ( topicdiv.length == 0 ) {
				topicdiv=$('<div name="'+topic+'"></div>');
				init_controls(topic,topicdiv);
				ui.append(topicdiv);
			}
			
			if ( topic == "genres" && !category ) { category = "<all>"; }

			//
			//if category is specified select it
			//
			if ( category ) {
				selectTopicCategory(topic,category,topicdiv);
			} else {
				category = getSelectedTopicCategory (topic, topicdiv );
			}

			//
			// launch the topic category display
			//

			//
			// get id
			//
			var id = get_id(topic,topicdiv,category);
			debug("ID: ",id);
			//
			// get topic category container
			//
			var categorydiv=topicdiv.children('div[name="'+id+'"]');
			if ( !categorydiv.length ) {
				if ( topic == "genres" && category == "<all>" ) {
					categorydiv=$('<div name="'+id+'" class="topic_category">'+tpl.mustacheView("loading")+tpl.mustacheView("library.control.genre")+"</div>");
				} else if ( topic == "albums" && category == "<all>" ) {
// 					debug("setting special tamplate");
					categorydiv=$("<div name=\""+id+"\" class=\"topic_category\">"+tpl.mustacheView("loading")+tpl.mustacheView("library.content.album.all")+"</div>");
					require(["js/libraryAlbums"], function(libraryAlbums) {
						libraryAlbums.onContainerCreation(topicdiv,categorydiv,param);
					});
				} else if ( topic == "artists" && category == "<all>" ) {
					categorydiv=$("<div name=\""+id+"\" class=\"topic_category\" />");
					require(["js/libraryAllArtists"], function(libraryAllArtists) {
						libraryAllArtists.onContainerCreation(topicdiv, categorydiv, topic, category, param);
					});
				}/* else if ( topic == "genres" ) {
					categorydiv=$('<div name="'+id+'" class="topic_category">'+tpl.mustacheView("loading")+tpl.mustacheView("library.content.genre")+"</div>");
					categorydiv.find("article h2 > span:first-child").text(category);
					categorydiv.find("article h2 > .link").click(function() { router.navigateTo(["library","genres"]); });
					bindControls(categorydiv, topic, category);
				}*/ else {
					debug("create category for",id);
// 					categorydiv=$('<div name="'+id+'" class="topic_category">'+tpl.mustacheView("loading")+tpl.mustacheView("library.content.simple")+"</div>");
					categorydiv=$("<div name=\""+id+"\" class=\"topic_category\" />");
					require(["js/libraryBasicListing"],function(basicListing) {
						basicListing.onContainerCreation(topicdiv, categorydiv, topic, category, param);
					});
// 					bindControls(categorydiv, topic, category);
// 					if ( topic == "albums" && !category ) {
// 						categorydiv.find(".selectVisible").hide();
// 						categorydiv.find(".pushAll").hide();
// 					}
				}
				topicdiv.append(categorydiv);
			} else {
// 				debug("already got category div", id, topicdiv.data('activeCategory'));
			}
			
			// special pages
			if ( topic == "artists" && category == "<all>" ) {
// 				debug("special category case");
// 				allArtists(categorydiv);
				require(["js/libraryAllArtists"], function(libraryAllArtists) {
					libraryAllArtists.onRoute(topicdiv, categorydiv, topic, category, param);
				});
			} else if ( topic == "albums" && category == "<all>" ) {
// 				debug("special category case", topic, category);
				require(["js/libraryAlbums"], function(libraryAlbums) {
					libraryAlbums.onRoute(topicdiv,categorydiv,param);
				});
				topicdiv.find(".albumSearch").hide();
				
			} else if ( topic == "genres" && category == "<all>" ) {
				displayGenres(categorydiv);
			} else {
				if ( topic == "albums" ) {
					topicdiv.find(".albumSearch").show();
				}

				require(["js/libraryBasicListing"],function(basicListing) {
					basicListing.onRoute(topicdiv, categorydiv, topic, category, param);
				});
				// create the infiniteScroll
// 				var section = categorydiv.find("section");
// 				if ( !section.data("infiniteScroll") ) {
// 					createInfiniteScroll(categorydiv, topic, category);
// 				}
			}
			
			
			//
			// show current topic category if not already visible
			//
			if ( topicdiv.data('activeCategory') != id ) {
				$('div.topic_category',topicdiv).hide();
				categorydiv.show();
				topicdiv.data('activeCategory',id);
			}

		};

		var getCurrentCategory = function(topic) {
			var topicdiv = ui.children('div[name='+topic+']');
			if ( topicdiv.length == 0 ) {
				return false;
			}
			var back = false;
			topicdiv.find(".topic_category").each(function() {
				if ( $(this).css("display") == "block" ) {
					back = get_category_from_id(topic, $(this).attr("name"));
					return false;
				}
			});
			return back;
		};

		var resetCache = function() {
			localcache.unset("genres.index");
			localcache.unset("artists.allartists");
		};

		var displayGenresListener = false;
		var displayGenres = function(categorydiv) {
			var cacheNotExpired = localcache.getJSON("genres.index");
			if ( cacheNotExpired ) { 
			}
			var restEndPoint = libraryScope.current == "full" ? rest.genre.resume : rest.user.genre.resume;
			restEndPoint({
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
			if ( !displayGenresListener ) {
				displayGenresListener = true;
				events.topic("libraryScopeChange").subscribe(function() {
					resetCache();
					displayGenres(categorydiv);
				});
			}
		};
		
		var allArtistsListener = false;
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
			
			if ( !allArtistsListener ) {
				allArtistsListener = true;
				events.topic("libraryScopeChange").subscribe(function() {
					resetCache();
					allArtists(container);
				});
			}
			
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

		var init_controls = function (topic,catdiv) {
			if ( topic == 'artists' ) {
				catdiv.append( tpl.mustacheView('library.control.artist') );
				var widget = $("input[name=artist]",catdiv);
				$("span[name=all]",catdiv).click(function(){ widget.val('').trigger('blur');  router.navigateTo(["library","artists","<all>"]); });
				$('img[name=clear]',catdiv).click(function() { widget.val('').trigger('blur'); router.navigateTo(["library",topic]); });
				var overlay = widget.val(widget.attr('defaultvalue'))
				.permanentOvlay( libraryScope.current == "full" ? rest.artist.list : rest.user.artist.list , $(".overlay",catdiv),{
					"autocss": true,
					"minlength" : 1 ,
					"select": function (data, json) {
						router.navigateTo(["library",topic,json]);
						return json;
					},
					"beforeLoad": function() {
						this.getOverlay().width(widget.width());
					},
				});
				events.topic("libraryScopeChange").subscribe(function(current) {
					if ( current == "full" ) {
						overlay.setUrl(rest.artist.list);
					} else {
						overlay.setUrl(rest.user.artist.list);
					}
				});
			} else if ( topic == 'albums' ) {
				catdiv.append( tpl.mustacheView('library.control.album') );
				var widget = $('input[name=album]',catdiv);
				catdiv.find("span[name=all]").click(function(){ widget.val('').trigger('blur');  router.navigateTo(["library","albums","<all>"]); });
				var overlay = widget.val(widget.attr('defaultvalue'))
				.permanentOvlay(libraryScope.current == "full" ? rest.album.list : rest.user.album.list, $(".overlay",catdiv),
						{
							"varname": "start", 
							"minlength" : 1 ,
							"autocss": true,
							"select": function (data, json) {
								router.navigateTo(["library",topic,data]);
								return data;
							}
						}
				);
				events.topic("libraryScopeChange").subscribe(function(current) {
					if ( current == "full" ) {
						overlay.setUrl(rest.album.list);
					} else {
						overlay.setUrl(rest.user.album.list);
					}
				});
				$('img[name=clear]',catdiv).click(function() { widget.val('').trigger("blur"); router.navigateTo(["library",topic]); });
				
			} else if ( topic == 'titles' ) {
				catdiv.append( tpl.mustacheView('library.control.title') );
				var widget = $('input[name=title]',catdiv);
				var overlay = widget.val(widget.attr('defaultvalue'))
				.permanentOvlay( libraryScope.current == "full" ? rest.song.listByTitle : rest.user.song.listByTitle, $(".overlay",catdiv), 
					{
						"autocss": true,
						"varname": 'start', 
						"minlength" : 1 ,
						"select": function (data, json) {
							router.navigateTo(["library",topic,data]);
							return data;
						}
					}
				);
				events.topic("libraryScopeChange").subscribe(function(current) {
					if ( current == "full" ) {
						overlay.setUrl(rest.song.listByTitle);
					} else {
						overlay.setUrl(rest.user.song.listByTitle);
					}
				});
				$('img[name=clear]',catdiv).click(function() { widget.val('').trigger("blur"); router.navigateTo(["library",topic]); });
			}
			return catdiv;
		}

		var get_id = function (topic,catdiv,category) {
			var id=topic;
			category = category || '';
			if ( topic == 'genres' || topic == 'artists' || topic == 'albums' || topic == 'titles' ) {
				id='_'+ escape(category) ;
			}
			return id;
		}

		var get_category_from_id = function(topic, id)  {
			if ( topic == 'genres' || topic == 'artists' || topic == 'albums' || topic == 'titles' ) {
				id =  unescape( id.substr(1) ) 
				return id;
			} else {
				return false;
			}
		};

		var selectTopicCategory = function (topic,category,topicdiv) {
			if ( topic == 'artists' && category != '<all>' ) {
				$('input[name=artist]',topicdiv).val(category);
			} else if ( topic == 'albums' ) {
				$('input[name=album]',topicdiv).val(category);
			} else if ( topic == 'titles' ) {
				$('input[name=title]',topicdiv).val(category);
			}
			return topicdiv;
		}

		var getSelectedTopicCategory = function (topic, topicdiv ) {
			if ( topic == 'artists' ) {
				var widget = $('input[name=artist]',topicdiv);
				if ( widget.val() == widget.attr("defaultvalue") ) { return ""; }
				return widget.val();
			} else if ( topic == 'albums' ) {
				var widget = $('input[name=album]',topicdiv);
				if ( widget.val() == widget.attr("defaultvalue") ) { return ""; }
				return widget.val();
			} else if ( topic == 'titles' ) {
				var widget = $('input[name=title]',topicdiv);
				if ( widget.val() == widget.attr("defaultvalue") ) { return ""; }
				return widget.val();
			}
			return null;
		}

		return {
			display: init_topic,
			getCurrentCategory: getCurrentCategory
		};
	};















	
	
	var lib = new library($('#library')),
	libraryRouteHandler = function(topic,category, param) {
		debug("libraryRouteHandler",topic, category, param);
		if ( !topic ) {
			if ( this._containers["library"].currentActive ) {
				this._activate("main","library",this.switchMainContainer);
				return ;
			} else {
				topic = "genres";
			}
		}
		lib.display( decodeURIComponent(topic), category ? decodeURIComponent(category) : null, param ? decodeURIComponent(param) : null );
		this._activate("main","library",this.switchMainContainer)._activate("library",topic);
	};
	router._containers["library"] = 
	{
		tab: $("#library > nav > ul"), 
		container: $("#library"), 
		select: function(name) {return this.container.children("div[name="+name+"]"); }, 
		lastActive: null, 
		currentActive: null
	};
	
	router.route("library","library",libraryRouteHandler);
	router.route("library/:topic","library",libraryRouteHandler);
	router.route("library/:topic/:category","library",libraryRouteHandler);
	router.route("library/:topic/:category/:parameter","library",libraryRouteHandler);
	
	router._containers.library.tab.delegate("[action]","click",function() {
		var elem = $(this), action = elem.attr("action"), currentCategory = lib.getCurrentCategory(action);
		
		if ( ! elem.hasClass("active") ) { 
			if ( currentCategory ) {router.navigateTo(["library",action,currentCategory]); } 
			else { router.navigateTo(["library",action]); }
		}
	});

	return lib;



});
