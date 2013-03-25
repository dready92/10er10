"use strict";

define(["js/domReady","js/d10.playlistModule", "js/playlist", "js/d10.templates",
       "js/user", "js/d10.rest", "js/d10.localcache"
], 
	   function(foo, playlistModule, playlist, tpl, user, rest, localcache) {

var module = null;
var createModule= function (ui) {

	var overlay,
	delayTimeout = null
	;

    var loadGenres = function(then) {
      rest.genre.available({load: then});
    };
    
    var getGenres = function( then ) {
      var genres = localcache.getJSON("playlist.module.radio.genres");
      if ( genres ) {
        return then(null,genres);
      }
      
      loadGenres(function(err,resp) {
        if ( err ) {
          return then(err,resp);
        }
        localcache.setJSON("playlist.module.radio.genres",resp,true);
        then(err,resp);
      });
    };
    
    var prepareGenresTemplate = function(then) {
      getGenres(function(err,resp) {
        if ( err ) {return then(err);}
        var template_data = {genres: []};
        var selected = getSelectedGenres();
        for ( var i = 0; i<resp.length; i++) {
          var name = resp[i].key.pop();
          var g = {name: name, checked: false};
          if ( selected.indexOf(name) >= 0 ) {
            g.checked = true;
          }
          template_data.genres.push(g);
        }
        debug(template_data);
        then( null, tpl.mustacheView("hoverbox.genres.list", template_data) );
      });
    };
    
    
	var appendRandomSongs = function(count, genres) {
		count = count || 3;
		genres = genres || [];
		
		
		
		var opts = {
			data: {
				"not[]": playlist.allIds(),
				"really_not[]": [],
				"type": "genre",
				"count": count
			},
			load: function (err, response) {
				if ( !err && response.length && ui.find(".autofill").hasClass("enabled") && playlist.driver().writable() ) {
					var items = tpl.song_template( response );
					playlist.append($(items));
				}
			}
		};
		for ( var index in user.get_preferences().dislikes ) { opts.data["really_not[]"].push(index); }
		if ( genres && genres.length )  opts.data["name[]"] = genres;
				
		rest.song.random(opts);
	};

	var appendSongs = function(count) {
		debug("playlistModules:radio should append songs");
		var genres = getSelectedGenres();
		appendRandomSongs(count, genres);
	};
    
    var getSelectedGenres = function() {
      return overlay.find("div.checked").map(function() {     return $(this).attr('name');    }   ).get();
    };

	var module = new playlistModule("radio", {
		"playlist:currentSongChanged": function(e) {
			if ( delayTimeout ) {
				clearTimeout(delayTimeout);
			}
			delayTimeout = setTimeout(function() {
				delayTimeout = null;
				if ( ui.find(".autofill").hasClass("enabled") && playlist.current().nextAll().length < 3 ) {
					debug("radio2");
					appendSongs(settings.count);
				}
			}, settings.delay);
		}
	}, {
		enable: function() {ui.css({display:"block"});return this;},
		disable: function() {ui.css({display:"none"});return this;}
	});


	overlay = ui.find("div.yellowOverlay");
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
		prepareGenresTemplate(function(err,resp) {
          if ( !err ) {
            overlay.find(".list").html(resp);
          }
        });
		var pos = $(this).position();
		var top = pos.top-142;
// 		if ( top < 10 )  top = 10;
		overlay.css({"top": top ,"left": pos.left-200, "width": "250px"})
		.ovlay({"load":true});
	});
	$("div.disable",overlay).click(function () {
		if ( !module.isEnabled() ) { return ;}
		overlay.ovlay().close();
		ui.find(".autofill").removeClass("enabled");
// 			ui.find(".off").show();
	});
	$("div.closeWindow",overlay).click(function() {
		if ( !module.isEnabled() ) { return ;}
		overlay.ovlay().close();
	});
	overlay.find(".list").delegate("div","click",function() {
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

var mod = createModule($("#controls .optionsPanel"));
playlist.modules[mod.name] = mod;
return mod;	
	
	
});
