$(document).one("bootstrap:playlist",function() {

var module = null;
var createModule= function (ui) {

	var overlay,
	delayTimeout = null
	;

	var appendRandomSongs = function(count, genres) {
		count = count || 3;
		genres = genres || [];
		
		
		
		var opts = {
			data: {
				"not[]": d10.playlist.allIds(),
				"really_not[]": [],
				"type": "genre",
				"count": count
			},
			load: function (err, response) {
				if ( !err && response.length && ui.find(".autofill").hasClass("enabled") && d10.playlist.driver().writable() ) {
					var items = '';
					for ( var index in response ) {
						items+= d10.song_template( response[index] );
					}
					d10.playlist.append($(items));
				}
			}
		};
		for ( var index in d10.user.get_preferences().dislikes ) { opts.data["really_not[]"].push(index); }
		if ( genres && genres.length )  opts.data["name[]"] = genres;
				
		d10.rest.song.random(opts);
	};

	var appendSongs = function(count) {
		debug("playlistModules:radio should append songs");
		var genres = overlay.find("div.checked").map(function() {     return $(this).attr('name');    }   ).get();
		appendRandomSongs(count, genres);
	};

	var module = new d10.fn.playlistModule("radio", {
		"playlist:currentSongChanged": function(e) {
			if ( delayTimeout ) {
				clearTimeout(delayTimeout);
			}
			delayTimeout = setTimeout(function() {
				delayTimeout = null;
				if ( ui.find(".autofill").hasClass("enabled") && d10.playlist.current().nextAll().length < 3 ) {
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
		$(this).closest(".autofill").addClass("enabled");
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
		ui.find(".autofill").removeClass("enabled");
// 			ui.find(".off").show();
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
