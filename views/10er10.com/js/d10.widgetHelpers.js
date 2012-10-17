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
  
  
  
  return {
    bindAlbumCoverPopin: bindAlbumCoverPopin
  };
  
  
  
});