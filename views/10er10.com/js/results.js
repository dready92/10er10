define(["js/domReady", "js/d10.rest", "js/d10.router", "js/d10.templates", "js/d10.dnd", "js/playlist", "js/d10.restHelpers"],
	   function(foo, rest, router, tpl, dnd, playlist, restHelpers) {
	
var results = function (search,mainUi) {
	var ui = null;
	var lastRoute = null;
	var animated = false,
	stopAnimated = function() {
		if ( animated ) {
			animated = false;
			mainUi.find("img.loop").stop(true).css({visibility: "hidden", opacity: 0.6});
		}
	},
	startAnimated = function() {
		debug("testing animated");
		if ( !animated ) {
			animated = true;
			debug("animate...");
			var startAnim = function() {
				mainUi.find("img.loop").css("visibility","visible").animate({opacity: 0.2},500,function() {
					$(this).animate({opacity: 0.6},500,startAnim);
				});
			};
			startAnim();
		}
	},
	pagers = [],
	uiReset = function() {
		$("div.rBox.songs div.list",ui).empty();
		ui.find("div.items").attr("scrollTop",0);
		$("div.rBox.albums div.items",ui).empty().removeData("songs");
		$("div.rBox.artists div.items",ui).empty().removeData("songs");
		stopAnimated();
		$.each(pagers, function(k,pager) {
			pager.remove();
		});
		pagers = [];
	},
    replaceMainContainer  = function(box) {
      var boxClass=box.hasClass("rSum1") ? "rSum1" : box.hasClass("rSum2") ? "rSum2" : null;
      if( !boxClass ) return ;
      var o = {"node":ui.find("div.rCenter"),"class":boxClass,"oldClass":"rCenter"};
      var n = {"node":box,"oldClass":boxClass,"class":"rCenter"};
      if ( !o.node.length ) {
          return ;
      }
      n.node.addClass(n.class).removeClass(n.oldClass);
      o.node.addClass(o.class).removeClass(o.oldClass);
    },
    openHead = function(head) {
      var item = head.closest(".rItem");
      if ( item.hasClass("parsed") ) {
          if ( item.hasClass("opened") ) {
              item.removeClass("opened");
          } else {
              item.addClass("opened");
          }
          return ;
      }
      if ( item.data("songs") ) {
          var html = tpl.song_template(item.data("songs"));
          item.find("div.details div.list").html(html);
      }
      item.addClass("parsed").addClass("opened").removeData("songs");
    },
	minChars=3;
	
	var load = function () {
		ui = mainUi.find("div.resultContainer").eq(0);
		ui.find("div.enlarge button").click(function() {
			var box=$(this).closest("div.rBox");
			replaceMainContainer(box);
		});
		
		ui.delegate(".rCenter .head", "click", function() {
			openHead($(this));
		})
		.delegate(".openInLibrary","click",function(e) {
			e.stopPropagation();
			var item = $(this).closest(".rItem"), box = item.closest(".rBox");
			if ( box.hasClass("artists") ) {
				router.navigateTo(["library","artists",unescape(item.attr("name"))]);
			} else {
				router.navigateTo(["library","albums",unescape(item.attr("name"))]);
			}
		});

        ui.delegate(".rSum1 .head, .rSum2 .head", "click", function() {
          var box=$(this).closest("div.rBox");
          var items = $(this).closest(".items");
          var ritem = $(this).closest(".rItem");
          replaceMainContainer(box);
          if ( !ritem.hasClass("opened") ) {
            openHead($(this));
          }
          setTimeout(function() {
            items.animate({scrollTop: items.scrollTop() + ritem.position().top},300);
//             ritem.one("transitionend", function() {debug("animation ended");});
            ritem.addClass("highlight");
//             items.scrollTop = items.scrollTop + ritem.position().top;
          },600);
          if ( ritem.hasClass("highlight") ) {
            ritem.removeClass("highlight");
          }
        });
        
		ui.delegate("div.song","dragstart", dnd.onDragDefault)
		.delegate("div.song","dragend",dnd.removeDragItem)
		.delegate("div.song","dblclick",function(e) {
			var toAppend = $(this).clone();
			playlist.appendToCurrent(toAppend);
			playlist.driver().play( playlist.getTrackParameters(toAppend) );
// 			playlist.append($(this).clone());
		})
		.delegate("div.song","click",function(e) {
			var target = $(e.target);
			if ( target.closest(".add").length == 0 && target.closest(".artist").length == 0 && target.closest(".album").length == 0 )
				$(this).toggleClass("selected");
		})
		.delegate("button[name=load]","click",function() {
			playlist.append($(this).closest(".rItem").find("div.song").clone());
		})
		.delegate("button[name=loadNow]","click",function() {
			return playlist.appendToCurrent($(this).closest(".rItem").find("div.song").clone());
		})
		;
		
		var turnChrono = function() {
			var rCenter = 	ui.find("div.rCenter"),
				  rSum1 = ui.find("div.rSum1"),
				  rSum2 = ui.find("div.rSum2");
			rCenter.addClass("rSum2").removeClass("rCenter");
			rSum2.addClass("rSum1").removeClass("rSum2");
			rSum1.addClass("rCenter").removeClass("rSum1");
		};
		
		mainUi.find("div.searchBackground img.next").click(turnChrono);
		mainUi.find("div.searchBackground img.previous").click(function() {
			var rCenter = 	ui.find("div.rCenter"),
				rSum1 = ui.find("div.rSum1"),
				rSum2 = ui.find("div.rSum2");
			rCenter.addClass("rSum1").removeClass("rCenter");
			rSum1.addClass("rSum2").removeClass("rSum1");
			rSum2.addClass("rCenter").removeClass("rSum2");
																  
		});
		search.bind("keyup",function() {
			router.navigateTo(["results",$(this).val()]);
		})
		.bind("keydown",function(e) {
			if ( e.keyCode == 9 ) {	// Tab
				e.preventDefault();
				turnChrono();
			}
		});

	};

	var displayArtistsDetails = function(widget, details) {
		var looped = {};
		$.each ( details.artists, function(key,val) {
			if ( !looped[val.key] ) {
				looped[val.key] = {
					"duration": val.doc.duration,
					"count": 1,
					"songs": [ val.doc ]
				};
			} else {
				looped[val.key].duration += val.doc.duration;
				looped[val.key].count++;
				var inserted = false;
				$.each ( looped[val.key].songs , function (k,v) {
					if ( val.doc.title < v.title ) {
						looped[val.key].songs.splice(k,0,val.doc);
						inserted = true;
						return false;
					}
				});
				if ( !inserted ) {
					looped[val.key].songs.push(val.doc);
				}
			}
		});
		$.each(looped,function(key,val) {
			var anode = widget.find("div[name='"+escape(key)+"']");
			if ( !anode ) {
				debug("no node found for ",key,val);
				return ;
			}
			$("span.count",anode).prepend(val.count);
			$("span.duration",anode).prepend(parseInt(val.duration/60));
			anode.data("songs",val.songs).addClass("details");
		});
	};
	
	var displayAlbumsDetails = function(widget, details) {
		debug("displaying albums details",widget,details);
		var looped = {};
		$.each ( details.albums, function(key,val) {
			if ( !looped[val.key] ) {
				looped[val.key] = {
					"duration": val.doc.duration ,
					"count": 1,
					"songs": [ val.doc ]
				};
			} else {
				looped[val.key].duration += val.doc.duration;
				looped[val.key].count++;
				var inserted = false;
				$.each ( looped[val.key].songs , function (k,v) {
					if ( val.doc.tracknumber < v.tracknumber ) {
						looped[val.key].songs.splice(k,0,val.doc);
						inserted = true;
						return false;
					}
				});
				if ( !inserted ) {
					looped[val.key].songs.push(val.doc);
				}
			}
		});
		$.each(looped,function(key,val) {
			var anode = widget.find("div[name='"+escape(key)+"']");
			if ( !anode ) {
				debug("no node found for ",key,val);
				return ;
			}
			$("span.count",anode).prepend(val.count);
			$("span.duration",anode).prepend(parseInt(val.duration/60));
			anode.data("songs",val.songs).addClass("details");
		});
	};
	var displayAjaxResponse = function(err, data, token) {
		debug(data);
		if ( token != lastRoute ) {
			debug("info too late");
			return false;
		}
		stopAnimated();
		if ( err ) {
			return false;
		}
		var html = '';
		uiReset();
		
		var titleCursor = new restHelpers.emulatedCursor(data.title);
		pagers.push(
			ui.find("div.rBox.songs div.items").d10scroll(titleCursor, ui.find("div.rBox.songs div.list"), {pxMin: 100})
		);
		
		var albumCursor = new restHelpers.emulatedCursor(data.album);
		pagers.push(
			ui.find("div.rBox.albums div.items").d10scroll(albumCursor, ui.find("div.rBox.albums div.items"), 
				{
					pxMin: 100,
					parseResults: function(rows) {
						var html = "";
						for ( var index in rows ) {
							html+= tpl.mustacheView ( "results.album", {"name": rows[index].doc.album, "ename": escape(rows[index].doc.album) } ) ;
						}
						return html;
					},
					onContent: function(rows) {
						var details = {albums: []};
						for ( var index in rows ) {
							details.albums.push( rows[index].doc.album );
						}
						(function(token,widget) {
							rest.search.details(details, {
								load: function(err,resp) {
// 										displayDetailsResponse.call(this,err,resp,token);
									if ( token != lastRoute ) {
										debug("Album details response is too late");
										return ;
									}
									if ( err ) {
										debug("Album details is in error: ",err);
										return ;
									}
									debug("Album details: ",resp);
									displayAlbumsDetails(widget,resp);
								}
							});
						})(lastRoute,this);
						
					}
				})
		);
		
		var artistCursor = new restHelpers.emulatedCursor(data.artist);
		pagers.push(
			ui.find("div.rBox.artists div.items").d10scroll(artistCursor, ui.find("div.rBox.artists div.items"), 
				{
					pxMin: 100,
					parseResults: function(rows) {
						var html = "";
						for ( var index in rows ) {
							html+= tpl.mustacheView ( "results.artist", {"name": rows[index].value.json.value, "ename": escape(rows[index].value.json.value) } ) ;
						}
						return html;
					},
					onContent: function(rows) {
						var details = {artists: []};
						for ( var index in rows ) {
							details.artists.push( rows[index].value.json.value );
						}
						(function(token,widget) {
							rest.search.details(details, {
								load: function(err,resp) {
// 										displayDetailsResponse.call(this,err,resp,token);
									if ( token != lastRoute ) {
										debug("Artist details response is too late");
										return ;
									}
									if ( err ) {
										debug("Artist details is in error: ",err);
										return ;
									}
									debug("Artist details: ",resp);
									displayArtistsDetails(widget,resp);
								}
							});
						})(lastRoute,this);
						
					}
				})
		);
	};
	
	var display = function(data) {
		data = data || "";
		if ( data.length ) {
			if ( search.val() != data ) {
				debug("1 #results:"+search.val().length ? "/"+encodeURIComponent(search.val()) : "");
				search.val(data);
			}
		} else {
			if ( search.val().length ) {
				debug("2 #results:"+ "/"+encodeURIComponent(search.val())) ;
				setTimeout(function() {
					router.navigateTo(["results",search.val()]);
				},5);
				return ;
			}
		}
		if ( data.length < minChars ) {
			lastRoute = "";
			uiReset();
			return ;
		}
		if ( data.length ) {
			if ( data == lastRoute ) {
				return ;
			}
			lastRoute = data;
		} else {
			if ( lastRoute != data ) {
				uiReset();
				lastRoute = data;
			}
			return ;
		}
		if ( data.length ) {
			(function(token) {
				setTimeout(function() {
					if ( token != lastRoute ) {
						return ;
					}
					rest.search.all(token,{
						load: function(err,resp) { displayAjaxResponse(err, resp, token); }
					});
					startAnimated();
				},150);
			})(lastRoute);
		} else {
			uiReset();
		}
		
	};
	load();

    return { display: display };

};

	var controller = new results($("#search input"),$("#results"));
	var resultsRouteHandler = function(search) {
		controller.display(decodeURIComponent(search ? search : ""));
		this._activate("main","results",this.switchMainContainer);
		$("#search input").get(0).focus();
	};
	router.route("results","results",resultsRouteHandler);
	router.route("results/:search","results",resultsRouteHandler);


	return controller;
	
});
