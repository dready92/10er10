"use strict";
define(["js/d10.templates"], function(templates) {
  
  var bindAlbumCoverPopin = function(categorydiv, template_name) {
    template_name = template_name || "library.content.album.all.popover";
    var currentOpenedPopin = null;
    categorydiv.delegate(".albumMini img","mouseenter",function() {
      var container = $(this).closest(".albumMini");
      $(this).data("popupTimeout", setTimeout(function() {
        var widget = $( templates.mustacheView(template_name, container.data("albumDetails") ) )
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
    });
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
  
  return {
    bindAlbumCoverPopin: bindAlbumCoverPopin,
    createInfiniteScroll: createInfiniteScroll
  };
  
  
  
});