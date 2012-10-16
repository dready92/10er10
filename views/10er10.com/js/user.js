define(["js/d10.rest", "js/d10.events"],function(rest, pubsub) {

	function user () {
		var infos = null;
        
        var orderPlaylists = function(playlists) {
          return playlists.sort(function(p1,p2) {
            return p1.name > p2.name;
          });
        };

		pubsub.topic('user.infos').subscribe(function(data) { 
			debug(data);
			infos = data;
			infos.playlists = orderPlaylists(infos.playlists);	
			
		});
		pubsub.topic('rplAppendSuccess').subscribe(function(data) {
			infos.playlists = jQuery.map(infos.playlists, function(n, i){
				if ( n._id == data.playlist._id )	return data.playlist;
				else								return n;
			});
		});
		
		pubsub.topic('rplCreationSuccess').subscribe(function(data) {
			var newlist = [] ;
			var set = false;
			for ( var index in infos.playlists ) {
				if ( infos.playlists[index].name > data.playlist.name && !set ) {
					newlist[ newlist.length ] = data.playlist;
					set=true;
				}
				newlist[ newlist.length ] = infos.playlists[index];
			}
			if ( !set ) {
				newlist[ newlist.length ] = data.playlist;
			}
			infos.playlists = newlist;
		});

		pubsub.topic('rplRenameSuccess').subscribe(function(playlist) {
			for ( var index in infos.playlists ) {
				if ( infos.playlists[index]._id == playlist._id ) {
					infos.playlists[index].name = playlist.name;
					break;
				}
			}
		});

		pubsub.topic('rplDropSuccess').subscribe(function(playlist) {
			var newlist = [] ;
			for ( var index in infos.playlists ) {
				if ( infos.playlists[index]._id != playlist._id) {
					newlist[ newlist.length ] = infos.playlists[index];
				}
			}
			infos.playlists = newlist;
		});

	
		var refresh_infos = this.refresh_infos = function (then) {
			rest.user.infos(
				{
					load: function(err,resp) {
						if (!err) {
							pubsub.topic("user.infos").publish(resp);
                            if (then) {then();}
						}
					}
				}
			);
		}
		
		this.got_infos = function () {
			if ( infos == null )	return false;
			return true;
		}

		this.get_volume = function() {
          var default_volume = 0.5;
          if ( infos == null || !infos.preferences  )   return default_volume;
          if ( ! "volume" in infos.preferences )        return default_volume;
          var volume = parseFloat(infos.preferences.volume);
          if ( isNaN(volume) || volume < 0 || volume > 1 ) {
            return default_volume;
          }
          return volume;
        };
		
		this.get_preferences = function () {
			if ( infos == null || !infos.preferences  )	return false;
			return infos.preferences;
		}
		
		this.set_preference = function(name, value) {
			if ( name == "hiddenExtendedInfos" ) {
				value = value ? "true" : "false";
				rest.user.setPreference("hiddenExtendedInfos",value, {
					load: function(err,resp) {
						if ( err ) return ;
						$.proxy(this.refresh_infos,this);
					}
				});
			} else if ( name == "hiddenReviewHelper" ) {
				value = value ? "true" : "false";
				rest.user.setPreference("hiddenReviewHelper",value, {
					load: function(err,resp) {
						if ( err ) return ;
						$.proxy(this.refresh_infos,this);
					}
				});
			} else if ( name == "audioFade" ) {
                value = parseInt(value,10);
                if ( isNaN(value) ) {
					return false;
                }
                rest.user.setPreference("audioFade",value, {
                    load: function(err,resp) {
                        if ( err ) return ;
                        refresh_infos();
                    }
                });
            }
		};
		
		this.get_playlists = function () {
			if ( infos == null || ! infos.playlists )	return [] ;
			return infos.playlists;
		}
		this.playlist_exists = function (name) {
			var pl = this.get_playlists();
			for ( var index in pl ) {
				if ( pl[index].name == name ) {
					return true;
				}
			}
			return false;
		}
		
		this.getPlaylistId = function(name) {
          var pl = this.get_playlists();
            for ( var index in pl ) {
                if ( pl[index].name == name ) {
                    return pl[index]._id;
                }
            }
            return false;
        };
		
		this.get_invites_count = function() {
			if ( infos == null )  return 0;
			if ( !infos.user ) return 0;
			if ( !infos.user.invites )  return 0;
			return parseInt(infos.user.invites);
		}
	
		this.id = function() {
			if ( infos == null )  return 0;
			return infos.user._id;
		};
	
		this.is_superman = function() {
			if ( infos == null )  return 0;
			return infos.user.superman;
		};
		
		this.getLikes = function() {
			var back = [];
			if ( infos == null )  return back;
			if ( "preferences" in infos && "likes" in infos.preferences ) {
				for (var i in infos.preferences.likes) {
					back.push(i);
				}
			}
			return back;
		};
		
	}
	return new user();
});
