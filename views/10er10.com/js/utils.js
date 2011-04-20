(function($){

var step2 = function () {
  //
  // gestion du bouton + a gauche de chaque morceau
  //

	$("#main").delegate('.song .add','click',function  (e) {
		var song = $(this).closest('.song');
		var id=song.attr('name');
		var elem = $(d10.mustacheView('hoverbox.addsong.container'));
		var playlists = d10.user.get_playlists();
		if ( playlists.length ) { $('div[name=playlists]',elem).show(); }
		for ( var index in playlists ) {
			$('div[name=playlists]',elem).append(d10.mustacheView('hoverbox.playlistrow',playlists[index]));
		}
		var height = parseInt ( elem.css('height').replace(/px$/,'') );
		var top = e.pageY - 10;
		if ( top + height  > $(window).height() && $(window).height() + 10 - height > 0 ) {
			top = $(window).height() - height -10;
		}
		elem.css ( {'top': top,'left' : e.pageX - 10})
		.hide()
		.delegate('.clickable','click',function() {
			var playlist = $(this).attr('name');
			if ( playlist && playlist.length ) {
//				$(document).trigger('rplAppendRequest', { 'song': id, 'playlist': $(this).attr('name') } );
				d10.my.plm.append_song(id,playlist);
			} else {
				d10.playlist.append(song.clone().removeClass("dragging selected"));
			}
		$(this).closest('.hoverbox').ovlay().close();
		});
	//     $('body').append(elem.fadeIn('fast'));
		elem.appendTo("body").ovlay({"onClose": function() {this.getOverlay().remove()}, "closeOnMouseOut": true });
		return false;
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



	//
	// récupération des templates HTML
	//
	d10.bghttp.get ({
		'url': site_url+'/api/htmlElements', 
		'dataType':'json', 
		'callback': function(data) {
		if ( data.status !=  'success' || data.data.status != 'success' ) { return false; }
		for ( var index in data.data.data ) { d10.localcache.setTemplate(index,data.data.data[index]); }
		return true;
		} 
	});

	//
	// récupération des infos utilisateur
	//
	d10.user.refresh_infos();


	//
	// attente du chargement des donnees initiales
	//
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
		
		
		if ( window.location.hash.length ) {
		d10.globalMenu.route( window.location.hash.replace(/^#/,"") );
		}

		$('#beautyFade').remove();
		$("#containerWrap").css("position","");

		//
		// reminder click
		//
		$("#reviewReminder").click(function() { window.location.hash = "#/my/review"; });

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
		clearInterval(initialLoadingInterval);

		//
		// preload la vue "playlists"
		//
		d10.my.plmanager.init_topic_plm ();


		
// 		$("#main > div").css("display","block");
		var menuOptions = {
			'menu':$('#container > nav'), 
			'container':$('#main'), 
			'active_class': 'active', 
			'default_active_label': 'welcome' ,
			"rootRouteHandler": true,
			"useRouteAPI": true
		}

		if ( $("html").hasClass("csstransitions") ) {
			var switchLabelTrans = function(label,arg,active) {
				// 				debug("scitchLabelTrans",arguments);
				var prev = active ? this.getContainer(active) : null,
				next = this.getContainer(label);
				if ( prev && prev.hasClass("active") ) {
					// 					debug("in a transition with previous thing");
					debug("transitionend event for previous thing",prev,next);
					prev.removeClass("active");
					$('#main>div').hide();
					next.show();
											setTimeout(function() {
					next.addClass("active");
											},15);
				
					
					$('#container > nav .active').removeClass("active");
					d10.globalMenu.menuitem(label).addClass("active");
					// 					
				} else {
					// 					debug("transition without previous element");
					$('#main>div').hide();
					next.show();
					next.addClass("active");
					$('#container > nav .active').removeClass("active");
					this.menuitem(label).addClass("active");
				}
			};
			$("#welcome").addClass("active");
			menuOptions.displayActivate = switchLabelTrans;
			menuOptions.routeActivate = function(label,segments,settings) {
				switchLabelTrans.call(d10.globalMenu,label,null,d10.globalMenu.current_label());
			};
		}

		d10.globalMenu = new d10.fn.menuManager (menuOptions);
		debug("menumanager ok");
		$('#container').css("display","block").animate({"opacity": 1}, 1000,visibleBaby);
		$('#initialLoading').html("Let's go !");
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
		if ( Modernizr.inputtypes.range ) {
			$("html").addClass("inputtypeRange");
		}
		delete Modernizr;
		$("#browserNotSupported").remove();
		step2();
	}


});


})(jQuery);
