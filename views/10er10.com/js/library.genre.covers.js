"use strict";
define([
  "js/d10.rest", 
  "js/d10.localcache", 
  "js/d10.templates", 
  "js/d10.libraryScope", 
  "js/d10.events", 
  "js/d10.router",
  "js/d10.restHelpers",
  "js/d10.dataParsers",
  "js/d10.widgetHelpers"
       ], 
       function(rest, localcache, tpl, libraryScope, events, router, restHelpers, dataParsers, widgetHelpers) {
    
    
    var onContainerCreation = function(topicdiv, categorydiv, topic, category, param) {
      var template_data = {
        genre: category,
        genre_e: encodeURIComponent(category)
      };
      categorydiv.html(tpl.mustacheView("library.content.genre.covers", template_data));
      widgetHelpers.bindAlbumCoverPopin(categorydiv);
      categorydiv.find(".link[name=all]").click(function() {
        router.navigateTo(["library","genres"]);
      });
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
