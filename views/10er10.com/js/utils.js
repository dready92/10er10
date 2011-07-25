(function($){

var step2 = function () {
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
		
		
// 		for ( var index in playlists ) {
// 			$('div[name=playlists]',elem).append(d10.mustacheView('hoverbox.playlistrow',playlists[index]));
// 		}
		var height = parseInt ( elem.css('height').replace(/px$/,'') );
		var top = e.pageY - 10;
		if ( top + height  > $(window).height() && $(window).height() + 10 - height > 0 ) {
			top = $(window).height() - height -10;
		}
		elem.css ( {'top': top,'left' : e.pageX - 10})
		.hide()
		.delegate('.clickable','click',function() {
			if ( $(this).hasClass("review") ) {
// 				window.location.hash = "#/my/review/"+encodeURIComponent( $(this).attr("name") );
				d10.router.navigateTo(["my","review",$(this).attr("name")]);
				$(this).closest('.hoverbox').ovlay().close();
				return ;
			}
			var playlist = $(this).attr('name');
			if ( playlist && playlist.length ) {
//				$(document).trigger('rplAppendRequest', { 'song': id, 'playlist': $(this).attr('name') } );
				d10.my.plmanager.append_song(id,playlist);
			} else {
				d10.playlist.append(song.clone().removeClass("dragging selected"));
			}
			$(this).closest('.hoverbox').ovlay().close();
		});
	//     $('body').append(elem.fadeIn('fast'));
		elem.appendTo("body").ovlay({"onClose": function() {this.getOverlay().remove()}, "closeOnMouseOut": true });
		return false;
  });

	
	$("#main").delegate("div.song > span.artist","click",function(e) {
	// 		var artist = encodeURIComponent($(this).html());
		d10.router.navigateTo(["library","artists",$(this).text()]);
// 		location.hash = "#/library/artists/"+encodeURIComponent($(this).text());
	});

	$("#main").delegate("div.song > span.album","click",function(e) {
	// 		var artist = encodeURIComponent($(this).html());
		var album = $(this).text();
		if ( album.length ) {
			d10.router.navigateTo(["library","albums",album]);
// 			location.hash = "#/library/albums/"+album;
		}
	});

	$("#main").delegate("div.song > span.album","mouseenter",function(e) {
	// 		var artist = encodeURIComponent($(this).html());
		var album = encodeURIComponent($(this).text());
		if ( album.length ) {
			$(this).addClass("link");
		}
	});

	$("#main").delegate("div.song > span.album","mouseleave",function(e) {
		$(this).removeClass("link");
	});
	
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
			d10.bghttp.get ({
				'url': site_url+'/api/htmlElements', 
				'dataType':'json', 
				'callback': function(data) {
					if ( data.status !=  'success' || data.data.status != 'success' ) { return cb("server error"); }
					for ( var index in data.data.data ) { d10.localcache.setTemplate(index,data.data.data[index]); }
					return cb();
				} 
			});
		},
		//
		// récupération des infos utilisateur
		//
		userInfos: function(cb)  {
			$(document).one("user.infos",cb);
// 			setTimeout(function() {
			d10.user.refresh_infos();
// 			},1000)
			;
		}
	},
	function(errs,resps) {
		launchMeBaby();
	});
	
	when.onResponse(function() {
		debug("Complete: ",when.complete(),"on",when.total());
		loadCount.html(when.complete());
	});
	
	loadCount.html(when.complete());
	loadTotal.html(when.total());
	
	//
	// attente du chargement des donnees initiales
	//
	/*
	var initialLoadingInterval = window.setInterval( function () {
		var allgood = true;

		if ( !d10.localcache.getTemplate('song_template') ) {
			debug("cache templates");
			allgood = false;
		}
		if ( !d10.user.got_infos() ) {
			debug("user infos");
			allgood = false;
		}
		if ( allgood ) {
		launchMeBaby();
		} else {
		$('#initialLoading').append('.');
		}

	},1000);
*/

	var visibleBaby = function () {
// 			console.profile("visible");
// 		var driver = new d10.playlistDrivers.default({});
		
// 		debug("fn",d10.fn);
		
		d10.playlist = new d10.fn.playlistProto( $("aside"),{});
// 		var driver = new d10.playlistDrivers.default({});
// 		d10.playlist.setDriver(driver);
		d10.playlist.bootstrap();
		
		$(document).trigger("bootstrap:playlist");
		
		$.each(d10.playlist.modules,function(k,mod) {
			mod.enable();
		});
		
		/*
		if ( window.location.hash.length ) {
		d10.globalMenu.route( window.location.hash.replace(/^#/,"") );
		}
*/
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
		setTimeout(function() {
			d10.bgtask.init();
		},7000);
		
		pos = $("#search > div").eq(0).position();
		height = $("#search > div").eq(0).height();
		$("#search > div").eq(1).css({"top": pos.top + height, "left": pos.left,"min-width": $("#search input").width() });
		
		$("#side").css("display","");
	};

	var launchMeBaby = function() {
// 		clearInterval(initialLoadingInterval);

		//
		// preload la vue "playlists"
		//
		d10.my.plmanager.init_topic_plm ();
		
		// language selector
		$("footer .langChooser select").bind("change",function() {
			debug("langchooser changed");
			var lng = $(this).val();
			location.search = "?lang="+lng;
		});
		var myRouter = {
			_containers: {
				main: {tab: $("#container > nav"), container: $("#main"), select: function(name) { return $("#"+name) }, lastActive: null, currentActive: null},
				library: {tab: $("#library > nav > ul"), container: $("#library"), select: function(name) {return this.container.children("div[name="+name+"]"); }, lastActive: null, currentActive: null},
				my: {tab: $("#my > nav > ul"), container: $("#my"), select: function(name) {return this.container.children("div[name="+name+"]"); }, lastActive: null, currentActive: null},
				plm: {tab: $("#my .plm .plm-list-container .plm-list"), container: $("#my .plm-content-container"), select: function(name) {return this.container.children("div[name="+name+"]"); }, lastActive: null, currentActive: null}
			},
			routes: {
				"welcome": "welcome",
				"library": "library",
 				"library/:topic": "library",
 				"library/:topic/:category": "library",
 				"my": "my",
 				"my/plm": "plm",
				"my/:topic": "my",
 				"my/plm/:id": "plm",
 				"my/:topic/:id": "my",
				"results": "results",
 				"results/:search": "results",
				"upload": "upload"
			},
			welcome: function() { this._activate("main","welcome",this.switchMainContainer); },
 			library: function(topic,category) {
// 				debug("library starting");
				if ( !topic ) {
// 					debug("no topic");
					if ( this._containers["library"].currentActive ) {
// 						debug("already loaded content");
						this._activate("main","library",this.switchMainContainer);
						return ;
					} else {
// 						debug("initial loading");
						topic = "hits";
					}
				}
				
// 				debug(this._containers["library"].currentActive, topic);

				d10.library.display( decodeURIComponent(topic), category ? decodeURIComponent(category) : null );

				this._activate("main","library",this.switchMainContainer)._activate("library",topic);
			},
			results: function(search) {
				d10.results.display(decodeURIComponent(search));
				this._activate("main","results",this.switchMainContainer); 
			},
 			my: function(topic,id) { 
				if ( !topic ) {
					if ( this._containers["my"].currentActive ) {
						this._activate("main","my",this.switchMainContainer);
						return ;
					} else {
						topic = "songs";
					}
				}

				d10.my.display(topic,id);
				this._activate("main","my",this.switchMainContainer); 
				if ( topic ) { this._activate("my",topic); }
			},
			plm: function(id) {
				if ( id && this._containers["plm"].currentActive != name ) { d10.my.plmanager.display(id); }
				this._activate("main","my",this.switchMainContainer)._activate("my","plm");
				if ( id && this._containers["plm"].currentActive != name ) { this._activate("plm",id); }
				
			},
			upload: function() {
				this._activate("main","upload",this.switchMainContainer); 
			},
			switchContainer: function(from,to,tab,name) {
				if ( from ) from.hide().removeClass("active");
				if ( !to.hasClass("active") ) {
					to.fadeIn("fast").addClass("active");
					this.trigger("container:"+tab+"/"+name);
				}
			},
			_activate: function(tab, name, switchCallback) {
				switchCallback = switchCallback || this.switchContainer;
				if ( !this._containers[tab] ) {
					debug("router._activate: ",tab,"unknown");
					return this;
				}
				var currentActiveName = this.getActive(tab), currentActive = null, futureActive = this._containers[tab].select(name);
				
				if (  currentActiveName == name ) {
					return this;
				}
				if ( currentActiveName ) {
					currentActive = this._containers[tab].select(currentActiveName);
				}
				switchCallback.call(this,currentActive,futureActive,tab,name);
				this.switchTab(tab,name);
				this._containers[tab].lastActive = currentActiveName;
				this._containers[tab].currentActive = name;
				return this;
			},
			switchTab: function(tab,name) {
// 				debug("tabs ? ",this._containers[tab].tab.children());
				var currentActive = this._containers[tab].tab.find(".active"), current = null;
				if ( currentActive.length ) {
					current = currentActive.attr("action");
					if ( current == name ) {
						debug("Tab name ",name,"is already active");
						return ;
					}
				}
				currentActive.removeClass("active");
				this._containers[tab].tab.find("[action="+name+"]").addClass("active");
				this.trigger("tab:"+tab+"/"+name);
			},
			navigateTo: function(segments) {
// 				debug("navigate to",segments);
				segments = segments || [];
				if ( typeof segments == "string" ) {
					return this.navigate(segments,true);
				}
				segments = $.map(segments,function(v) { return encodeURIComponent(v); });
				var back = this.navigate(segments.join("/"),true);
				return back;
			},
			getActive: function(tab) {
				var active = this._containers[tab].tab.find(".active");
				if ( active.length ) {
					return active.eq(0).attr("action");
				}
				return null;
			},
		};
		if ( $("html").hasClass("csstransitions") ) {
			myRouter.switchMainContainer = function(from,to,tab,name) {
				if ( from ) from.css("display","none").removeClass("active");
				if ( !to.hasClass("active") ) {
					to.show();
					to.addClass("active");
					this.trigger("container:"+tab+"/"+name);
				}
			};
		} else {
			myRouter.switchMainContainer = myRouter.switchContainer
		}

// 		debug(Backbone.Router.extend);
		var router = Backbone.Router.extend.call(Backbone.Router, myRouter);
		d10.router = new router();
// 		Backbone.history = new Backbone.History();
		var startHistory = Backbone.history.start();
		debug("------starting history",startHistory);
		if ( !startHistory ) {
			d10.router.navigateTo(["welcome"]);
		}
		
		myRouter._containers.main.tab.delegate("[action]","click",function() {
			var elem = $(this), action = elem.attr("action");
			if ( ! elem.hasClass("active") ) { d10.router.navigate(action,true); }
		});
		
		
		myRouter._containers.my.tab.delegate("[action]","click",function() {
			var elem = $(this), action = elem.attr("action");
			if ( ! elem.hasClass("active") ) { d10.router.navigate("my/"+action,true); }
		});
		
		myRouter._containers.plm.tab.delegate("[action]","click",function() {
			var elem = $(this), action = elem.attr("action");
			if ( ! elem.hasClass("active") ) { d10.router.navigateTo(["my","plm",action]); }
		});
		
		myRouter._containers.library.tab.delegate("[action]","click",function() {
			var elem = $(this), action = elem.attr("action"), currentCategory = d10.library.getCurrentCategory(action);
			
			if ( ! elem.hasClass("active") ) { 
				if ( currentCategory ) {
					d10.router.navigateTo(["library",action,currentCategory]); 
				} else {
					d10.router.navigateTo(["library",action]); 
				}
				
			}
		});
		
		
		$('#container').css("display","block").animate({"opacity": 1}, 800,visibleBaby);
		$('#initialLoading').html(d10.mustacheView("landing.letsgo"));
		$('#beautyFade').fadeOut(1000);
		
	};
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
