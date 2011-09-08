(function($){

var visibleBaby = function () {
	d10.playlist.bootstrap();
	$(document).trigger("bootstrap:playlist");
	
	$.each(d10.playlist.modules,function(k,mod) { mod.enable(); });
	
	$('#beautyFade').remove();
	$("#containerWrap").css("position","");

	//
	// reminder click
	//
	$("#reviewReminder").click(function() { d10.router.navigateTo(["my","review"]); });

	//
	// the monitor
	//
	d10.jobs = new d10.fn.jobs(base_url+"js/jobworker.js",4,function(job,data) {debug("job response: ",job,data);});
	d10.jobs.push("enablePing",{"url": site_url+"/api/ping"},{
	"success": function(data) {debug("enablePingSuccess",data);},
	"error": function(err,msg) {debug("enablePingError",err,msg);},                    
	});
	$(document).bind("audioDump",function(e,data) { 
		d10.jobs.push("player",data,{}); 
	});
	
	
	//
	// init background tasks
	//
	setTimeout(function() { d10.bgtask.init(); },7000);
	
	pos = $("#search > div").eq(0).position();
	height = $("#search > div").eq(0).height();
	$("#search > div").eq(1).css({"top": pos.top + height, "left": pos.left,"min-width": $("#search input").width() });
	
	$("#side").css("display","");
};
	
	
var launchMeBaby = function() {
	// language selector
	$("footer .langChooser select").bind("change",function() {
// 			debug("langchooser changed");
		var lng = $(this).val();
		location.search = "?lang="+lng;
	});

	if ( $("html").hasClass("csstransitions") ) {
		d10.fn.router.switchMainContainer = function(from,to,tab,name) {
			if ( from ) from.css("display","none").removeClass("active");
			if ( !to.hasClass("active") ) {
				to.show().addClass("active");
				this.trigger("container:"+tab+"/"+name);
			}
		};
	} else {
		d10.fn.router.switchMainContainer = d10.fn.router.switchContainer
	}

	var router = Backbone.Router.extend.call(Backbone.Router, d10.fn.router);
	d10.router = new router();
	$(document).trigger("bootstrap:router");
	//
	// preload la vue "playlists"
	//
	d10.my.plmanager.init_topic_plm ();

	var startHistory = Backbone.history.start();
	debug("------starting history",startHistory);
	if ( !startHistory ) {
		d10.router.navigateTo(["welcome"]);
	}
	
	d10.router._containers.main.tab.delegate("[action]","click",function() {
		var elem = $(this), action = elem.attr("action");
		if ( ! elem.hasClass("active") ) { d10.router.navigate(action,true); }
	});
	
	$('#container').css("display","block").animate({"opacity": 1}, 400,visibleBaby);
	$('#initialLoading').html(d10.mustacheView("landing.letsgo"));
	$('#beautyFade').fadeOut(700);
	
};

	
var step2 = function () {
	
	//
	// initialisation des workers ajax
	//
	d10.bghttp.init(base_url);

	var loadCount = $("#initialLoading .count"),
		loadTotal = $("#initialLoading .total");

	var when = d10.when({
		//
		// récupération des templates HTML
		//
		templates: function(cb) {
			d10.rest.templates({
				load: function(err,resp) {
					if ( err )	return cb("server error");
					for ( var index in resp ) { d10.localcache.setTemplate(index,resp[index]); }
					return cb();
				}
			});
		},
		//
		// récupération des infos utilisateur
		//
		userInfos: function(cb)  {
			$(document).one("user.infos",cb);
			d10.user.refresh_infos();
		}
	},
	launchMeBaby
	);
	
	when.onResponse(function() {
		debug("Complete: ",when.complete(),"on",when.total());
		loadCount.html(when.complete());
	});
	
	loadCount.html(when.complete());
	loadTotal.html(when.total());
	
	d10.playlist = new d10.fn.playlistProto( $("aside"),{});
  //
  // gestion du bouton + a gauche de chaque morceau
  //

	$("#main").delegate('.song .add','click',function  (e) {
		var song = $(this).closest('.song');
		var id=song.attr('name');
		
		var playlists = d10.user.get_playlists();
		var elem = $(d10.mustacheView('hoverbox.addsong.container',{playlist: playlists, _id: id}));
		if ( playlists.length ) { $('div[name=playlists]',elem).show(); }
		if ( song.attr("data-owner") ) {
			elem.find("[name=edit]").removeClass("hidden");
		}
		
		var height = parseInt ( elem.css('height').replace(/px$/,'') );
		var top = e.pageY - 10;
		if ( top + height  > $(window).height() && $(window).height() + 10 - height > 0 ) {
			top = $(window).height() - height -10;
		}
		elem.css ( {'top': top,'left' : e.pageX - 10})
		.hide()
		.delegate('.clickable','click',function() {
			if ( $(this).hasClass("review") ) {
				d10.router.navigateTo(["my","review",$(this).attr("name")]);
				$(this).closest('.hoverbox').ovlay().close();
				return ;
			}
			var playlist = $(this).attr('name');
			if ( playlist && playlist.length ) {
				d10.my.plmanager.append_song(id,playlist);
			} else {
				d10.playlist.append(song.clone().removeClass("dragging selected"));
			}
			$(this).closest('.hoverbox').ovlay().close();
		});
		elem.appendTo("body").ovlay({"onClose": function() {this.getOverlay().remove()}, "closeOnMouseOut": true });
		return false;
	});

	
	$("#main").delegate("div.song > span.artist","click",function(e) {
		d10.router.navigateTo(["library","artists",$(this).text()]);
	});

	$("#main").delegate("div.song > span.album","click",function(e) {
		var album = $(this).text();
		if ( album.length ) {
			d10.router.navigateTo(["library","albums",album]);
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
	$('body').data('audioFade',15);
	$('body').data('cache_ttl',300000); // msecs

	
	
	$("footer a.logout").click(function() {
		$("footer .loggedin").hide();
		$("footer .loggingOut").removeClass("hidden");
		d10.bghttp.get({
			url: site_url+"/welcome/goodbye",
			success: function() {
				window.location.reload(true);
			}
		});
		return false;
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


})(jQuery);
