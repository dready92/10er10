define(["js/domReady", "js/dnd", "js/playlist.new", "js/d10.router", "js/d10.events", "js/d10.libraryScope", 
	   "js/d10.templates", "js/localcache", "js/d10.rest", 
	   "js/osd", "js/d10.imageUtils", "js/user", "js/d10.when", "js/d10.utils", "js/paginer", "js/config"],
	   function(foo, dnd, playlist, router, events, libraryScope, tpl, 
				localcache, rest, osd, imageUtils, user, When, toolbox, restHelpers, config) {
	
	"use strict";
	
	function library (ui) {

		ui.delegate("div.song",'dragstart', dnd.onDragDefault)
			.delegate("div.song",'dragend', dnd.removeDragItem)
			.delegate("div.song","dblclick",function(e) {
				var toAppend = $(this).clone();
				playlist.appendToCurrent(toAppend);
				playlist.driver().play( playlist.getTrackParameters(toAppend) );
// 				playlist.append($(this).clone());
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
            var button = $(this);
            var scope = ( libraryScope.current == "full" ) ? tpl.mustacheView("library.scope.toggle.user",{}) : tpl.mustacheView("library.scope.toggle.full",{}) ;
            var overlay = $(tpl.mustacheView("hoverbox.library.scope", {scope: scope})).appendTo("body");
            overlay.click(function() {
                overlay.ovlay().close();
                libraryScope.toggle();
            });
            button.addClass("active");
            overlay.ovlay({
                onClose: function() {this.getOverlay().remove(); button.removeClass("active");},
                closeOnMouseOut: true,
                align:{position: "bottomright", reference: button, leftOffset: 20, topOffset: 15}
            });
		});
		
		var init_topic = function (topic,category, param) {
			debug("library.display start",topic,category, param);
			if ( typeof category == "undefined" ) {
				category = "";
			}
			//
			// create topic div + controls (if any)
			//
			var topicdiv = ui.find('div[name='+topic+']');
			if ( topicdiv.length == 0 ) {
				topicdiv=$('<div name="'+topic+'"></div>');
				ui.append(topicdiv);
			}
			
			if ( ( topic == "genres" || topic == "artists" ) && !category ) { category = "<all>"; }

			//
			// launch the topic category display
			//

			//
			// get id
			//
			var id = get_id(topic,topicdiv,category);
			debug("ID: ",id);
			
			if ( topic == "albums" && category == "<all>" ) {
				category = null;
			}
			//
			// get topic category container
			//
			var categoryModuleName;
			if ( topic == "artists" && category == "<all>" ) {
				categoryModuleName = "js/libraryAllArtists";
			} else if ( topic == "artists" && category ) {
				categoryModuleName = "js/libraryArtist";
            } else if ( topic == "albums" && category == "<covers>" ) {
				categoryModuleName = "js/libraryAlbums";
			} else if ( topic == "albums" && category ) {
				categoryModuleName = "js/libraryAlbum";
            } else if ( topic == "genres" && category == "<all>" ) {
				categoryModuleName = "js/libraryAllGenres";
			} else {
				categoryModuleName = "js/libraryBasicListing";
			}
			
			var categorydiv=topicdiv.children('div[name="'+id+'"]');
			if ( !categorydiv.length ) {
				categorydiv=$("<div name=\""+id+"\" class=\"topic_category\" />");
				require([categoryModuleName], function(categoryModule) {
					categoryModule.onContainerCreation(topicdiv, categorydiv, topic, category, param);
				});
				topicdiv.append(categorydiv);
			}
			
			require([categoryModuleName],function(basicListing) {
				basicListing.onRoute(topicdiv, categorydiv, topic, category, param);
			});
			
			
			//
			// show current topic category if not already visible
			//
			if ( topicdiv.data('activeCategory') != id ) {
				topicdiv.data('activeCategory',id).find('div.topic_category').hide();
				categorydiv.show();
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
				topic = config.library.defaultTab;
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
