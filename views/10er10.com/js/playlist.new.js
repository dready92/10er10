
(function($){
	
	/*
	 * playlist
	 * 
	 * events : 
	 * 		"playlist:drop": songs have been dropped into the playlist {songs: array of songs (<div class="song">...)}
	 * 		"playlist:currentSongChanged": current playing song changed {previous: <div clas="song">..., current: <div class="song">}
	 * 		"playlist:play": the play button has been pressed
	 * 		"playlist:pause": the pause button has been paused
	 * 		"playlist:empty": the playlist has been cleared
	 * 		"playlist:volume": the volume has been ajusted
	 * 		"playlist:ended": the playlist reached its end
	 * 
	 * constructor :
	 * driver: 
	 * 	should implement following events:
	 * 	- currentSongChanged: the current playing song changed following the playlist workflow (not on user interaction)
	 * 							data: {current: id of the current playing song}}
	 * 	- ended: the playlist reached its end
	 * 	- currentTimeUpdate {track: track element}: the current playing song playback reached a new second
	 * 	- currentLoadProgress {track: track element}: the current playing song loading infos changed
	 * 	should implement the following method:
	 * 	- play(id, url, duration, options): immadiately switch playback to this song
	 * 	- pause(): immediately pause current song
	 * 	- resume(): resume the playback of the current element
	 * 	- resumeOrPlay(infos): resume current playback if it matches infos[0] (id), else launch the playbacl of infos
	 *	- current(): returns the "main" currently playing track
	 *	- playing(): returns the currently playing tracks []
	 * 	- currentLoadProgress(): returns the percentile of loaded date of the current playing song
	 *	- volume(vol): immediately ajust volume of playing song(s)
	 *	- seek(secs): immediately switch playback of currently playing song to secs (float)
	 * 	- load(playlist, {purge: boolean}): tell the driver that we switched to playlist playlist
	 * 										if option purge is true, the driver should also stop all playbacks,
	 * 										destroy all objects and references
	 * 	- writable(songIndex): on a file insertion demand (d'n'd,...) or others, tell if insertion is allowed (should return boolean)
	 * 
	 * public methods:
	 * 	songId(song): give unique identifier of song song in the playlist
	 * 	songWidget(id) returns the div.song id (or an empty jquery object)
	 * 	current: returns the current playing song jquery obj
	 * 	next: return the next song jquery object
	 * 	getUrl(song): return the url object of song
	 * 	volume(): returns the volume that the UI got
	 * 	getTrackParameters(song): returns the parameters needed to instanciate a track object, as an array
	 * 
	 */
	
	var playlist = function(d, ui, options) {
		
		var settings= $.extend({
			currentClass: "active"
		}, options);
		
		var list = $(".list",ui);
		var driver = null;
		var songId = this.songId = function(song) {
			var songs = list.children(".song[name="+song.attr("name")"]");
			var back = 0;
			songs.each(function(i) {
				if ( this === song.get(0) ) {
					back = i;
					return false;
				}
			});
			return back+"-"+song.attr("name");
		};
		
		var songWidget = this.songWidget = function(id) {
			var infos = id.split("-");
			if ( infos.length != 2 ) {
// 				if ( infos.length )	return list.children(".song[name="+infos[0]+"]").eq(0);
				return $();
			}
			var songs = list.children(".song[name="+infos[1]+"]");
			if ( songs.length >= infos[0] )	return songs.eq(infos[0]);
			return $();
		};
		
		var current = this.current = function() {
			return list.children("."+settings.currentClass).eq(0);
		};
		var next = this.next = function() {
			return current.next();
		};
		
		var getUrl = this.getUrl = function(song) {
			var url = function (id) { return "/audio/"+id.substr(2,1)+"/"+id+".ogg"; } ;
			return {"audio/ogg": url(song.attr('name'))};
		};
		var getTrackParameters = this.getTrackParameters = function(song) {
			return [
				ongId(song),
				getUrl(song),
				song.attr("duration"),
				{}
			];
		};
		
		var controls = {
			setPlay: function(play) {
				// change the "play" control to play (true) or pause (false)
			},
			getVolume: function() {
				// get the volume bet 0 and 1 the volumebar currently points to
			}
		};
		
		var volume = this.volume = function() {
			var prefs= d10.user.get_preferences();
			return prefs.volume ? prefs.volume : controls.getVolume();
		};
		
		var setDriver = this.setDriver = function(newDriver) {
			if ( driver ) {
				driver.unbindAll();
			}
			driver = newDriver();
			newDriver.bind("currentSongChanged",function(e) {
				controls.setPlay(driver.current());
				list.children("."+settings.currentClass).removeClass(settings.currentClass);
				songWidget(e.current).addClass(currentClass);
				$(document).trigger("playlsit:currentSongChanged",{current: current()});
			});
			newDriver.bind("ended",function(e) {
				controls.setPlay(driver.current());
				list.children("."+settings.currentClass).removeClass(settings.currentClass);
// 				songWidget(e.current).addClass(currentClass);
				$(document).trigger("playlist:ended",{current: current()});
			});
		};
		
		setDriver(driver);
		
	};
	
	
	
	
	
// 	d10.playlistDrivers = d10.playlistDrivers || {};
// 	d10.playlistDrivers.default = function(playlist, ui, options) {
// 		var settings = {};
// 		$.extend(settings,options);
		
		
		
		
		
		
// 	};
	
	
	
	
})(jQuery);