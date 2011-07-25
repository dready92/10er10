(function($){
	
	/*
	 * playlist
	 * 
	 * events : 
	 * 		"playlist:drop": songs have been dropped into the playlist {songs: array of songs (<div class="song">...)}
	 * 		"playlist:currentSongChanged": current playing song changed {previous: <div clas="song">..., current: <div class="song">}
	 * 		"playlist:paused": the current song has been paused
	 * 		"playlist:resumed": playback of the current song has been resumed
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
	 *
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
	 *	- handleEvent: called when there is an event on <audio> element. "this" is set to the <audio> element, arguments are event arguments.
	 * 	- enable(previous): called when this driver is plugged in to drive the playlist
	 *	- disable(): called when this driver is plugged out from the playlist
	 *	- listModified(): called when the playlist's list of song has been altered (addition, sorting, or removal)
	 * 
	 * public methods:
	 * 	songId(song): give unique identifier of song song in the playlist
	 *  songsId(): return all songs id []
	 * 	songWidget(id) returns the div.song id (or an empty jquery object)
	 * 	current: returns the current playing song jquery obj
	 * 	next: return the next song jquery object
	 * 	all: return all songs 
	 *  allIds: returns an array of all songs name
	 * 	getUrl(song): return the url object of song
	 * 	volume(vol): returns / set the volume that the UI got,
	 * 	seek(secs): immadiately set playback current time to secs
	 *	pause(): immediately stop playback of the current song
	 *	resume(): resume playback of the current song
	 * 	getTrackParameters(song): returns the parameters needed to instanciate a track object, as an array
	 * 	append(songs): append the song(s) at the end of the playlist
	 * 	driver(): returns current playlist driver
	 * 	title(title): set/get the title of the current playlist
	 *	container(): returns the global playlist container
	 * 
	 */
	
	d10.fn.playlistProto = function(ui, options) {
		
		var settings= $.extend({
			currentClass: "current"
		}, options);
		
		var list = $("#playlist",ui);
		var driver = null;
		var modules = this.modules = {};
		
		// the timeout id for operation of recording current playlist driver state to the database
		var driverRecordTimeout = null;
		
		var container = this.container = function() {
			return ui;
		};
		
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
		
		var songsIds = this.songsId = function () {
			return list.children(".song").map(function() {      return $(this).attr('name');    }   ).get()
		}
		
		var songWidget = this.songWidget = function(identifier) {
			debug("playlist:songWidget, id: ",identifier);
			var id;
			if ( typeof identifier == "object" && identifier.id ) id = identifier.id;
			else	id = identifier;
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
			return current().next();
		};

		var all = this.all = function() {
			return list.children(".song");
		};
		var allIds = this.allIds = function() {
			return list.children('.song').map(function() {      return $(this).attr('name');    }   ).get()
		};
		var title = this.title = function(t) {
			if ( !arguments.length ) {
				return $("#side > .playlisttitle > span").html();
			}
			$("#side > .playlisttitle > span").text(t);
		};
		
		var getUrl = this.getUrl = function(song) {
// 			var url = function (id) { return "/audio/"+id.substr(2,1)+"/"+id+".ogg"; } ;
			var url = function (id) { return d10.config.audio_root+id.substr(2,1)+"/"+id+".ogg"; } ;
			return {"audio/ogg": url(song.attr('name'))};
		};
		var getTrackParameters = this.getTrackParameters = function(song) {
			return [
				songId(song),
				getUrl(song),
				song.find("span.length").attr("seconds"),
				{}
			];
		};


		var pause = this.pause = function() {
			var back;
			if ( !driver.current() || !current().length ) {
				back = false;
			} else if ( driver.current().audio.paused == true ) {
				back = true;
			} else {
				back = driver.pause();
			}
			if ( back ) {
				$(document).trigger("playlist:paused",{current: current()});
			}
			return back;
		};

		var resume = this.resume = function() {
			var back;
			if ( !current().length || !driver.current() )
				back = false;
			else if ( driver.current().audio.paused == false )
				back = true;
			else	back = driver.resume();
			if ( back ) {
				$(document).trigger("playlist:resumed",{current: current()});
			}
			return back;
		};



		var recordPlaylistDriver = this.recordPlaylistDriver = function() {
			if ( driverRecordTimeout ) {
				clearTimeout(driverRecordTimeout);
			}
			driverRecordTimeout = setTimeout(function() {
				if( driver.writable() ) {
					debug("playlist: calling driver.record()",driver);
					driver.record();
				}
				driverRecordTimeout=null;
			},3000);
		};
		

		/*
		*
		* the only function triggering playlistUpdate events
		*
		*/
		var sendPlaylistUpdate = function(data) {
			if ( !list.children("div.song").length ) {
				ui.find(".emptyPlaylist").show();
			} else {
				ui.find(".emptyPlaylist").hide();
			}
			debug("playlist: sending listModified to driver", d10.playlist.currentDriverName());
			driver.listModified(data);
			$(document).trigger('playlistUpdate', data );
			recordPlaylistDriver();
		};

		var playlistAppendPost = function() {
			if ( ui.find(".emptyPlaylist").is(":visible") ) {
				ui.find(".emptyPlaylist").hide();
			}
			sendPlaylistUpdate({ 'action': 'copy' });
		};
		
		
		var append = this.append = function (item, after) {
			if ( !item || !item.length ) {
				return false;
			}
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

			playlistAppendPost ();
		};
		
		var appendToCurrent = this.appendToCurrent = function(items) {
			var c = current();
			if ( c && c.length ) {
				var n = c.next();
				if ( n.length ) {
					append(items,n);
				} else {
					append(items);
				}
			}else {
				list.prepend(items);
				playlistAppendPost();
			}
		};
		
		var empty = this.empty = function() {
			pause();
			$(document).trigger("playlist:ended",{current: current()});
			list.empty();
			sendPlaylistUpdate({ 'action': 'remove' });
		};
		
		var volumeUpdateTimeout = null;
		var volume = this.volume = function(vol,fromPrefs) {
			if ( arguments.length ) {
				//controls.volumeBar.adjustBar(vol);
				debug ("playlist : should adjust volume to "+vol);
				$('body').data('volume',vol);

				if ( !fromPrefs ) {  
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
				}
				$(document).trigger("playlist:volumeChanged");
				return driver ? driver.volume(vol) : true;
			}
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
		
		var appendRandomSongs = function(count, genres) {
			count = count || 3;
			genres = genres || [];
			var opts = {
				"url": site_url+"/api/random",
				"dataType": "json",
				"data": {
					"not[]": allIds(),
					"really_not[]": [],
					"type": "genre",
					"count": count
				},
				"success": function (response) {
					if ( response.status == "success" && response.data.songs.length ) {
						var items = '';
						for ( var index in response.data.songs ) {
							items+= d10.song_template( response.data.songs[index] );
						}
						append($(items));
					}
				}
			};
			for ( var index in d10.user.get_preferences().dislikes ) { opts.data["really_not[]"].push(index); }
			if ( genres && genres.length )  opts.data["name[]"] = genres;
			d10.bghttp.post(opts);
		};
		
		
		this.driver = function() { return driver; };

		var setDriver = this.setDriver = function(newDriver) {
			if ( !newDriver ) {
				return ;
			}
			var oldDriver = driver;
			if ( oldDriver ) {
				oldDriver.disable(newDriver);
			}
			debug("---------- playlist: setDriver",newDriver);
			driver = newDriver;
			newDriver.enable(oldDriver);
			//persist driver in database
			recordPlaylistDriver();
		};
		
		var drivers = {};
		var loadDriver = this.loadDriver = function(name, driverOptions, loadingOptions, cb) {
			if ( !name || !name.length ) {
				debug("playlist:loadDriver name not clean:",name);
				return false;
			}
			if ( !name in d10.playlistDrivers ) {
				debug("playlist:loadDriver driver not found:",name);
				return false;
			}
			debug("============== loading driver : ",name);
			if ( name in drivers ) {
				debug("playlist:loadDriver got driver in cache");
//				setTimeout(function() {
					drivers[name].load(loadingOptions,cb);
//				},100);
				return drivers[name];
			}
			options = options || {};
			debug("playlist:loadDriver creating: ",name);
			drivers[name] = new d10.playlistDrivers[name](driverOptions);
			
			drivers[name].bind("currentSongChanged",function(e,data) {
				list.children("."+settings.currentClass).removeClass(settings.currentClass);
				var widget = songWidget(data.current).addClass(settings.currentClass);
				debug("playlist document event playlist:currentSongChanged");
				$(document).trigger("playlist:currentSongChanged",{current: current()});
				
				// autoscroll
				var startPx = list.scrollTop();
				var height = list.height();
				var stopPx = startPx + height;
				var h = widget.position().top + startPx;
		// 		debug("interval ", startPx, stopPx," , top : ", h);
				if ( h < startPx || h + widget.height() > stopPx ) {
					list.animate({scrollTop: h - (height / 2)}, 300);
		// 			ui.get(0).scrollTop =  h - (height / 2);
				}
			});
			drivers[name].bind("ended",function(e, data) {
				debug("playlist:ended of playlist");
				list.children("."+settings.currentClass).removeClass(settings.currentClass);
				$(document).trigger("playlist:ended",{current: current()});
			});
			drivers[name].bind("currentLoadProgress",function(e, data) {
				$(document).trigger("playlist:currentLoadProgress",{current: current()});
			});
			drivers[name].bind("currentTimeUpdate",function(e, data) {
				$(document).trigger("playlist:currentTimeUpdate",data);
			});

//			setTimeout(function() {
				drivers[name].load(loadingOptions,cb);
//			},100);
			debug("playlist: returning driver");
			return drivers[name];
		};
		
		var remove = this.remove = function(songs) {
			var count = songs.length,
			active = songs.filter("."+settings.currentClass);
			if ( active.length ) {
				driver.pause();
			}
			songs.data("removing",true).slideUp(100,function() 
				{
					$(this).remove();
					sendPlaylistUpdate({ 'action': 'remove' });
				}
			);
		};
		
		var handlePlusClick = function() {
			
			var node = $(this).closest(".song");
			var elem = $(d10.mustacheView("hoverbox.playlist.container", {id: node.attr("name")}));
			if ( node.prevAll().not(".current").length == 0 ) {
				elem.find(".removeAllPrev").remove();
			} else {
				elem.find(".removeAllPrev").click(function() {
					remove(node.prevAll().not(".current"));
					elem.ovlay().close();
				});
			}
			if ( node.nextAll().not(".current").length == 0 ) {
				elem.find(".removeAllNext").remove();
			} else {
				elem.find(".removeAllNext").click(function() {
					remove(node.nextAll().not(".current"));
					elem.ovlay().close();
				});
			}
			
			$("div.fromArtist",elem).click(function() {
// 				var h = "#/library/artists/"+encodeURIComponent( node.find("span.artist").text() );
				d10.router.navigateTo("library","artists",node.find("span.artist").text());
// 				window.location.hash = h;
				elem.ovlay().close();
			});
			
			if ( node.find("span.album").text().length ) {
// 				elem.append('<div class="clickable fromAlbum">Morceaux de cet album...</div>');
				$("div.fromAlbum",elem).click(function() {
					d10.router.navigateTo("library","albums",node.find("span.album").text());
// 					window.location.hash = "#/library/albums/"+encodeURIComponent( node.find("span.album").text() );
					elem.ovlay().close();
				});
			} else {
				$("div.fromAlbum",elem).remove();
			}
			
			if ( !node.attr("data-owner") ) {
				elem.find(".edit").remove();
// 				elem.find("hr").last().remove();
			} else {
				elem.find(".edit").click(function() {
					d10.router.navigateTo("my","review",node.attr("name"));
// 					window.location.hash = "#/my/review/"+encodeURIComponent( node.attr("name") );
					elem.ovlay().close();
				});
			}
			
// 			elem.find(".download").click(function() {
// 				elem.append("<a href=\""+site_url+"/audio/download/"+node.attr("name")+"\" class=\"clickable\">Télécharger</a>");
// 			});
			
			
			elem.css({visibility:'hidden',top:0,left:0}).appendTo($("body"));
			var height = elem.outerHeight(false);
			var width = elem.outerWidth(false);
			var left = $(this).offset().left - width + 10;
			var top= $(this).offset().top - height + 10;
			if ( top < 0 ) top = 0;
			
			elem.hide()
			.css ( { top: top, left : left, visibility:'' } )
			.ovlay({
				"onClose":function() {this.getOverlay().remove();} ,
				"closeOnMouseOut": true
			});
		};
		
		this.currentDriverName = function() {
			if ( !driver )	return false;
			for ( var name in drivers ) {
				if ( drivers[name] === driver ) {
					return name;
				}
			}
		};
		
// 		setDriver(d);
		
		
// 		debug("ui",ui,"list",list);
		d10.dnd.dropTarget (ui,list,{
			"moveDrop": function (source,target, infos) {
				if ( infos.wantedNode ) {  
					infos.wantedNode.after(source);
				} else {
					list.prepend(source);
				}
				// 				if ( p.isRpl() ) { p.setPlaylistName(p.noname); }
				sendPlaylistUpdate({ 'action': "move" });
				// $(document).trigger('playlistUpdate', { 'action': "move" } );
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
					remove($(this));
				}
			);
		})
		.delegate("div.song span.options","click", function(e) {
			handlePlusClick.call(this);
			return false;
		})
;
		
		ui.find("div.manager button[name=new]").click(function() {
			empty();
		});
		
		ui.find(".emptyPlaylist span.link").bind("click",function () { appendRandomSongs(10); });
		
		ui.find(".showOtherOptions").click(function() {
			ui.find(".otherOptionsContainer").slideDown("fast");
			$(this).slideUp("fast");
		});
		
		ui.find(".hideOtherOptions").click(function() {
			ui.find(".showOtherOptions").slideDown("fast");
			$(this).closest(".otherOptionsContainer").slideUp("fast");
		});
		
		
		this.bootstrap = function() {
			var infos = d10.user.get_preferences().playlist || {};
			if ( infos.type && d10.playlistDrivers[infos.type] ) {
				loadDriver(infos.type,{},infos,function(err,songs) {
					setDriver(this);
					$("#playlistLoader").slideUp("fast");
					list.show();
					if ( songs && songs.length ) {
						list.append(songs);
					} else {
						ui.find(".emptyPlaylist").show();
					}
				});
			} else {
				loadDriver("default",{},infos,function(err,songs) {
					$("#playlistLoader").slideUp("fast");
					list.show();
					if ( songs && songs.length ) {
						list.append(songs);
					} else {
						ui.find(".emptyPlaylist").show();
					}
					setDriver(this);
				});

			}
			
		};
		
		
	};
	
})(jQuery);
