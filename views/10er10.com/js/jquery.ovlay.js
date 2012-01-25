(function($){


var opened = null;

var overlay = function(panel, options) {
  var that = this;
  var settings = {
    "onBeforeLoad": function() {},
    "onLoad": function() {},
    "onBeforeClose": function() {},
    "onClose": function() {},
    "closeOnClick": true,
    "closeOnEsc": true,
    "closeOnMouseOut": false,
    "effect": "fade",
    "speed": "normal",
	align: {}
  };

  var effects = {
    "fade": {"show": "fadeIn", "hide": "fadeOut"},
    "slide": {"show": "slideDown", "hide": "slideUp"}
  };

  var alignments = ["left","right","top","bottom"];
  
  $.extend(settings,options);

  var panelIsIn = function (target) {
    var panelIn = false;
    var all = target.parents().andSelf().each(function() {
      if ( this === panel.get(0) ) {
        panelIn = true;
        return false;
      }
    });
    return panelIn;
  }
  
  var elemSize = function(elem) {
	return {
	  width: elem.width(),
	  height: elem.height(),
	  innerWidth: elem.innerWidth(),
	  innerHeight: elem.innerHeight(),
	  outerWidth: elem.outerWidth(),
	  outerHeight: elem.outerHeight()
	};
  };

  var alignTop = function(reference) {
	var popinSize = elemSize(panel);
	var rrSize = elemSize(reference);
	var rrOffset = reference.offset();
	var rrCenter = rrOffset.left + rrSize.outerWidth / 2;
	var popinLeft = rrCenter - popinSize.outerWidth / 2 ;
	var popinTop = rrOffset.top - popinSize.outerHeight;
	return {left: popinLeft, top: popinTop};
  };

  var alignBottom = function(reference) {
	var popinSize = elemSize(panel);
	var rrSize = elemSize(reference);
	var rrOffset = reference.offset();
	var rrCenter = rrOffset.left + rrSize.outerWidth / 2;
	var popinLeft = rrCenter - popinSize.outerWidth / 2 ;
	var popinTop = rrOffset.top + rrSize.outerHeight;
	return {left: popinLeft, top: popinTop};
  };
  
  var alignLeft = function(reference) {
	var popinSize = elemSize(panel);
	var rrSize = elemSize(reference);
	var rrOffset = reference.offset();
	var rrCenter = rrOffset.top + rrSize.outerHeight / 2;
	var popinLeft = rrOffset.left - popinSize.outerWidth;
	var popinTop = rrCenter - popinSize.outerHeight / 2 ;
	return {left: popinLeft, top: popinTop};
  };
  
  var alignRight = function(reference) {
	var popinSize = elemSize(panel);
	var rrSize = elemSize(reference);
	var rrOffset = reference.offset();
	var rrCenter = rrOffset.top + rrSize.outerHeight / 2;
	var popinLeft = rrOffset.left + rrSize.outerWidth;
	var popinTop = rrCenter - popinSize.outerHeight / 2 ;
	return {left: popinLeft, top: popinTop};
  };
  
  
  this.getOverlay = function() { return panel; };
  this.close = function() {
    settings.onBeforeClose.call(this);
    panel[effects[settings.effect].hide](function() {
      settings.onClose.call(that);
      panel.removeData("ovlay");
    });
    $(document).unbind("click.ovlay keyup.ovlay");
  }
  this.open = function () {
    settings.onBeforeLoad.call(this);
    panel.css({"position": "absolute"})[effects[settings.effect].show](function() {
      settings.onLoad.call(that);
    });
  }

  panel.data("ovlay",this);
  
  if ( settings.align.reference && alignments.indexOf(settings.align.position) >= 0 ) {
	//get panel size
	panel.css({position: "absolute", left: -10000, visibility: "hidden", display: "block"}).appendTo($("body"));
	var position ;
	if ( settings.align.position == "left" ) position = alignLeft(settings.align.reference);
	else if ( settings.align.position == "right" ) position = alignRight(settings.align.reference);
	else if ( settings.align.position == "top" ) position = alignTop(settings.align.reference);
	else position = alignBottom(settings.align.reference);
	if ( settings.align.leftOffset ) {
	  position.left += settings.align.leftOffset
	}
	if ( settings.align.topOffset ) {
	  position.top += settings.align.topOffset
	}
	panel.css({display: "none", visibility: "visible", top: position.top, left: position.left});
 
  }
  
  
  this.open();


  // delaying event bindings allow to 
  setTimeout(function() {
  // click outside handler
    if ( settings.closeOnClick ) {
      $(document).bind("click.ovlay",function(e) {
        if ( !panelIsIn($(e.target)) ) { that.close(); }
      });
    }
    if ( settings.closeOnEsc ) {
      $(document).bind("keyup.ovlay",function(e) { if ( e.keyCode == 27 ) {that.close();} });
    }

    if ( settings.closeOnMouseOut ) {
      timeoutId = null;
      panel.mouseleave(function() {
        timeoutId = setTimeout(function() {
          that.close();
          timeoutId = null;
        },500);
      }).mouseenter(function() {
        if ( timeoutId ) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      });
    }



  },20);

};

$.fn.ovlay = function(options) {
  if ( !options ) { return this.data("ovlay"); }
  if ( opened ) { opened.close(true); }
  opened = new overlay(this,options);
  return this;
};

$.fn.permanentOvlay = function (url, overlayNode, options) {
	var searchinput = this;
	var lastSearchText = '';
	var results = null;
	var focused = false;
	var keepOpen = false;
	var mouseTimeout = false;
	var settings = {
		"autocss": false,
		"varname" : "start",
		"minlength": 3,
		"show": function(txt) {
		},
		"select": function (txt,json) {return txt;},
		"searchStart": function() {
			$(".loading",overlayNode).show();
			$("ul",overlayNode).hide();
			$(".noResult",overlayNode).hide();
		},
		"searchStop": function() {
			$(".loading",overlayNode).hide();
		},
		"searchResults": function (response) { 
			$(".loading",overlayNode).hide();
			$(".noResult",overlayNode).hide();
			$("ul",overlayNode).show();
		},
		"searchNoResults": function () {
			$(".loading",overlayNode).hide();
			$(".noResult",overlayNode).show();
			$("ul",overlayNode).hide();
		},
		"keydelay": 600
	};
	options = options || {};
	$.extend(settings,options);
	if ( !overlayNode || !overlayNode.jquery ) { return this; }
	if ( searchinput.attr('defaultvalue') && searchinput.val() == '' )  searchinput.val( searchinput.attr('defaultvalue') );
 
	searchinput.focus(function() {
		focused = true;
		if ( searchinput.attr('defaultvalue') && searchinput.val() == searchinput.attr('defaultvalue') )  searchinput.val('');
		checkTextSync();
		if ( settings.autocss ) {
			overlayNode.css({
				"position": "absolute",
				"top": searchinput.position().top + searchinput.height(),
				"left": searchinput.position().left
			});
		}

		overlayNode.slideDown("fast");
	})
	.blur(function() {
		focused = false;
		if ( !keepOpen ) {
			overlayNode.hide();
			if ( searchinput.attr('defaultvalue') && searchinput.val() == '' )  searchinput.val( searchinput.attr('defaultvalue') );
		}
	})
	.keydown(function(e) {
		e.stopPropagation();
		debug("keydown ",e.keyCode);
		if ( overlayNode.is(":hidden") ) { overlayNode.slideDown("fast"); }
		if ( overlayNode.find("ul li").length ) {
			debug("got length...");
			var current = $("li.current",overlayNode), node;
			if ( e.keyCode == 40 ) {
				if ( !current.length ) {
					node = overlayNode.find("ul li").first();
				} else {
					node = current.next();
				}
				if ( node.length ) {
					current.removeClass("current");
					node.addClass("current");
					var h = node.position().top + node.height();
					var height = overlayNode.height();
					if ( h < 0 || h > height ) {
						var st = overlayNode.get(0).scrollTop;
						overlayNode.get(0).scrollTop = st + ( h - (height / 2));
					}
					//                       debug("height: ",settings.overlay.height()," pos ",node.position());
				}
			} else if ( e.keyCode == 38 ) {
				if ( !current.length ) {
					node = overlayNode.find("ul li").last();
				} else {
					node = current.prev();
				}
				if ( node.length ) {
					current.removeClass("current");
					node.addClass("current");
					var h = node.position().top;
					var height = overlayNode.height();
					if ( h < 0 || h > height ) {
						var st = overlayNode.get(0).scrollTop;
						overlayNode.get(0).scrollTop = st + ( h - (height / 2));
					}
				}
			} else if ( e.keyCode == 13 ) {
				launchResultSelected();
				return false;
			}
		}
		
	})
	.keyup(function(e) {
		checkTextSync();
	})
	;
	
	overlayNode.mouseenter(function() {
		keepOpen = true;
		if ( mouseTimeout ) {
			clearTimeout(mouseTimeout);
			mouseTimeout = false;
		}
	})
	.mouseleave(function() {
		mouseTimeout = setTimeout(function() {
			keepOpen = false;
			if ( focused )	return ;
			overlayNode.hide();
			if ( searchinput.attr('defaultvalue') && searchinput.val() == '' )  searchinput.val( searchinput.attr('defaultvalue') );
		}, 600);
	})
	.delegate("li","click",function() {
		searchinput.get(0).focus();
		launchResultSelected();
		
	})
	.delegate("li","mouseover",function(e) {
		var node=$(this);
		if(!node.hasClass("current")) {
			overlayNode.find("li").removeClass("current");
			node.addClass("current");
		}
	});
	;

	var checkTextSync = function () {
		var searchText = getSearchText();
// 		debug("keyup: ", getSearchText());
		if ( searchText == lastSearchText ) {
			return ;
		}
		lastSearchText = searchText;
		if ( searchText.length >= settings.minlength ) {
// 			var data = {  };
// 			data[settings.varname] = searchText;
			ajaxCall(searchText, settings.searchResults, settings.searchNoResults);
		} else {
			$("ul",overlayNode).empty().hide();
		}
	};
	
	var ajaxCall = function ( data, with_results, no_results ) {
		settings.searchStart.call(searchinput);
		url(data, {
			load: function(err,response) {
				debug("ajax response:",response);
				if ( data != lastSearchText ) {
					return ;
				}
				if ( !err ) {
					results = response;
					delete response;
					parseAjaxResponse (results);
					overlayNode.attr("scrollTop",0);
					with_results.call(overlayNode, results);
					settings.searchStop.call(searchinput);
				} else {
					no_results.call(overlayNode);
					settings.searchStop.call(searchinput);
				}
			}
		});
	};
	
	var parseAjaxResponse = function (response) {
		var html = '';
		for ( var index in response ) {
			if ( typeof response[index].text === "undefined" ) {
				html += "<li style=\"display: block\">"+response[index]+"</li>";
			}else {
				html += "<li style=\"display: block\">"+response[index].text+"</li>";
			}
		}
		$("ul",overlayNode).html(html);
		$("ul li:first-child",overlayNode).addClass("current");
	};
	
	var getSearchText = function () {
		if ( searchinput.attr('defaultvalue') && searchinput.val() == searchinput.attr('defaultvalue') ) {
			return "";
		}
		return searchinput.val().replace(/^\s+/,"").replace(/\s+$/,"");
	};

	var launchResultSelected = function () {
		overlayNode.slideUp("fast");
// 		searchinput.blur();
		var row = results[$("li.current",overlayNode).prevAll().length];
		var params = {};
		if (typeof(row.json) === "undefined") { params = {text: row, json: {}}; }
		else { params = {text: row.text, json: row.json}; }
		searchinput.val( settings.select(params.text,params.json) );
	};
	
	return {
		setUrl: function(value) {
			url = value;
			lastSearchText = "";
		}
	};
};



})(jQuery);