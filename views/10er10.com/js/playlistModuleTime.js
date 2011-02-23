(function($){


var instance = null;
var getInstance = function(container) {
	if ( instance )	return instance;
	return createInstance(container);
}
var createInstance = function(container) {
	var binder = new d10.fn.eventsBinder();
// 	debug(binder);
	binder.addBindings(
		{
			"playlist:currentSongChanged": function() {
				//var s = d10.playlist.current();
				var secs = d10.playlist.driver().current().duration;
				bar.setMax( secs );
				var total_secs = parseInt(secs);
				var d = new Date(1970,1,1,0,0,total_secs);
				total.html(d.getMinutes()+':'+d.getSeconds());
				bar.setNetloadBar(d10.playlist.driver().currentLoadProgress());
			},
			"playlist:ended": function() {
				bar.setBar(0);
				bar.setNetloadBar(0);
				total.empty();
				current.empty();
			},
			"playlist:currentTimeUpdate": function(foo,e) {
				bar.setBar(e.currentTime);
				var d = new Date(1970,1,1,0,0,e.currentTime);
				current.html(d.getMinutes()+':'+d.getSeconds());
				
			},
			"playlist:currentLoadProgress": function(e) {
				bar.setNetloadBar(d10.playlist.driver().currentLoadProgress());
			}
		}
		   );
	var module = {
		name: "time",
		enable: function() {binder.bind();return this;},
		disable: function(){binder.unbind();return this;},
		enabled: function() {return binder.enabled}
	};
// 	return module;
// 	binder.addBindings(module.events);

	var ui, bar, total, current ;
	ui = container.find('div[name=progression]');
	bar = new progressbar();
	total = container.find("div[name=progressbar] span[name=total]");
	current = container.find('span[name=secs]');
	debug("documentReady",ui,bar,total,current);
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

		ui.click(function(e) {
			if ( !binder.enabled )	return ;
			var offset = ui.offset();
			var pix = e.pageX-offset.left;
			d10.playlist.seek(Math.floor(pix/punit));
			debug(pix+' = '+pix/punit+' secs');
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



d10.fn.playlistModules = d10.fn.playlistModules || {};
d10.fn.playlistModules.time = function(container)  {
        return getInstance(container);
};

})(jQuery);
