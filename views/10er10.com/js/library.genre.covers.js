"use strict";
define([
  "js/d10.rest",
  "js/d10.localcache",
  "js/d10.templates",
  "js/d10.router",
  "js/d10.restHelpers",
  "js/d10.dataParsers",
  "js/d10.widgetHelpers"
       ],
       function(rest, localcache, tpl, router, restHelpers, dataParsers, widgetHelpers) {

    var albumRowTemplate = tpl.mustacheView("library.listing.album.all.row");
    var onContainerCreation = function(topicdiv, categorydiv, topic, category, param) {
      var template_data = {
        genre: category,
        genre_e: encodeURIComponent(category)
      };
      categorydiv.html(tpl.mustacheView("library.content.genre.covers", template_data));
      categorydiv.find(".link[name=all]").click(function() {
        router.navigateTo(["library","genres"]);
      });
      categorydiv.delegate(".albumMini", "click", function() {
        toggleAlbumDetails($(this));
      });
      var contentDiv = categorydiv.find(".list");

      var toggleAlbumDetails = function(miniWidget) {
      if ( miniWidget.hasClass("opened") ) {
        closeAlbumDetails(miniWidget);
      } else {
        widgetHelpers.albumDetail(miniWidget, ".list", ".albumrow", closeAlbumDetails);
      }
    };

    var closeAlbumDetails = function(miniWidget) {
      var albumDetailsContainer = miniWidget.data("albumDetailsContainer");
      if ( albumDetailsContainer ) {
        albumDetailsContainer.slideUp(300, function() {
          albumDetailsContainer.remove();
        });
        miniWidget.removeData("albumDetailsContainer");
      }
      miniWidget.removeClass("opened");
    };

      //rest.genre.albumsSongs(genre, query, options)
      var restWrapper = function(query, options) {
        return rest.album.list({...query, genre: category}, options);
      };
      var cursor = new widgetHelpers.BufferedCursor(
        new restHelpers.mongoPagedCursor(restWrapper, {})
      );
      var cols = 0;
      var currentAlbumRow = $(albumRowTemplate);
      contentDiv.append(currentAlbumRow);
      var scrollOpts = {
        pxMin: 150,
        fetchToFill: true,
        parseResults: function(rows) {
          var albums = null;
          rows.forEach(function(songs) {
            var albumData = dataParsers.singleAlbumParser(songs);
            albumData.songs = songs.songs;
            var html = $( tpl.albumMini(albumData) ).data("albumDetails",albumData);
            if ( !albums ) {
              albums = html;
            } else {
              albums = albums.add(html);
            }
          });
          return albums;
        },
        append: function(elements) {
          elements.each(function() {
            if ( cols == 4 ){
              currentAlbumRow = $(albumRowTemplate);
              contentDiv.append(currentAlbumRow);
              cols=0;
            }
            cols++;
            currentAlbumRow.append(this);
          });
        }
      };
      widgetHelpers.createInfiniteScroll(categorydiv, cursor, scrollOpts);
    };

    var onRoute = function(topicdiv, categorydiv, topic, category, param) {
    };


    return {
        onContainerCreation: onContainerCreation,
        onRoute: onRoute
    };



});
