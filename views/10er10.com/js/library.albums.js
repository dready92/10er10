define(["js/d10.dataParsers", "js/d10.templates", "js/d10.router", 
	   "js/d10.events", "js/d10.libraryScope", "js/d10.rest", "js/d10.utils", "js/paginer"],
	   function(dataParsers, tpl, router, events, libraryScope, rest, toolbox, restHelpers) {
	"use strict";
	var currentOpenedPopin = null;
	var bindAllAlbums = function(topicdiv, categorydiv, topic, category, letter) {
		categorydiv.html(tpl.mustacheView("loading")+tpl.mustacheView("library.content.album.all"));
		categorydiv.delegate(".albumMini img","mouseenter",function() {
			var container = $(this).closest(".albumMini");
			$(this).data("popupTimeout", setTimeout(function() {
				var widget = $( tpl.mustacheView("library.content.album.all.popover", container.data("albumDetails") ) )
				.css({
					position: "absolute",
					top: 0,
					left: 0,
					visibility: "hidden"
				}).delegate("a","click",function() {
					$(this).closest(".popover").remove();
				});
				;
				if ( currentOpenedPopin ) {
				  currentOpenedPopin.remove();
				}
				currentOpenedPopin = widget;
				$("body").append(widget);
				var srcpos = container.offset(),
				srcsize = { width: container.outerWidth(), height: container.outerHeight() },
				widgetsize = { width: widget.outerWidth(), height: widget.outerHeight() },
				widgetOuter = Math.round( (widgetsize.height - widget.height()) / 2),
				leftoffset = Math.round((widgetsize.width - srcsize.width) / 2),
				left = srcpos.left - leftoffset;
				if ( left < 0 ) { left = 0 ; }
				widget.css({
					top: srcpos.top - widgetOuter,
					left: left,
					visibility: "visible"
					
				}).mouseleave(function() {$(this).remove();}).addClass("on");
				
				
			},100));
		})
		.delegate(".albumMini img","mouseleave",function() {
			var tid = $(this).data("popupTimeout");
			if(tid) {
				clearTimeout(tid);
			}
		})
		.delegate(".letter","click", function() {
			var letter = $(this);
			if ( letter.hasClass("active") ) {
				return;
			}
			router.navigateTo( [ "library","albums","<covers>",letter.attr("name") ] );
		})
		.delegate(".tocAll","click", function() {
			router.navigateTo( [ "library","albums","<covers>" ] );
		})
		.delegate(".link[name=all]","click", function() {
			router.navigateTo( [ "library","albums","<all>" ] );
		})
		.delegate(".albumMini .albumTitle","click",function() {
		  router.navigateTo( [ "library","albums",$(this).closest(".albumMini").data("albumDetails").album ] );
		});
		
		events.topic("libraryScopeChange").subscribe(function() {
			for ( var i in allAlbumsContents ) {
				allAlbumsContents[i].remove();
			}
			allAlbumsContents = {};
			categorydiv.removeData("toc-loaded").find(".toc").empty();
			categorydiv.find(".tocAll").hide();
			allAlbums(topicdiv, categorydiv);
		});
	};

	var allAlbumsContents = {};
	
	var allAlbums = function(topicdiv,categorydiv, topic, category, letter) {
		if ( !categorydiv.data("toc-loaded") ) {
			var restBase = libraryScope.current == "full" ? rest.album : rest.user.album;
			restBase.firstLetter({
				load: function(err,resp) {
					if ( err ) {
						return ;
					}
					categorydiv.find(".toc").html (
						tpl.mustacheView("library.content.album.firstLetter",{letter:resp})
					);
					categorydiv.data("toc-loaded",true);
					categorydiv.find(".pleaseWait").hide();
					getAllAlbumsContents (topicdiv, categorydiv, letter);
				}
			});
			return ;
		}
		getAllAlbumsContents (topicdiv, categorydiv, letter);
	};

	var getAllAlbumsContents = function(topicdiv, categorydiv, letter) {
		var tocAll = categorydiv.find(".tocAll");
		if ( letter ) {
			var letterSpan = categorydiv.find(".toc .letter[name="+letter+"]");
			if ( !letterSpan.hasClass("active") ) {
				letterSpan.siblings().removeClass("active");
				letterSpan.addClass("active");
				if ( tocAll.css("display") != "block" )  {
					tocAll.slideDown();
				}
			}
		} else {
			if ( tocAll.css("display") == "block" ) {
				categorydiv.find(".toc .letter.active").removeClass("active");
				tocAll.slideUp(function() {
					if ( tocAll.css("display") == "block" ) {
						tocAll.css("display","none");
					}
				});
			}
		}
// 			debug("getAllAlbumsContents: end of navigation");

		var contentDivName = letter ? "_"+letter : "_";
		var isHere = categorydiv.children(".albumCoversContent[name="+contentDivName+"]").length;
		if ( isHere ) {
			return ;
		}
		
		var contentDiv;
		if ( contentDivName in allAlbumsContents ) {
			contentDiv = allAlbumsContents[contentDivName];
		}
		if ( !contentDiv ) {
			contentDiv = $("<div />").addClass("albumCoversContent").attr("name",contentDivName);
			loadContentDiv(contentDiv, letter);
			allAlbumsContents[contentDivName] = contentDiv;
		}
		categorydiv.children(".albumCoversContent").detach();
		categorydiv.append(contentDiv);
	};
	
	var loadContentDiv = function( contentDiv, letter) {
		var restBase = libraryScope.current == "full" ? rest.song.list : rest.user.song.list;
		var endPoint = restBase.albums;
		var options = {};
		if ( letter ) { 
			options.startkey = JSON.stringify([letter]);
			options.endkey = JSON.stringify([toolbox.nextLetter(letter)]);
		}

		var cursor = new restHelpers.couchMapMergedCursor(endPoint,options,"album");
		var rows = null;
		var fetchAll = function(err,resp) {
			if ( err ) { return ; }
            if ( cursor.hasMoreResults() ) { cursor.getNext(fetchAll); }
			$.each(resp,function(k,songs) {
				var albumData = dataParsers.singleAlbumParser(songs);
				var html = $( tpl.mustacheView("library.content.album.all.mini",albumData) ).data("albumDetails",albumData);
				contentDiv.append(html);
			});
		};
		if ( cursor.hasMoreResults() ) { cursor.getNext(fetchAll); }
	};
	
	
	return {
		onContainerCreation: bindAllAlbums,
		onRoute: allAlbums
	};

});