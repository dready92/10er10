(function($){



d10.playlistDrivers = d10.playlistDrivers || {};
d10.playlistDrivers.rpl = function(options) {
	d10.playlistDrivers.default.call(this,options);
	

	this.listModified = function(e) {
		var drv = this.playlist.loadDriver ("default",{}, {}, 
			function() {
			}
		);
		this.playlist.setDriver(drv);
	};
	
	
	
};


})(jQuery);