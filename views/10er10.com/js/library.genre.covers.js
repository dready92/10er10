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
      //rest.genre.albumsSongs(genre, query, options)
      var restWrapper = function(query, options) {
        return rest.genre.albumsSongs(category, query, options);
      };
      var cursor = new restHelpers.couchMapMergedCursor(restWrapper, {}, "album");
      var section = categorydiv.find("section");
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
