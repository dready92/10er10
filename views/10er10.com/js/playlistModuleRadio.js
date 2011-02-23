(function($){

/*
deprecates: 
$(document).trigger('player.mainTimeUpdate',{'currentTime': secs, 'duration': dur }	);
*/

var ui,overlay;

var appendRandomSongs = function(count, genres) {
	count = count || 3;
	genres = genres || [];
	var opts = {
		"url": site_url+"/api/random",
		"dataType": "json",
		"data": {
			"not[]": d10.playlist.songsIds(),
			"really_not[]": [],
			"type": "genre",
			"count": count
		},
		"success": function (response) {
			if ( response.status == "success" && response.data.songs.length && ui.find(".on").is(":visible") && d10.playlist.driver.writable() ) {
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

var appendSongs = function() {
	debug("playlistModules:radio should append songs");
};


var module = {
	name: "radio",
	events: {
		currentTimeUpdate: function(e) {
// 			debug("radio currentTimeUpdate");
			if ( e.currentTime == settings.delay && ui.find(".on").is(":visible") ) {
				
				appendSongs(5);
			}
		}
	},
	enable: function() {ui.css({display:"block"});},
	disable: function() {ui.css({display:"none"});}
};

$(document).ready(function() {
	ui=$("#controls > div.autofill");
	overlay = ui.find("div.overlay");
	//debug(ui);
	ui.find(".off > .link").click(function() {
		debug("click");
		$(this).parent().hide().siblings(".on").show();
	});
	ui.find(".on > .link").click(function() {
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
		overlay.ovlay().close();
		ui.find(".on").hide();
		ui.find(".off").show();
	});
	$("div.close",overlay).click(function() {
		overlay.ovlay().close();
	});
	$(".list > div",overlay).click(function() { $(this).toggleClass("checked"); });
	
});

var settings ;

d10.fn.playlistModules = d10.fn.playlistModules || {};
d10.fn.playlistModules.radio = function(options)  {
	
	settings = $.extend(
		{
			delay: 7,
			count: 5
		}
		
	,options);
	return module;
};

})(jQuery);
