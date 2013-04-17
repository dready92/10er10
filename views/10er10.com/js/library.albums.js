define(["js/d10.dataParsers", "js/d10.templates", "js/d10.router", 
	   "js/d10.rest", "js/d10.toolbox", "js/d10.restHelpers",
       "js/d10.widgetHelpers", "js/color-manipulation.thief"
       ],
	   function(dataParsers, tpl, router, rest, toolbox, restHelpers, widgetHelpers, thief) {
	"use strict";
	var bindAllAlbums = function(topicdiv, categorydiv, topic, category, letter) {
		categorydiv.html(tpl.mustacheView("loading")+tpl.mustacheView("library.content.album.all"));
        //widgetHelpers.bindAlbumCoverPopin(categorydiv);
		categorydiv.delegate(".letter","click", function() {
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
        categorydiv.delegate(".albumMini", "click", function() {
          toggleAlbumDetails($(this));
        });
		
	};

    var toggleAlbumDetails = function(miniWidget) {
      if ( miniWidget.hasClass("opened") ) {
        closeAlbumDetails(miniWidget);
      } else {
        openAlbumDetails(miniWidget);
      }
    };
    
    var openAlbumDetails = function(miniWidget) {
      var albumCoversContent = miniWidget.closest(".albumCoversContent");
      albumCoversContent.find(".albumMini.opened").each(function() {
        closeAlbumDetails($(this));
      });
      var row = miniWidget.closest(".albumrow");
      var arrow = miniWidget.find(".arrow");
      var arrow2 = miniWidget.find(".arrow2");
      var albumDetailsContainer = $('<div class="albumDetails"><div class="head">GREAT THING ARE COMING</div></div>');
      var albumDetailsHeadContainer = albumDetailsContainer.find(".head");
      row.after(albumDetailsContainer);
      var colors = thief.getColors(miniWidget.find("img").get(0));
      var bgColor = "rgb("+colors[1].join(',')+")";
      var fgColors = thief.inverseColors(colors[1], colors[0]);
      
      var primaryColor = "rgb("+fgColors[0].join(',')+")";
      var secondaryColor = "rgb("+fgColors[1].join(',')+")";
      
      albumDetailsContainer.css({"background-color": primaryColor});
      arrow.css({"border-bottom-color": primaryColor});
      albumDetailsHeadContainer.css({"background-color": bgColor, color: primaryColor});
      arrow2.css({"border-bottom-color": bgColor});
      miniWidget.data("albumDetailsContainer",albumDetailsContainer);
      miniWidget.addClass("opened");
      albumDetailsHeadContainer.append(JSON.stringify( miniWidget.data("albumDetails") ));
    };
    
    var closeAlbumDetails = function(miniWidget) {
      var albumDetailsContainer = miniWidget.data("albumDetailsContainer");
      if ( albumDetailsContainer ) {
        albumDetailsContainer.remove();
        miniWidget.removeData("albumDetailsContainer");
      }
      miniWidget.removeClass("opened");
    };
    
	var allAlbumsContents = {};
	
	var allAlbums = function(topicdiv,categorydiv, topic, category, letter) {
		if ( !categorydiv.data("toc-loaded") ) {
			rest.album.firstLetter({
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
	
    var albumRowTemplate = '<div class="albumrow"></div>';
    
	var loadContentDiv = function( contentDiv, letter) {
		var endPoint = rest.song.list.albums;
		var options = {};
		if ( letter ) { 
			options.startkey = JSON.stringify([letter]);
			options.endkey = JSON.stringify([toolbox.nextLetter(letter)]);
		}

		var cursor = new restHelpers.couchMapMergedCursor(endPoint,options,"album");
		var cols = 0;
        var currentAlbumRow = $(albumRowTemplate);
        contentDiv.append(currentAlbumRow);
		var fetchAll = function(err,resp) {
			if ( err ) { return ; }
            if ( cursor.hasMoreResults() ) { cursor.getNext(fetchAll); }
			$.each(resp,function(k,songs) {
				var albumData = dataParsers.singleAlbumParser(songs);
				var html = $( tpl.albumMini(albumData) ).data("albumDetails",albumData);
                if ( cols == 4 ){
                  currentAlbumRow = $(albumRowTemplate);
                  contentDiv.append(currentAlbumRow);
                  cols=0;
                }
                cols++;
                currentAlbumRow.append(html);
			});
		};
		if ( cursor.hasMoreResults() ) { cursor.getNext(fetchAll); }
	};
	
	
	return {
		onContainerCreation: bindAllAlbums,
		onRoute: allAlbums
	};

});