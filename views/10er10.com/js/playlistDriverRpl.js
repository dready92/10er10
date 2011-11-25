define(["js/playlistDriverDefault","js/playlist.new", "js/d10.rest", "js/d10.templates"], 
	   function(playlistDriverDefault, playlist, rest, tpl) {




function playlistDriverRpl (options) {
	playlistDriverDefault.call(this,options);
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
		playlist.loadDriver ("default",{}, {}, function() {playlist.setDriver(this);} );
		debug("playlistDriverRpl:listModified setting default driver");
		
	};
	
	var record = this.record = function() {
		if ( !getDoc() || !getDoc()._id ) {
			return ;
		}
		rest.user.playerList.rpl.store(getDoc()._id,function() {});
	};
	
	this.enable = function() {
		if ( doc && doc.name ) {
			playlist.title(doc.name);
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
		debug("playlistDriverRpl:load options:",options);
		if ( options.rpldoc ) {
			doc = options.rpldoc;
			cb.call(this);
		} else if (options.rpl ) {
			var self = this;
			rest.rpl.get(options.rpl,{
				load: function(err,resp) {
					if ( err ) {
						return cb.call(self,resp);
					}
					setDoc(resp);
					var html = "";
					$.each(resp.songs,function(k,v) {
						if (  v ) {
							html+=tpl.song_template(v);
						}
					});
					if ( html.length )	html = $(html);
					cb.call(self,null,html);
				}
			});
		} else {
			return cb.call(this);
		}
	};
	
};
playlist.registerDriver("rpl",playlistDriverRpl);
return playlistDriverRpl;
});
