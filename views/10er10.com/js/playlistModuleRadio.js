$(document).one("bootstrap:playlist",function() {

var module = null;
var createModule= function (ui) {
	/*
	deprecates: 
	$(document).trigger('player.mainTimeUpdate',{'currentTime': secs, 'duration': dur }	);
	*/

	var overlay,
	delayTimeout = null

	;

	var appendRandomSongs = function(count, genres) {
		count = count || 3;
		genres = genres || [];
		var opts = {
			"url": site_url+"/api/random",
			"dataType": "json",
			"data": {
				"not[]": d10.playlist.allIds(),
				"really_not[]": [],
				"type": "genre",
				"count": count
			},
			"success": function (response) {
				if ( response.status == "success" && response.data.songs.length && ui.find(".on").is(":visible") && d10.playlist.driver().writable() ) {
					var items = '';
					for ( var index in response.data.songs ) {
						items+= d10.song_template( response.data.songs[index] );
					}
					d10.playlist.append($(items));
				}
			}
		};
		for ( var index in d10.user.get_preferences().dislikes ) { opts.data["really_not[]"].push(index); }
		if ( genres && genres.length )  opts.data["name[]"] = genres;
		d10.bghttp.post(opts);
	};

	var appendSongs = function(count) {
		debug("playlistModules:radio should append songs");
		var genres = overlay.find("div.checked").map(function() {     return $(this).attr('name');    }   ).get();
		appendRandomSongs(count, genres);
	};
/*
	var binder = new d10.fn.eventsBinder();
	binder.addBindings({
		// 		currentTimeUpdate: function(e) {
		// 			debug("radio currentTimeUpdate");
		// 			if ( e.currentTime == settings.delay && ui.find(".on").is(":visible") ) {
		// 				
		// 				appendSongs(5);
		// 			}
		// 		},
		"playlist:currentSongChanged": function(e) {
			if ( delayTimeout ) {
				clearTimeout(delayTimeout);
			}
			delayTimeout = setTimeout(function() {
				debug("radio1");
				if ( ui.find(".on").is(":visible") && d10.playlist.current().nextAll().length < 3 ) {
					debug("radio2");
					appendSongs(settings.count);
				}
			}, settings.delay);
		}
	});
*/
	var module = new d10.fn.playlistModule("radio", {
                "playlist:currentSongChanged": function(e) {
                        if ( delayTimeout ) {
                                clearTimeout(delayTimeout);
                        }
                        delayTimeout = setTimeout(function() {
                                debug("radio1");
                                if ( ui.find(".on").is(":visible") && d10.playlist.current().nextAll().length < 3 ) {
                                        debug("radio2");
                                        appendSongs(settings.count);
                                }
                        }, settings.delay);
                }
        }, {
		enable: function() {ui.css({display:"block"});return this;},
		disable: function() {ui.css({display:"none"});return this;}
	});


		overlay = ui.find("div.overlay");
		//debug(ui);
		ui.find(".off > .link").click(function() {
			if ( !module.isEnabled() ) { return ;}
			debug("click");
			$(this).parent().hide().siblings(".on").show();
		});
		ui.find(".on > .link").click(function() {
			if ( !module.isEnabled() ) { return ;}
			if ( overlay.ovlay() ) {
				return overlay.ovlay().close();
			}
			var pos = $(this).position();
			var top = pos.top-200;
			if ( top < 10 )  top = 10;
			overlay.css({"top": top ,"left": pos.left-270, "width": "250px"})
			.ovlay({"load":true});
		});
		$("div.disable",overlay).click(function () {
			if ( !module.isEnabled() ) { return ;}
			overlay.ovlay().close();
			ui.find(".on").hide();
			ui.find(".off").show();
		});
		$("div.close",overlay).click(function() {
			if ( !module.isEnabled() ) { return ;}
			overlay.ovlay().close();
		});
		$(".list > div",overlay).click(function() {
			if ( !module.isEnabled() ) { return ;}
 			$(this).toggleClass("checked"); 
		});
		
		return module;
};
var settings ;

	
	settings = $.extend(
		{
			delay: 7000,
			count: 5
		}
		
	,{});

	var mod = createModule($("#side"));
	d10.playlist.modules[mod.name] = mod;
});
