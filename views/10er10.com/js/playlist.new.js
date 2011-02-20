
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
	 * 	volume(vol): returns / set the volume that the UI got,
	 * 	seek(secs): immadiately set playback current time to secs
	 * 	getTrackParameters(song): returns the parameters needed to instanciate a track object, as an array
	 * 	append(songs): append the song(s) at the end of the playlist
	 * 
	 */
	
	d10.fn.playlistProto = function(d, ui, options) {
		
		var settings= $.extend({
			currentClass: "active"
		}, options);
		
		var list = $("#playlist",ui);
		var driver = null;
		var songId = this.songId = function(song) {
			var songs = list.children(".song[name="+song.attr("name")+"]");
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
// 			var url = function (id) { return "/audio/"+id.substr(2,1)+"/"+id+".ogg"; } ;
			var url = function (id) { return "http://10er10.com/audio/"+id.substr(2,1)+"/"+id+".ogg"; } ;
			return {"audio/ogg": url(song.attr('name'))};
		};
		var getTrackParameters = this.getTrackParameters = function(song) {
			return [
				songId(song),
				getUrl(song),
				song.attr("duration"),
				{}
			];
		};

		var playlistAppendPost = function() {
			if ( ui.find(".emptyPlaylist").is(":visible") ) {
				ui.find(".emptyPlaylist").hide();
			}
			// 			if ( p.isRpl() ) {
			// 				p.setPlaylistName(p.noname);
			// 			}
			$(document).trigger('playlistUpdate', { 'action': 'copy' } );
		};
		
		
		var append = this.append = function (item, after) {
			if ( !driver.writable({target: null,dragging: item}) ) {
				return false;
			}
			var index = -1;
			if ( after ) { index = after.prevAll().length; }
			if ( index >= 0 && ui.children().eq(index).length ) {
				item.insertBefore(list.children().get(index));
			} else {
				item.appendTo(list);
			}
			//     debug("checking empty thing");
			playlistAppendPost ();
		};
		
		
		
		var controls = {
			volumeBar: new volumebar( ui.find('div[name=volume]').eq(0),1),
			progressBar: new progressbar( ui.find('div[name=progression]') ),
			setPlay: function(play) {
				// change the "play" control to play (true) or pause (false)
				if ( play ) {
					$('img[name=play]',controls).hide();
					$('img[name=pause]',controls).show();
				} else {
					$('img[name=play]',controls).show();
					$('img[name=pause]',controls).hide();
				}
			},
			getVolume: function() {
				return controls.volumeBar.getCurrent();
				// get the volume bet 0 and 1 the volumebar currently points to
			}
		};
		var volumeUpdateTimeout = null;
		var volume = this.volume = function(vol,fromPrefs) {
			if ( arguments.length ) {
				controls.volumeBar.adjustBar(vol);
				debug ("playlist : should adjust volume to "+vol);
				$('body').data('volume',vol);
// 				audio.volume();
				if ( fromPrefs ) { return ; }
				if ( volumeUpdateTimeout ) {
					clearTimeout(volumeUpdateTimeout);
				}
				volumeUpdateTimeout = setTimeout(function() {
					d10.bghttp.post({
						"url": site_url+"/api/volume",
						"data": { "volume": $('body').data('volume') }
					});
					volumeUpdateTimeout = null;
				},10000);
				return driver.volume(vol);
			}
			var prefs= d10.user.get_preferences();
			return $('body').data('volume');
		};
		if ( d10.user.get_preferences().volume ) {
			volume(d10.user.get_preferences().volume,true);
		} else {
			volume(0.5,true);
		}
		
		var seek = this.seek = function(secs) {
			driver.seek(secs);
		};
		
		var setDriver = this.setDriver = function(newDriver) {
			if ( driver ) {
				driver.unbindAll();
			}
			driver = newDriver;
			newDriver.bind("currentSongChanged",function(e) {
				controls.setPlay(driver.current());
				list.children("."+settings.currentClass).removeClass(settings.currentClass);
				songWidget(e.current).addClass(settings.currentClass);
				$(document).trigger("playlsit:currentSongChanged",{current: current()});
				controls.progressBar.setMax( driver.current().duration );
			});
			newDriver.bind("ended",function(e) {
				controls.setPlay(driver.current());
				list.children("."+settings.currentClass).removeClass(settings.currentClass);
// 				songWidget(e.current).addClass(currentClass);
				$(document).trigger("playlist:ended",{current: current()});
			});
			newDriver.bind("currentLoadProgress",function(e) {
				controls.progressBar.setNetLoadBar(driver.currentLoadProgress());
				
			});
			newDriver.bind("currentTimeUpdate",function(e) {
				controls.progressBar.setBar(e.currentTime);
				var d = new Date(1970,1,1,0,0,e.currentTime);
				ui.find('span[name=secs]').html(d.getMinutes()+':'+d.getSeconds());
				
			});
		};
		
		setDriver(d);
		
		
// 		debug("ui",ui,"list",list);
		d10.dnd.dropTarget (ui,list,{
			"moveDrop": function (source,target, infos) {
				if ( infos.wantedNode ) {  
					infos.wantedNode.after(source);
				} else {
					list.prepend(source);
				}
				// 				if ( p.isRpl() ) { p.setPlaylistName(p.noname); }
				$(document).trigger('playlistUpdate', { 'action': "move" } );
				return true;
			},
			"copyDrop": function(source, target,infos) {
				var item = source.clone().show().css({'display':'',"opacity": 1}).removeClass('current dragging selected');
				if  ( infos.wantedNode  ) {
					infos.wantedNode.after(item);
				} else {
					list.prepend(item);  
				}
				playlistAppendPost();
				return true;
			},
			"dropAllowed": function(e) {return driver.writable(e);}
		});
		
		list.delegate("div.song","dragstart",
			function(e) {
				var dt = e.originalEvent.dataTransfer;
				$(this).toggleClass("selected",true);
				dt.setData('text/plain','playlist');
				dt.setDragImage( $('#songitem img')[0], 0, 0);
				$(this).css('opacity',0.5);
				d10.dnd.setDragItem(list.find('.song.selected'));
			}
		)
		// 			d10.dnd.onDragDefault)
		.delegate("div.song","dragend",d10.dnd.removeDragItem)
		.delegate("div.song",'click', function (e) {
			$(this).toggleClass("selected");
		})
		.delegate("div.song",'dblclick', function (e) {
			// 	// prevent click / dblclick mess
			if ( $(this).data("removing") ) {	return; };
			driver.play.apply(driver, getTrackParameters($(this)));
			if ( !$('span.remove',$(this)).hasClass('hidden') )   $('span.remove',$(this)).addClass('hidden');
		})
		.delegate("div.song",'mouseenter',function() {
			if ( !$(this).hasClass('current') )                   $('span.remove',$(this)).removeClass('hidden');
		})
		.delegate("div.song",'mouseleave',function() {
			if ( !$('span.remove',$(this)).hasClass('hidden') )   $('span.remove',$(this)).addClass('hidden');
		})
		.delegate("div.song span.remove",'click',function() {
			$(this).closest("div.song").data("removing",true).slideUp(100,function() 
				{
					$(this).remove();
					if ( !list.children("div.song").length && ui.find(".emptyPlaylist").not(":visible") ) {
						ui.find(".emptyPlaylist").show();
					}
				}
			);
// 			if ( p.isRpl() ) {		  p.setPlaylistName(p.noname); }
			$(document).trigger('playlistUpdate', { 'action': 'remove' } );
		});
		
	};
	
	
	
	
	
	
	
	
	function progressbar( widget_arg ) {
		
		var ui = widget_arg;
		var pmax = 0;  // x secs = y pixels
		var punit = 0; // 1 secs = punit pixels
		var current = 0;
		
		var netload_pmax = 0;  // x secs = y pixels
		var netload_punit = 0; // 1 secs = punit pixels
		
		ui.css({ textAlign: 'left', position: 'relative', overflow: 'hidden' });
		$('div.netload',ui).css({ position: 'absolute', width: 0, height: '100%', overflow: 'hidden' });
		$('div.timer',ui).css({ position: 'absolute', width: 0, height: '100%', overflow: 'hidden' });
		
		ui.click(function(e) {
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
// 			debug("setBar:",ui,data,punit,punit*data);
			$('div.timer',ui).css({
				width: Math.floor(punit*data)
			});
		}
		
		
		this.setNetloadMax = function (num) {
			netload_pmax=parseInt(num);
			netload_punit=ui.width() / netload_pmax;
		}
		this.setNetloadMax(100); // percentile
		
		this.setNetloadBar = function(data) {
// 			this.setNetloadMax(data.total);
			//     debug("loaded: ",data.loaded," total: ",data.total); 
			$('div.netload',ui).css({
				width: Math.floor(netload_punit*data)
			});
		}
	}
	
	
	function volumebar( widget_arg, maxi ) { 
		
		var ui = widget_arg;
		var pmax = 0; 
		var punit = 0;
		var current = 0;
		ui.css({ textAlign: 'left', position: 'relative', overflow: 'hidden' });
		$('div',ui).css({ position: 'absolute', width: 0, height: '100%', overflow: 'hidden' });
		ui.click(function(e) {
			var offset = ui.offset();
			var pix = e.pageX-offset.left;
			var volume = $.sprintf('%.2f',pix*punit) ;
			if ( volume > 1 )
				volume = 1;
			else if ( volume < 0 )
				volume = 0;
			d10.playlist.volume(volume);
// 			$('div',ui).css( 'width', pix);
		});
		this.setMax = function(num) {
			pmax=num;
			punit= pmax / ui.width();
		}
		this.setMax(maxi);
		this.adjustBar = function (vol) {
			if ( vol > pmax ) return ;
			$('div',ui).css('width',ui.width() / pmax  * vol);
		}
		this.getCurrent = function() {
			return pmax* 0.1 * $('div',ui).width();
		};
	}
	
	
	
	
// 	d10.fn.playlist = playlist;
// 	delete playlist;
	
	
	
// 	d10.playlistDrivers = d10.playlistDrivers || {};
// 	d10.playlistDrivers.default = function(playlist, ui, options) {
// 		var settings = {};
// 		$.extend(settings,options);
		
		
		
		
		
		
// 	};
	
	
	
	
})(jQuery);