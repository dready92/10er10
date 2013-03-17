define(["js/domReady","js/d10.playlistModule", "js/playlist"], function(foo, playlistModule, playlist) {

  var seconds2display = function(secs) {
    var d = new Date(1970,1,1,0,0,secs),
	   m = d.getMinutes(), s = d.getSeconds();
	m = m < 10 ? "0"+m : m;
	s = s < 10 ? "0"+s : s;
    return m+':'+s;
  };
var createInstance = function(container) {
// 	debug(binder);
	var module = new playlistModule("time",
		{
			"playlist:currentSongChanged": function() {
				var secs = playlist.driver().current().duration;
				bar.setMax( secs );
				var total_secs = parseInt(secs);
				var d = new Date(1970,1,1,0,0,total_secs);
				total.html(seconds2display(total_secs));
				bar.setNetloadBar(playlist.driver().currentLoadProgress());
			},
			"playlist:ended": function() {
				bar.setBar(0);
				bar.setNetloadBar(0);
				total.empty();
				current.empty();
			},
			"playlist:currentTimeUpdate": function(e) {
              debug("timeUpdate ! ");
				bar.setBar(e.currentTime);
// 				var d = new Date(1970,1,1,0,0,e.currentTime);
				current.html(seconds2display(e.currentTime));
				
			},
			"playlist:currentLoadProgress": function(e) {
				bar.setNetloadBar(playlist.driver().currentLoadProgress());
			}
		},
		{}
	);
// 	return module;
// 	binder.addBindings(module.events);

	var ui, bar, total, current ;
	ui = container.find("div[name=progression]");
	bar = new progressbar();
	total = container.find(".totalTime");
	current = container.find(".currentTimeContainer");
// 	debug("documentReady",ui,bar,total,current);
// 	if ( module.enabled ) {
// 		binder.bind();d
// 	}

	function progressbar( ) {

		//var ui = widget_arg;
		var pmax = 0;  // x secs = y pixels
		var punit = 0; // 1 secs = punit pixels
		var current = 0;

		var netload_pmax = 0;  // x secs = y pixels
		var netload_punit = 0; // 1 secs = punit pixels
		ui.css({ textAlign: 'left', position: 'relative', overflow: 'hidden' });
		var resized = $('div.timer',ui);
		$('div.netload',ui).css({ position: 'absolute', width: 0, height: '100%', overflow: 'hidden' });
		$('div.timer',ui).css({ position: 'absolute', width: 0, height: '100%', overflow: 'hidden' });
        
        var timeOverlay = null;
        var timeOverlaySize = {width:0, height: 0};
        var timeOverlayElem = null;
        var onMouseMove = function(e) {
          if (!punit) { return ;}
          var offset = ui.offset();
          var pix = e.pageX-offset.left;
          var secs = Math.floor(pix/punit);
          if ( !timeOverlay ) {
            timeOverlay = $("<div class=\"yellowOverlay currentTimeContainer upArrow\">"+seconds2display(secs)+"</div>")
                            .data("seconds",secs)
                            .css("visibility","hidden")
                            .prependTo($("#player"));
            timeOverlaySize =  {width: timeOverlay.outerWidth() / 2 - 1, height: timeOverlay.outerHeight() +10};
            timeOverlay.css("visibility","visible");
            timeOverlayElem = timeOverlay.get(0);
          }

          if ( timeOverlay.data("seconds") != secs ) {
            timeOverlay.html(seconds2display(secs));
          }
          timeOverlay.css({
            left: (e.pageX - timeOverlaySize.width) +"px",
            top: (ui.outerHeight() + ui.offset().top+10) +"px"
          });
        };
        
		ui.click(function(e) {
			if ( !module.isEnabled() )	return ;
			var offset = ui.offset();
			var pix = e.pageX-offset.left;
			playlist.seek(Math.floor(pix/punit));
			debug(pix+' = '+pix/punit+' secs');
		})
        .mousemove(onMouseMove)
        .mouseenter(onMouseMove)
        .mouseleave(function() {
          if ( timeOverlay ) {
            timeOverlay.remove();
            timeOverlay = null;
          }
        });

		this.getMax = function () { return pmax; }

		// in seconds
		this.setMax = function(num) {
			debug("setMax",ui,num,ui.width());
			pmax=parseInt(num);
			punit=ui.width() / pmax;
		}

		this.setBar = function(data) {
//                         debug("setBar:",ui,data,ui.width(),punit,punit*data);
//                         $('div.timer',ui).stop(true,true).animate({width: Math.floor(punit*data)},1000);
			resized.css({width: Math.floor(punit*data)});
		}


		this.setNetloadMax = function (num) {
			netload_pmax=parseInt(num);
			netload_punit=ui.width() / netload_pmax;
		}
		this.setNetloadMax(100); // percentile

		this.setNetloadBar = function(data) {
//                      this.setNetloadMax(data.total);
			//     debug("loaded: ",data.loaded," total: ",data.total); 
			$('div.netload',ui).css({
				width: Math.floor(netload_punit*data)
			});
		}
	}
	return module;
};


var mod = createInstance($("#player"));

playlist.modules[mod.name] = mod;
return mod;

});
