(function($,d10) {
	"use strict";
	var bindAllAlbums = function(topicdiv, categorydiv,letter) {
// 			categorydiv.addClass("relative");
		categorydiv.delegate(".albumMini img","mouseenter",function() {
			var container = $(this).closest(".albumMini");
			$(this).data("popupTimeout", setTimeout(function() {
				var tpl = container.data("albumDetails");
// 					debug(tpl);
				var widget = $( d10.mustacheView("library.content.album.all.popover",tpl) )
				.css({
					position: "absolute",
					top: 0,
					left: 0,
					visibility: "hidden"
				}).delegate("a","click",function() {
					$(this).closest(".popover").remove();
				});
				;
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
				
				
			},1000));
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
			d10.router.navigateTo( [ "library","albums","<all>",letter.attr("name") ] );
		})
		.delegate(".tocAll","click", function() {
			d10.router.navigateTo( [ "library","albums","<all>" ] );
		});
		
		d10.events.bind("whenLibraryScopeChange", function() {
			for ( var i in allAlbumsContents ) {
				allAlbumsContents[i].remove();
			}
			allAlbumsContents = {};
			categorydiv.removeData("toc-loaded").find(".toc").empty();
			categorydiv.find(".tocAll").hide();
			allAlbums(topicdiv, categorydiv);
		});
	};

	var singleAlbumParser;
	var allAlbumsContents = {};
	
	var allAlbums = function(topicdiv,categorydiv, letter) {
		
		if ( !categorydiv.data("toc-loaded") ) {
			var restBase = d10.libraryScope.current == "full" ? d10.rest.album : d10.rest.user.album;
			restBase.firstLetter({
				load: function(err,resp) {
					if ( err ) {
						return ;
					}
					categorydiv.find(".toc").html (
						d10.mustacheView("library.content.album.firstLetter",{letter:resp})
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
			debug("tocAll ? ",tocAll.css("display"));
			if ( tocAll.css("display") == "block" ) {
				debug("should slideUp tocAll");
				categorydiv.find(".toc .letter.active").removeClass("active");
				debug("should slideUp tocAll");
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
		var restBase = d10.libraryScope.current == "full" ? d10.rest.song.list : d10.rest.user.song.list;
// 			var restBase = d10.rest.song.list;
		var endPoint = restBase.albums;
		var options = {};
		if ( letter ) { 
			options.startkey = JSON.stringify([letter]);
			options.endkey = JSON.stringify([d10.nextLetter(letter)]);
		}
		var cursor = new d10.fn.couchMapMergedCursor(endPoint,options,"album");
		var rows = null;
		var fetchAll = function(err,resp) {
			if ( err ) { return ; }
			$.each(resp,function(k,songs) {
				var tpl = singleAlbumParser(songs);
				var html = $( d10.mustacheView("library.content.album.all.mini",tpl) ).data("albumDetails",tpl);
				contentDiv.append(html);
			});
			
			
			if ( cursor.hasMoreResults() ) { cursor.getNext(fetchAll); }
		};
		if ( cursor.hasMoreResults() ) { cursor.getNext(fetchAll); }
	};
	
	
	
	d10.fn.libraryAlbums = function(sap) {
		singleAlbumParser = sap;
		return {
			onContainerCreation: bindAllAlbums,
			onRoute: allAlbums
		};
	};
})(jQuery,d10);