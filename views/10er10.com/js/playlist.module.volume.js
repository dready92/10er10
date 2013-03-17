define(["js/domReady",
       "js/d10.playlistModule", 
       "js/playlist",
       "js/user"
       ], function(foo, playlistModule, playlist, user) {


	var module = new playlistModule("volume",{
			"playlist:volumeChanged": function() {
				debug("volume playlist event");
				bar.adjustBar(user.get_volume());
			}},
			{
				enable: function() {
                  bar.adjustBar(user.get_volume());
				}
			}
	);
	

	function volumebar( widget_arg, maxi ) { 
	
		var ui = widget_arg;
		var pmax = 0; 
		var punit = 0;
		var current = 0;
		this.setMax = function(num) {
			pmax=num;
			punit= pmax / ui.width();
		}
		this.adjustBar = function (vol) {
			if ( vol > pmax ) return ;
			$('div',ui).css('width',ui.width() / pmax  * vol);
		}
		this.getCurrent = function() {
			return pmax* 0.1 * $('div',ui).width();
		};
		ui.css({ textAlign: 'left', position: 'relative', overflow: 'hidden' });
		$('div',ui).css({ position: 'absolute', width: 0, height: '100%', overflow: 'hidden' });
		ui.click(function(e) {
			debug("click on ui");
			if ( !module.isEnabled() )	return ;
			var offset = ui.offset();
			var pix = e.pageX-offset.left;
			var volume = Math.round(pix*punit*100) / 100 ;
			if ( volume > 1 )
				volume = 1;
			else if ( volume < 0 )
				volume = 0;
			playlist.volume(volume);
		});
	
	
		this.setMax(maxi);
	};
	
	var ui = $("#player div[name=volume]");
	var bar = new volumebar(ui,1);
	bar.adjustBar(user.get_volume());
	playlist.modules[module.name] = module;
	return module;
});




