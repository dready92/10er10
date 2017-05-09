define(["js/domReady", "js/user", "js/d10.rest", "js/d10.dnd", "js/d10.router", "js/playlist.driver.default", "js/d10.templates",
	   "js/config", "js/d10.events"],
	   function(foo, user, rest, dnd, router, defaultDriver, tpl, config, pubsub) {

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
	 *  - incrementPlaybackRate(): tell the underlying driver to increment the playbak rate of the current song
	 *  - decrementPlaybackRate(): tell the underlying driver to decrement the playbak rate of the current song
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

	function playlist (ui, options) {

		var settings= $.extend({
			currentClass: "current"
		}, options);

		var list = $("#playlist",ui);
		var driver = null;
		var modules = this.modules = {};

		// the timeout id for operation of recording current playlist driver state to the database
		var driverRecordTimeout = null;


		/*
		events binding :

		1/ audio [all events] bound to proxyHandler
		2/ proxyHandler calling CURRENT driver's handleEvent
		3/ current driver calling this.trigger to feedback to the playlist
		*/

		var eventProxy = function() {
			driver.handleEvent.apply(this,arguments);
		};

		var container = this.container = function() {
			return ui;
		};

        var songsList = this.songsList = function() {
            return list;
        }

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

		function allIds() {
			return list.children(".song").map(function() {      return $(this).attr('name');    }   ).get()
		}

		var songsIds = this.songsId = this.allIds = allIds;

		var songWidget = this.songWidget = function(identifier) {
// 			debug("playlist:songWidget, id: ",identifier);
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

        var playNext = this.playNext = function() {
          var widget = current().next();
          if ( widget.length ) {
            driver.play( getTrackParameters(widget) );
            return true;
          }
          return false;
        };

        var playPrevious = this.playPrevious = function() {
          var widget = current().prev();
          if ( widget.length ) {
            driver.play( getTrackParameters(widget) );
            return true;
          }
          return false;
        };

        var getSongAtIndex = this.getSongAtIndex = function(index) {
          var widget = list.children(".song").eq(index) ;
          if ( widget.length ) {
            return widget;
          }
          return null;
        };

        var playSongAtIndex = this.playSongAtIndex = function(index) {
          var widget = getSongAtIndex(index);
          if ( widget ) {
            return driver.play( getTrackParameters(widget) );
          }
          return null;
        };

		var all = this.all = function() {
			return list.children(".song");
		};

		var title = this.title = function(t) {
			if ( !arguments.length ) {
				return $("#side > .playlisttitle > span").html();
			}
			$("#side > .playlisttitle > span").text(t);
		};

		var getUrl = this.getUrl = function(song) {
            var url = function (id, extension) { return config.audio_root+id.substr(2,1)+"/"+id+"."+extension; } ;
            var urls = {};

            if ( song.attr("data-originalfile-type") ) {
              urls[song.attr("data-originalfile-type")] = url(song.attr('name'), song.attr("data-originalfile-extension"));
            }


            urls["audio/ogg"] = url(song.attr('name'),"ogg");
			return urls;
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
				pubsub.topic("playlist:paused").publish({current: current()});
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
				pubsub.topic("playlist:resumed").publish({current: current()});
			}
			return back;
		};

        var playOrResume = this.playOrResume = function() {
          var widget = current(),
          track = driver.current();
          if ( widget.length ) {
            if ( !track ) {
              driver.play( getTrackParameters( widget ));
            } else {
              var ok = resume();
            }
          } else {
            var first = all().eq(0);
            if ( first.length ) {
              driver.play( getTrackParameters(first) );
            }
          }
        };


		var recordPlaylistDriver = this.recordPlaylistDriver = function() {
			if ( driverRecordTimeout ) {
				clearTimeout(driverRecordTimeout);
			}
			driverRecordTimeout = setTimeout(function() {
				if( driver.writable() ) {
// 					debug("playlist: calling driver.record()",driver);
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
			driver.listModified(data);
			pubsub.topic("playlistUpdate").publish( data );
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
			pubsub.topic("playlist:ended").publish({current: current()});
			list.empty();
			sendPlaylistUpdate({ 'action': 'remove' });
		};

		var volumeUpdateTimeout = null;
		var volume = this.volume = function(vol,fromPrefs) {
			if ( arguments.length ) {
				//controls.volumeBar.adjustBar(vol);
// 				debug ("playlist : should adjust volume to "+vol);
				if ( !fromPrefs ) {
					user.set_volume(vol);
				}
				pubsub.topic("playlist:volumeChanged").publish({volume: vol});
				return driver ? driver.volume(vol) : true;
			}
			return user.get_volume();
		};

		pubsub.topic("user.infos").one(function() {
          volume(user.get_volume(),true);
		});

		var seek = this.seek = function(secs) {
			driver.seek(secs);
		};

		var incrementPlaybackRate = this.incrementPlaybackRate = function() {
			driver.incrementPlaybackRate();
		};

		var decrementPlaybackRate = this.decrementPlaybackRate = function() {
			driver.decrementPlaybackRate();
		};

		var appendRandomSongs = function(count, genres) {
			count = count || 3;
			genres = genres || [];
			var opts = {
				data: {
					"not[]": allIds(),
					"really_not[]": [],
					"type": "genre",
					"count": count
				},
				load: function (err,songs) {
					if ( err ) { return;
					};
					var items = tpl.song_template( songs );
					if ( items.length ) {
						append($(items));
					}
				}
			};
			for ( var index in user.get_preferences().dislikes ) { opts.data["really_not[]"].push(index); }
			if ( genres && genres.length )  opts.data["name[]"] = genres;
            rest.song.random(opts);
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
// 			debug("---------- playlist: setDriver",newDriver);
			driver = newDriver;
			newDriver.enable(oldDriver);
			//persist driver in database
			recordPlaylistDriver();
		};

		var availableDrivers = {default: defaultDriver};
		var registerDriver = this.registerDriver = function(name, obj) {
			availableDrivers[name] = obj;
		};


		var drivers = {};
		var loadDriver = this.loadDriver = function(name, driverOptions, loadingOptions, cb) {
			if ( !name || !name.length ) {
				debug("playlist:loadDriver name not clean:",name);
				return false;
			}
			if ( !name in availableDrivers ) {
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
			drivers[name] = new availableDrivers[name](this, eventProxy, driverOptions);

			drivers[name].bind("currentSongChanged",function(e,data) {
				list.children("."+settings.currentClass).removeClass(settings.currentClass);
				var widget = songWidget(data.current).addClass(settings.currentClass);
// 				debug("playlist document event playlist:currentSongChanged");
				pubsub.topic("playlist:currentSongChanged").publish({current: current()});

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
// 				debug("playlist:ended of playlist");
				list.children("."+settings.currentClass).removeClass(settings.currentClass);
				pubsub.topic("playlist:ended").publish({current: current()});
			});
			drivers[name].bind("currentLoadProgress",function(e, data) {
				pubsub.topic("playlist:currentLoadProgress").publish({current: current()});
			});
			drivers[name].bind("currentTimeUpdate",function(e, data) {
				pubsub.topic("playlist:currentTimeUpdate").publish(data);
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

		this.currentDriverName = function() {
			if ( !driver )	return false;
			for ( var name in drivers ) {
				if ( drivers[name] === driver ) {
					return name;
				}
			}
		};

		dnd.dropTarget (ui,list,{
			"moveDrop": function (source,target, infos) {
				if ( infos.wantedNode ) {
					infos.wantedNode.after(source);
				} else {
					list.prepend(source);
				}
				sendPlaylistUpdate({ 'action': "move" });
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
				$(this).css('opacity',0.5);
				dnd.setDragItem(list.find('.song.selected'));
			}
		)
		.delegate("div.song","dragend",dnd.removeDragItem)
		.delegate("div.song",'click', function (e) {
			$(this).toggleClass("selected");
		})
		.delegate("div.song",'dblclick', function (e) {
			// 	// prevent click / dblclick mess
			if ( $(this).data("removing") ) {	return; };
			driver.play.apply(driver, getTrackParameters($(this)));
			if ( !$('span.remove',$(this)).hasClass('hidden') )   $('span.remove',$(this)).addClass('hidden');
		})
		.delegate("div.song span.remove",'click',function() {
			$(this).closest("div.song").data("removing",true).slideUp(100,function()
				{
					remove($(this));
				}
			);
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
			var infos = user.get_preferences().playlist || {};
			if ( infos.type && infos.type in availableDrivers ) {
				this.loadDriver(infos.type,{},infos,function(err,songs) {
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
				this.loadDriver("default",{},infos,function(err,songs) {
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


	var pl = new playlist( $("aside") , {} );

	return pl;
});
