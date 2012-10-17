"use strict";
define([
  "js/d10.rest", 
  "js/d10.localcache", 
  "js/d10.templates", 
  "js/d10.libraryScope", 
  "js/d10.events", 
  "js/d10.router",
  "js/d10.restHelpers",
  "js/d10.dataParsers"
       ], 
       function(rest, localcache, tpl, libraryScope, events, router, restHelpers, dataParsers) {
    
    
    var onContainerCreation = function(topicdiv, categorydiv, topic, category, param) {
      var template_data = {
        genre: category
      };
      categorydiv.html(tpl.mustacheView("library.content.genre.covers", template_data));
      var currentOpenedPopin = null;
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
            },10));
        })
        .delegate(".albumMini img","mouseleave",function() {
            var tid = $(this).data("popupTimeout");
            if(tid) {
                clearTimeout(tid);
            }
        })
      //rest.genre.albumsSongs(genre, query, options)
      var restWrapper = function(query, options) {
        return rest.genre.albumsSongs(category, query, options);
      };
      var cursor = new restHelpers.couchMapMergedCursor(restWrapper, {}, "album");
      var section = categorydiv.find("section");
      var loadTimeout = null;
      var innerLoading = categorydiv.find(".innerLoading");
      var scrollOpts = {
        pxMin: 150,
        fetchToFill: true,
        parseResults: function(rows) {
          var albums = null;
          rows.forEach(function(row) {
            var albumData = dataParsers.singleAlbumParser(row);
            var html = $( tpl.albumMini(albumData) ).data("albumDetails",albumData);
            if ( !albums ) {
              albums = html;
            } else {
              albums = albums.add(html);
            }
          });
          return albums;
        },
        onFirstContent: function() {
          var list = categorydiv.find(".list");
          var grippie = section.next(".grippie");
          grippie.show();
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
              grippie: grippie
            }
          );
        },
       onQuery: function() {
          loadTimeout = setTimeout(function() {
            loadTimeout = null;
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
      section.data("infiniteScroll",
            section.d10scroll(cursor,section.find(".list"),scrollOpts)
        );
      
    };
    
    var onRoute = function(topicdiv, categorydiv, topic, category, param) {
    };
    
    
    return {
        onContainerCreation: onContainerCreation,
        onRoute: onRoute
    };
    
    
    
});
