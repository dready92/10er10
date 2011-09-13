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

	this.playlistId = function() {
		if ( !getDoc() || !getDoc()._id ) {
			return false;
		}
		return getDoc()._id;
	};
	
	this.listModified = function(e) {
		d10.playlist.loadDriver ("default",{}, {}, function() {d10.playlist.setDriver(this);} );
		debug("playlistDriverRpl:listModified setting default driver");
		
	};
	
	var record = this.record = function() {
		if ( !getDoc() || !getDoc()._id ) {
			return ;
		}
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
	
	this.enable = function() {
		if ( doc && doc.name ) {
			d10.playlist.title(doc.name);
		} else {
			debug("GRAVE: doc ou doc.name n'existe pas",doc);
		}
	};
	
	/**
	* load driver
	*
	* options.rpl : the rpl id ( plXXXXXX )
	* OR
	* options.rpldoc : the rpl document (assume playlist songs are already in place)
	*/
	this.load = function(options,cb) {
		debug("playlistModuleRpl:load options:",options);
		if ( options.rpldoc ) {
			doc = options.rpldoc;
			cb.call(this);
		} else if (options.rpl ) {
			var self = this;
			d10.bghttp.get(
				{
					url: site_url+"/api/plm/"+options.rpl,
					dataType: "json",
					success: function(resp) {
						if ( !resp.status || resp.status == "error" ) {
							return cb.call(self,resp);
						}
						debug(resp);
						setDoc(resp.data);
						var html = "";
						$.each(resp.data.songs,function(k,v) {
							if (  v ) {
								html+=d10.song_template(v);
							}
						});
						if ( html.length )	html = $(html);
						cb.call(self,null,html);
					},
					error: function(e) {
						cb.call(self,e);
					}
				}
			);
			
		} else {
			return cb.call(this);
		}
	};
	
};


})(jQuery);
