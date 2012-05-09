define(["js/playlistDriverDefault","js/playlist", "js/d10.rest", "js/d10.templates", "js/d10.events"], 
	   function(playlistDriverDefault, playlist, rest, tpl, pubsub) {




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
	var subscribedEvents = [];
	this.enable = function() {
		if ( doc && doc.name ) {
			playlist.title(doc.name);
		} else {
			debug("GRAVE: doc ou doc.name n'existe pas",doc);
		}
		for ( var e in this.trackEvents ) {
			(function(e) {
				var callback = function() { this.trackEvents[e].apply(this,arguments); },
				topic = "on"+e;
				subscribedEvents.push( {topic: topic, callback: callback } );
				debug("subscribing to topic ",topic);
				pubsub.topic(topic).subscribe(callback);
			})(e);
		}
	};
	
	var disable = this.disable = function() {
		var handle;
		while ( handle = subscribedEvents.pop() ) {
			pubsub.topic(handle.topic).unsubscribe(handle.callback);
		};
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
