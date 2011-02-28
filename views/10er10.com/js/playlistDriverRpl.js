(function($){



d10.playlistDrivers = d10.playlistDrivers || {};
d10.playlistDrivers.rpl = function(options) {
	d10.playlistDrivers.default.call(this,options);
	
	var doc = null;
	var getDoc = function() {
		return doc;
	};
	var setDoc = function(d) {
		doc = d;
	};

	this.listModified = function(e) {
		var drv = d10.playlist.loadDriver ("default",{}, {}, 
			function() {}
		);
		debug("playlistDriverRpl:listModified setting default driver");
		d10.playlist.setDriver(drv);
	};
	
	var record = this.record = function() {
		var options = {
			url: site_url+"/api/current_playlist",
			dataType: "json",
			data: {
				rpl: getDoc()._id,
				type: "rpl"
			}
		};
		d10.bghttp.put(options);
	};
	
	this.load = function(options,cb) {
		if ( !options.rpl ) {
			return cb();
		}
		
		d10.bghttp.get(
			{
				url: site_url+"/api/plm/"+options.rpl,
				dataType: "json",
				success: function(resp) {
					debug(resp);
					setDoc(resp.data);
					var html = "";
					$.each(resp.data.songs,function(k,v) {
						html+=d10.song_template(v);
					});
					if ( html.length )	html = $(html);
					cb(null,html);
					d10.playlist.title(resp.data.name);
				},
				error: function(e) {
					cb(e);
				}
			}
		);
	};
	
};


})(jQuery);