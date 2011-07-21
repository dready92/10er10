(function(d10,$) {

	if ( ! "fn" in d10 ) {
		d10.fn = {};
	}
	

d10.fn.results = function (search,mainUi) {
	// 		var loaded = false;
	var ui = null;
	var lastRoute = null;
	var animated = false;
	var rcache = [],
	rcacheSize = 15,
	rcacheTTL = 120000,
	cacheStore = function(key,data) {
		data.key = key;
		rcache.push(data);
		while ( rcache.length > rcacheSize ) {
			rcache.shift();
		}
	},
	cacheGet = function(key) {
		for ( var i in rcache ) {
			if ( rcache[i].key == key ) {
				if ( rcache[i].date + rcacheTTL < new Date().getTime() ) {
					debug("results cache : cache expired");
					rcache.splice(i,1);
					break;
				}
				return rcache[i];
			}
		}
	};
	
	
	var load = function () {
		ui = mainUi.find("div.resultContainer").eq(0);
		ui.find("div.enlarge button").click(function() {
			var box=$(this).closest("div.rBox");
			var boxClass=box.hasClass("rSum1") ? "rSum1" : box.hasClass("rSum2") ? "rSum2" : null;
			if( !boxClass )	return ;
			var o = {"node":ui.find("div.rCenter"),"class":boxClass,"oldClass":"rCenter"};
			var n = {"node":box,"oldClass":boxClass,"class":"rCenter"};
			if ( !o.node.length ) {
				return ;
			}
			n.node.addClass(n.class).removeClass(n.oldClass);
			o.node.addClass(o.class).removeClass(o.oldClass);
		});
		ui.delegate("button.toggleDetails","click",function() {
			var item = $(this).closest(".rItem");
			if ( item.hasClass("parsed") ) {
				if ( item.hasClass("opened") ) {
					item.removeClass("opened");
				} else {
					item.addClass("opened");
				}
				return ;
			}
			if ( item.data("songs") ) {
				var html = "";
				$.each(item.data("songs"),function(key,val) {
					html+=d10.song_template(val);
				});
				item.find("div.details div.list").html(html);
			}
			item.addClass("parsed").addClass("opened").removeData("songs");
			
		})
		.delegate("div.song","dragstart", d10.dnd.onDragDefault)
		.delegate("div.song","dragend",d10.dnd.removeDragItem)
		.delegate("div.song","dblclick",function(e) {
			d10.playlist.append($(this).clone());
		})
		.delegate("div.song","click",function(e) {
			var target = $(e.target);
			if ( target.closest(".add").length == 0 && target.closest(".artist").length == 0 && target.closest(".album").length == 0 )
				$(this).toggleClass("selected");
		})
		.delegate("button[name=load]","click",function() {
			d10.playlist.append($(this).closest(".rItem").find("div.song").clone());
		})
		.delegate("button[name=loadNow]","click",function() {
			
			return d10.playlist.appendToCurrent($(this).closest(".rItem").find("div.song").clone());
			/*
			var cur = d10.playlist.current();
			if ( cur.length ) {
				return d10.playlist.append($(this).closest(".rItem").find("div.song").clone(),cur);
			}else {
				return d10.playlist.append($(this).closest(".rItem").find("div.song").clone());
			}
			*/
		})
		;
		
		mainUi.find("div.searchBackground img.next").click(function() {
			var rCenter = 	ui.find("div.rCenter"),
				  rSum1 = ui.find("div.rSum1"),
				  rSum2 = ui.find("div.rSum2");
			rCenter.addClass("rSum2").removeClass("rCenter");
			rSum2.addClass("rSum1").removeClass("rSum2");
			rSum1.addClass("rCenter").removeClass("rSum1");
			
		});
		mainUi.find("div.searchBackground img.previous").click(function() {
			var rCenter = 	ui.find("div.rCenter"),
				rSum1 = ui.find("div.rSum1"),
				rSum2 = ui.find("div.rSum2");
			rCenter.addClass("rSum1").removeClass("rCenter");
			rSum1.addClass("rSum2").removeClass("rSum1");
			rSum2.addClass("rCenter").removeClass("rSum2");
																  
		});
		search.bind("keyup",function() {
// 			window.location.hash="#/results/"+encodeURIComponent($(this).val());
			d10.router.navigateTo(["results",$(this).val()]);
		});

	};
	
	// ajax callback : this is the ajax options 
	var displayDetailsResponse = function (data) {
		if ( this.route != lastRoute ) {
			debug("details info too late",data);
			return false;
		}
		var looped = {};
		data.artists = data.artists || [];
		data.albums = data.albums || [];
		
		$.each ( data.artists, function(key,val) {
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
			var anode = $("div.rBox.artists div.items div[name='"+escape(key)+"']",ui);
			if ( !anode ) {
				debug("no node found for ",key,val);
				return ;
			}
			$("span.count",anode).prepend(val.count);
			$("span.duration",anode).prepend(parseInt(val.duration/60));
			anode.data("songs",val.songs).addClass("details");
		});
		looped = {};
		$.each ( data.albums, function(key,val) {
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
			var anode = $("div.rBox.albums div.items div[name='"+escape(key)+"']",ui);
			if ( !anode ) {
				debug("no node found for ",key,val);
				return ;
			}
			$("span.count",anode).prepend(val.count);
			$("span.duration",anode).prepend(parseInt(val.duration/60));
			anode.data("songs",val.songs).addClass("details");
		});
		
		var cache = {
			artists: $("div.rBox.artists div.items",ui).html(),
			albums: $("div.rBox.albums div.items",ui).html(),
			songs: $("div.rBox.songs div.items",ui).html(),
			date: new Date().getTime()
		};
		cacheStore(	this.route, cache);	  
	};
	
	var displayAjaxResponse = function(data) {
		debug(data);
		if ( this.route != lastRoute ) {
			debug("info too late");
			return false;
		}
		if ( animated ) {
			animated = false;
			mainUi.find("img.loop").stop(true).css({visibility: "hidden", opacity: 0.6});
		}
		var html = '';
		$("div.rBox.songs div.list",ui).empty();
		if ( data.title ) {
			for ( var index in data.title ) {
				html+= d10.song_template ( data.title[index].doc ) ;
			}
			if ( html.length ) {
				$("div.rBox.songs div.list",ui).html(html);
			}
		}
		
		var details = {"albums": [], "artists": []};
		
		$("div.rBox.albums div.items",ui).empty().removeData("songs");
		if ( data.album ) {
			html = '';
			for ( var index in data.album ) {
				html+= d10.mustacheView ( "results.album", {"name": data.album[index].doc.album, "ename": escape(data.album[index].doc.album) } ) ;
				details.albums.push(data.album[index].doc.album);
			}
			if ( html.length ) {
				$("div.rBox.albums div.items",ui).html(html);
			}
		}
		$("div.rBox.artists div.items",ui).empty().removeData("songs");
		if ( data.artist ) {
			html = '';
			for ( var index in data.artist ) {
				html+= d10.mustacheView ( "results.artist", {"name": data.artist[index].value.json.value, "ename": escape(data.artist[index].value.json.value) } ) ;
				details.artists.push(data.artist[index].value.json.value);
			}
			if ( html.length ) {
				$("div.rBox.artists div.items",ui).html(html);
			}
		}
		if ( details.artists.length || details.albums.length ) {
			debug("posting details request");
			var ajax = {
				"type": "POST",
				"url": site_url+"/api/details",
				"route": lastRoute,
				"dataType": "json",
				"data": details,
				"success": displayDetailsResponse
			};
			setTimeout(function() {
				if ( ajax.route == lastRoute ) {
					d10.bghttp.post(ajax);
				}
			} , 50);
		}
		debug(details);
	};
	
	var display = function(data) {

		data = data || "";
		if ( !ui ) { load(); }
		if ( data.length ) {
			if ( search.val() != data ) {
				debug("1 #results:"+search.val().length ? "/"+encodeURIComponent(search.val()) : "");
				search.val(data);
			}
		} else {
			if ( search.val().length ) {
				debug("2 #results:"+ "/"+encodeURIComponent(search.val())) ;
				setTimeout(function() {
					d10.router.navigateTo(["results",search.val()]);
				},5);
				return ;
			}
		}
		debug("results: ",data,lastRoute);
		if ( data.length ) {
			if ( data == lastRoute ) {
				return ;
			}
			lastRoute = data;
		} else {
			data.route = "/results";
			if ( lastRoute != data ) {
				$("div.rBox.albums div.items, div.rBox.artists div.items",ui).empty();
				$("div.rBox.songs div.items div.list",ui).empty();
				lastRoute = data;
			}
			return ;
		}
		if ( data.length ) {
// 			var q = data ;
			
			var cache = cacheGet(lastRoute);
			if ( cache ) {
				debug("getting results from cache");
				$("div.rBox.songs div.items",ui).html(cache.songs);
				
				setTimeout(function() {
					$("div.rBox.albums div.items",ui).html(cache.albums);
				},15);
				setTimeout(function() {
					$("div.rBox.artists div.items",ui).html(cache.artists);	
				},35);
				return;
			}
			
			
			var request = {
				"type": "GET",
				"url": site_url+"/api/search2",
				"route": lastRoute,
				"dataType": "json",
				"data": {"start": data},
				"success": displayAjaxResponse
			};
			
			debug("testing animated");
			d10.bghttp.get(request);
			debug("testing animated");
			if ( !animated ) {
				animated = true;
				debug("animate...");
				var startAnim = function() {
					debug("launching animation on ",mainUi.find("img.loop"));
					$("#results img.loop").css("visibility","visible").animate({opacity: 0.2},500,function() {
						$(this).animate({opacity: 0.6},500,startAnim);
					});
				};
				startAnim();
			}
		} else {
			$("div.items",ui).empty();
		}
		
	};
	
	load();
	
	return { display: display };
	
};

})(window.d10, jQuery);
		
$(document).ready(function() {
	d10.results = d10.fn.results($("#search input"),$("#results"));
	delete results;
});
