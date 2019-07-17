/* eslint-disable */

define(["js/d10.templates","js/color-manipulation.thief",
  "js/playlist", "js/d10.dnd", "js/d10.router"],
  function(templates, thief, playlist, dnd, router) {
  var albumDetail = function(miniWidget, containerSelector,
                             rowContainerSelector, closeAlbumDetails) {
    closeAlbumDetails = closeAlbumDetails || function() {};
    var albumCoversContent = miniWidget.closest(containerSelector);
    albumCoversContent.find(".albumMini.opened").each(function() {
      closeAlbumDetails($(this));
    });
    var albumDetails = miniWidget.data("albumDetails");
    debug(albumDetails);
    var row = miniWidget.closest(rowContainerSelector);
    var arrow = miniWidget.find(".arrow");
    var arrow2 = miniWidget.find(".arrow2");
    var albumDetailsContainer = $(templates.mustacheView("library.content.album.all.details", albumDetails));
    var albumDetailsHeadContainer = albumDetailsContainer.find(".head");
    var songsListContainer = albumDetailsHeadContainer.find(".songsList");
    var colors = thief.getColors(miniWidget.find("img").get(0));
    var bgColor = "rgb("+colors[1].join(',')+")";
    var fgColors = thief.inverseColors(colors[1], colors[0]);

    var primaryColor = "rgb("+fgColors[0].join(',')+")";
    var secondaryColor = "rgb("+fgColors[1].join(',')+")";

    albumDetailsContainer.css({"background-color": primaryColor});
    arrow.css({"border-bottom-color": primaryColor});
    arrow2.css({"border-bottom-color": bgColor});
    albumDetailsHeadContainer.css({"background-color": bgColor, color: primaryColor});
    songsListContainer.css({color: secondaryColor});
    miniWidget.data("albumDetailsContainer",albumDetailsContainer);
    miniWidget.addClass("opened");
    row.after(albumDetailsContainer);
    albumDetailsContainer.slideDown(300);
    var getSongTemplate = function(id) {
      for ( var i in albumDetails.songs ) {
        if ( albumDetails.songs[i]._id == id ) {
          return $( templates.song_template(albumDetails.songs[i]) );
          break;
        }
      }
    };

    albumDetailsContainer
      .delegate("[data-target]","click",function() {
        router.navigateTo( $(this).attr("data-target") );
      })
      .delegate(".addAlbumToPlaylist","click",function() {
        playlist.append( $(templates.song_template(albumDetails.songs)) );

      })
      .delegate("li",'dragstart', function(e) {
        var songId = $(this).attr("name");
        var song = getSongTemplate(songId);
        var dt = e.originalEvent.dataTransfer;
        dt.effectAllowed = "copy";
        dt.setData('text','playlist');
        dnd.setDragItem( song );
      })
      .delegate("li",'dragend', dnd.removeDragItem)
      .delegate("li","dblclick",function(e) {
        var songId = $(this).attr("name");
        playlist.append(getSongTemplate(songId));
      })
      ;
  };



  var createInfiniteScroll = function(widget, cursor, opts) {
    var loadTimeout = null;
    var section = widget.find("section");
    var list = widget.find(".list");
    var innerLoading = widget.find(".innerLoading");
    var settings = {
      onFirstContent: function(length) {
        if ( settings.onFirstContentPreCallback ) {
          var goOn = settings.onFirstContentPreCallback(length);
          if ( goOn === false ) { return ; }
        }
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
        if ( settings.onFirstContentPostCallback ) {
          settings.onFirstContentPostCallback(length);
        }
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
    opts = opts || {};
    $.extend(settings, opts);
    return section.d10scroll(cursor,list,settings);
  };

  function BufferedCursor(cursor) {
    this._cursor = cursor;
    this._initialLoad = true;
    this._initialLoadCallbacks = [];
    this._lastCursorCall = {
      error: null,
      data: null
    };
    this._hasMoreResults = true; // fetch - 1 hasMoreResults

    // try to buffer first batch
    this._fetchNext();
  }

  BufferedCursor.prototype._fetchNext = function () {
    this._cursor.getNext((error, data) => {
      this._lastCursorCall = { error, data };
      if (this._initialLoadCallbacks.length) {
        // should send back actual cursor data (no buffer)
        this._hasMoreResults = this._cursor.hasMoreResults();
        const initialLoadCallbacks = [...this._initialLoadCallbacks];
        this._initialLoadCallbacks = [];
        initialLoadCallbacks.forEach(cb => cb(this._lastCursorCall.error, this._lastCursorCall.data));
        this._fetchNext();
      } else if (this._initialLoad) {
        this._initialLoad = false; // we have buffer now
      }
    });
  };

  BufferedCursor.prototype.hasMoreResults = function() {
    return this._hasMoreResults;
  }

  BufferedCursor.prototype.getNext = function(callback) {
    if (this._initialLoad) { // loading first batch of data and don't have the reponse yet
      this._initialLoadCallbacks.push(callback);
      return;
    }
    const lastCursorCall = this._lastCursorCall;
    this._hasMoreResults = this._cursor.hasMoreResults();
    if (lastCursorCall.error) {
      return callback(lastCursorCall.error);
    }
    this._fetchNext();

    return callback(lastCursorCall.error, lastCursorCall.data);
  }



  return {
    createInfiniteScroll,
    albumDetail,
    BufferedCursor
  };



});
