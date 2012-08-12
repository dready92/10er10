
define(["js/d10.httpbroker","js/d10.when", "js/d10.rest", "js/user", "js/d10.localcache", "js/d10.templates", "js/d10.router", 
	   "js/playlist", "js/d10.jobWorker","js/bgtask", "js/my.plm", "js/d10.events", "js/config"],
	   function(bghttp, When, rest, user, localcache, tpl, router, playlist, jobs, bgtask, plmCtlr, pubsub, config) {
		   
		   
	var onWindowResize = function() {
		var body = $("body"),
			side = $("#side"),
			lastNavItem = $("#container >nav li:last-child"),
			endOfNav = lastNavItem.offset().left + lastNavItem.outerWidth(),
			windowWidth = $(window).width(),
			sideWidth = side.outerWidth(),
			canOverlap = windowWidth - sideWidth - endOfNav - 10;
		debug("canOverlap ? ",canOverlap);
		if ( canOverlap >= 0 ) {
			if ( !body.hasClass("wide") ) { body.addClass("wide"); }
		} else {
			if ( body.hasClass("wide") ) { body.removeClass("wide"); }
		}
	};
	var visibleBaby = function () {
		"use strict";

		var side = $("#side");
		
		var pos = $("#search > div").eq(0).position();
		var height = $("#search > div").eq(0).height();
		$("#search > div").eq(1).css({"top": pos.top + height, "left": pos.left,"min-width": $("#search input").width() });
		
		require(["js/playlist.driver.rpl"], function() {
			playlist.bootstrap();
// 			$(document).trigger("bootstrap:playlist");
		});
		side.css("display","");
		
		
		require(["js/welcome","js/upload", "js/my", "js/my.plm", "js/library", "js/results"], 
				function() {
					router.startRouting(["welcome"]);
				}
			   );
		
		$.each(playlist.modules,function(k,mod) { mod.enable(); });
		
		$('#beautyFade').remove();
		$("#containerWrap").css("position","");

		//
		// the monitor
		//
		jobs.push("enablePing",{"url": config.site_url+"/api/ping"},{
			"success": function(data) {debug("enablePingSuccess",data);},
			"error": function(err,msg) {debug("enablePingError",err,msg);}
		});
		pubsub.topic("audioDump").subscribe(function(data) { jobs.push("player",data,{}); });
		
        //
        // the footer displaying hours of music
        //
        pubsub.topic("library.totalSecondsOfMusic").subscribe(function(secs) { 
          var length = parseInt(secs / 60 / 60);
          $("footer span.hours").html(length);
        });
		
		//
		// init background tasks
		//
		setTimeout(function() { bgtask.init(); },7000);
		
		$(window).resize(onWindowResize);
		onWindowResize();
	};
		
		
	var launchMeBaby = function() {
		"use strict";
		// language selector
		$("footer .langChooser select").bind("change",function() {
	// 			debug("langchooser changed");
			var lng = $(this).val();
			location.search = "?lang="+lng;
		});

		if ( $("html").hasClass("csstransitions") ) {
			router.switchMainContainer = function(from,to,tab,name) {
				if ( from ) from.css("display","none").removeClass("active");
				if ( !to.hasClass("active") ) {
					to.show().addClass("active");
					this.trigger("container:"+tab+"/"+name);
				}
			};
		} else {
			router.switchMainContainer = router.switchContainer;
		}

// 		$(document).trigger("bootstrap:router");

		//
		// preload la vue "playlists"
		//
		plmCtlr.init_topic_plm ();
		
		router._containers.main.tab.delegate("[action]","click",function() {
			var elem = $(this), action = elem.attr("action");
			if ( ! elem.hasClass("active") ) { router.navigate(action,true); }
		});
		
		$('#container').css("display","block").animate({"opacity": 1}, 400,visibleBaby);
		$('#initialLoading').html(tpl.mustacheView("landing.letsgo"));
		$('#beautyFade').fadeOut(700);
		
	};

		
	var step2 = function () {
		"use strict";
		//
		// initialisation des workers ajax
		//
		bghttp.init(config.base_url);

		var loadCount = $("#initialLoading .count"),
			loadTotal = $("#initialLoading .total");
// 		debug(when);
		var when = When({
			//
			// récupération des templates HTML
			//
			templates: function(cb) {
				rest.templates({
					load: function(err,resp) {
						if ( err )	return cb("server error");
						for ( var index in resp ) { localcache.setTemplate(index,resp[index]); }
						return cb();
					}
				});
			},
			//
			// récupération des infos utilisateur
			//
			userInfos: function(cb)  {
				pubsub.topic("user.infos").one(function(infos) {cb(null,infos);});
				user.refresh_infos();
			}
		},
		launchMeBaby
		);
		
		when.onResponse(function() {
// 			debug("Complete: ",when.complete(),"on",when.total());
			loadCount.html(when.complete());
		});
		
		loadCount.html(when.complete());
		loadTotal.html(when.total());
		
        //
        // gestion du bouton + a gauche de chaque morceau
        //
		require(["js/main.songpopin"]);
		
		$("#main").delegate("div.song > span.artist","click",function(e) {
			router.navigateTo(["library","artists",$(this).text()]);
		});

		$("#main").delegate("div.song > span.album","click",function(e) {
			var album = $(this).text();
			if ( album.length ) {
				router.navigateTo(["library","albums",album]);
			}
		});
		$("#main").delegate("div.song > span.album","mouseenter",function(e) {
			var album = encodeURIComponent($(this).text());
			if ( album.length ) { $(this).addClass("link"); }
		});
		$("#main").delegate("div.song > span.album","mouseleave",function(e) { $(this).removeClass("link"); });
		
		//
		// tooltips
		//
		$('aside .table[name=controls] img, aside div.manager button, #modeSwitcher').tooltip({
			"predelay": 1000
		}).dynamic({ bottom: { direction: 'down', bounce: true } });

		//
		// variables par defaut
		//
		$('body').data('volume',0.5);
		
		$("footer a.logout").click(function() {
			$("footer .loggedin").hide();
			$("footer .loggingOut").removeClass("hidden");
			rest.user.logout({
				load: function(err) {
					if ( err ) {
						debug("can't logout user...",err);
					} else {
						window.location.reload(true);
					}
				}
			});
			return false;
		});
		
		$("header .logo, header .teaser").click(function() {
			router.navigateTo("welcome");
		});
		

	}

	var checkBrowser = function() {
		if ( Modernizr.audio == false ) {
			return false;
		}
		if ( Modernizr.audio.ogg.length == 0 ) {
			return false;
		}
		if ( Modernizr.cssgradients == false ) {
			return false;
		}
		if ( Modernizr.draganddrop == false ) {
			return false;
		}
		return true;
	};


	$(document).ready(function() {
		// trap esc key
		$(document).keydown(function(e) { if (e.keyCode && e.keyCode == 27 ) return false; });

		if ( !checkBrowser() ) {
			$("#initialLoading").fadeOut(function() {
			$("#browserNotSupported").fadeIn();
			});
		} else {
			delete Modernizr;
			$("#browserNotSupported").remove();
			step2();
		}
	});
	return {bootstrap: true};
});
