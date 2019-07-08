"use strict";

define(["js/domReady","js/d10.playlistModule", "js/playlist", "js/d10.templates",
       "js/user", "js/d10.rest", "js/d10.localcache"
],
	   function(foo, playlistModule, playlist, tpl, user, rest, localcache) {

var module = null;
var createModule= function (ui) {

	var delayTimeout = null
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
				"not": playlist.allIds(),
				"really_not": [],
				"type": "genre",
				"count": count
			},
			load: function (err, response) {
				if ( !err && response.length && ui.hasClass("enabled") && playlist.driver().writable() ) {
					var items = tpl.song_template( response );
					playlist.append($(items));
				}
			}
		};
		for ( var index in user.get_preferences().dislikes ) { opts.data["really_not"].push(index); }
		if ( genres && genres.length )  opts.data["name"] = genres;

		rest.song.random(opts);
	};

	var appendSongs = function(count) {
		debug("playlistModules:radio should append songs");
		var genres = getSelectedGenres();
		appendRandomSongs(count, genres);
	};

    var getSelectedGenres = function() {
      return ui.find("div.checked").map(function() {     return $(this).attr('name');    }   ).get();
    };

	var module = new playlistModule("radio", {
		"playlist:currentSongChanged": function(e) {
			if ( delayTimeout ) {
				clearTimeout(delayTimeout);
			}
			delayTimeout = setTimeout(function() {
				delayTimeout = null;
				if ( ui.hasClass("enabled") && playlist.current().nextAll().length < 3 ) {
					debug("radio2");
					appendSongs(settings.count);
				}
			}, settings.delay);
		}
	}, {
		enable: function() {ui.css({display:"block"});return this;},
		disable: function() {ui.css({display:"none"});return this;}
	});


	//debug(ui);
	ui.find(".off > .link").click(function() {
		if ( !module.isEnabled() ) { return ;}
		debug("click");
		ui.addClass("enabled");
        prepareGenresTemplate(function(err,resp) {
          if ( !err ) {
            ui.find(".list").html(resp);
          }
        });
	});
	ui.find("div.disable").click(function () {
		if ( !module.isEnabled() ) { return ;}
		ui.removeClass("enabled");
// 			ui.find(".off").show();
	});
	ui.find(".list").delegate("div","click",function() {
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

var mod = createModule($("#container > .radio"));
playlist.modules[mod.name] = mod;
return mod;


});
