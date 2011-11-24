define(["js/domReady","js/d10.playlistModule", "js/playlist.new"], function(foo, playlistModule, playlist) {


	var module = new playlistModule("volume",{
			"playlist:volumeChanged": function() {
				debug("volume playlist event");
				bar.adjustBar($('body').data('volume'));
			}},
			{}
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
			var volume = $.sprintf('%.2f',pix*punit) ;
			if ( volume > 1 )
				volume = 1;
			else if ( volume < 0 )
				volume = 0;
			playlist.volume(volume);
		});
	
	
		this.setMax(maxi);
	};
	
	var ui = $("#controls div[name=volume]");
	var bar = new volumebar(ui,1);
	bar.adjustBar($('body').data('volume') ? $('body').data('volume') : 0.5);
	playlist.modules[module.name] = module;

	return module;
	
});




