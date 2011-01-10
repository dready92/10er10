$(document).ready(function() {
d10.fn.playlist = function ( ui, controls, audio_url, drop_arg, manager ) {

	d10.dnd.dropTarget (drop_arg,ui,{
		"moveDrop": function (source,target, infos) {
			if ( infos.wantedNode ) {  
				infos.wantedNode.after(source);
			} else {
				ui.prepend(source);
			}

			if ( p.isRpl() ) { p.setPlaylistName(p.noname); }
			$(document).trigger('playlistUpdate', { 'action': "move" } );
			return true;
		},
		"copyDrop": function(source, target,infos) {
			var item = source.clone().show().css({'display':'',"opacity": 1}).removeClass('current dragging selected');
			if  ( infos.wantedNode  ) {
			infos.wantedNode.after(item);
			} else {
				ui.prepend(item);  
			}
			playlistAppendPost();
			return true;
		}
	});

	var bar = new progressbar($('div[name=progression]',controls));
	var vbar = new volumebar($('div[name=volume]',controls),1);
	var volumeUpdateTimeout = null;
	var current_secs = null;
	var total_secs = null;
	var startup = true;
	var p = this;
	this.noname = "Playlist non enregistrée";
	var modes = {
		"classic": "par défaut",
		"genre": "par genre musical"
	};
	var mode = "classic";
	var audio = null;
	var audioIval = setInterval(function() {
		if ( d10.player ) {
			debug("setting audio object in playlist");
			audio = d10.player;
			clearInterval(audioIval);
			delete audioIval;
			d10.bghttp.get (
				{
				'url': site_url+'/api/current_playlist',
				'dataType': 'json',
				'callback': 'loadPlaylist'
				}
			);
			var prefs = d10.user.get_preferences();
			if ( prefs.volume ) {
				p.volume(prefs.volume, true);
				vbar.adjustBar(prefs.volume);
			}
		}
	},300);

	var handlePlusClick = function () {
		var elem = $('<div class="hoverbox overlay"></div>');
		var node = $(this).closest(".song");
		if ( node.prevAll().not(".current").length ) {
			elem.append('<div class="clickable removeAllPrev">Enlever tous les morceaux précédents</div>');
			$("div.removeAllPrev",elem).click(function() {
				node.prevAll().not(".current").remove();
				if ( p.isRpl() ) {		  p.setPlaylistName(p.noname); }
				$(document).trigger('playlistUpdate', { 'action': 'remove' } );
				elem.ovlay().close();
			});
		}
		if ( node.nextAll().not(".current").length ) {
			elem.append('<div class="clickable removeAllNext">Enlever tous les morceaux suivants</div>');
			$("div.removeAllNext",elem).click(function() {
				node.nextAll().not(".current").remove();
				if ( p.isRpl() ) {		  p.setPlaylistName(p.noname); }
				$(document).trigger('playlistUpdate', { 'action': 'remove' } );		
				elem.ovlay().close();
			});
				
		}
		
		elem.append("<hr>");
		elem.append('<div class="clickable fromArtist">Morceaux de cet artiste...</div>');
		$("div.fromArtist",elem).click(function() {
			var h = "#/library/artists/"+encodeURIComponent( node.find("span.artist").text() );
			
			window.location.hash = h;
			elem.ovlay().close();
		});
		if ( node.find("span.album").text().length ) {
			elem.append('<div class="clickable fromAlbum">Morceaux de cet album...</div>');
			$("div.fromAlbum",elem).click(function() {
				window.location.hash = "#/library/albums/"+encodeURIComponent( node.find("span.album").text() );
				elem.ovlay().close();
			});
		}
		
		elem.append("<hr>");
		elem.append("<a href=\""+site_url+"/audio/download/"+node.attr("name")+"\" class=\"clickable\">Télécharger</a>");
		
// 		elem.css("visibility","hidden");
		elem.css({'visibility':'hidden','top':0,'left':0}).appendTo($('body'));
		var height = elem.outerHeight(false);
		var width = elem.outerWidth(false);
		var left = $(this).offset().left - width + 10;
		var top= $(this).offset().top - height + 10;
		if ( top < 0 ) top = 0;
				
		elem.hide()
		.css ( {
			'top': top,
			'left' : left,
			'visibility':''
		});
// 		elem.hide().css({"position": "absolute","right":0 });
// 		node.append(elem);
		elem.ovlay({
			"onClose":function() {this.getOverlay().remove();} ,
			"closeOnMouseOut": true
		});
	};

  ui
 .delegate("div.song span.options","click", function(e) {
		handlePlusClick.call(this);
		return false;
  })
  .delegate("div.song","dragstart",
	function(e) {
        var dt = e.originalEvent.dataTransfer;
		$(this).toggleClass("selected",true);
        dt.setData('text/plain','playlist');
        dt.setDragImage( $('#songitem img')[0], 0, 0);
        $(this).css('opacity',0.5);
		d10.dnd.setDragItem(ui.find('.song.selected'));
      })
// 			d10.dnd.onDragDefault)
  .delegate("div.song","dragend",d10.dnd.removeDragItem)
  .delegate("div.song",'click', function (e) {
	  $(this).toggleClass("selected");
  })
  .delegate("div.song",'dblclick', function (e) {
// 	// prevent click / dblclick mess
	if ( $(this).data("removing") ) {	return; };
    playSong($(this));
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
          if ( !$("div.song",ui).length && $(".emptyPlaylist",drop_arg).not(":visible") ) {
            $(".emptyPlaylist",drop_arg).show();
          }
        }
      );
	  if ( p.isRpl() ) {		  p.setPlaylistName(p.noname); }
      $(document).trigger('playlistUpdate', { 'action': 'remove' } );
  });
 
	vbar.adjustBar($('body').data('volume'));

	$('img[name=play]',controls).click(function() {		p.handlePlayClick();	});
	$('img[name=pause]',controls).click(function() {		p.handlePauseClick();	});
	$('img[name=next]',controls).click(function() {		p.handleNextClick();	});
	$('img[name=previous]',controls).click(function() {		p.handlePreviousClick();	});
	$('img[name=likes]',controls).click(function() {
		var test = p.current().attr('name');
		if ( test ) p.handleStarring('likes',test);
	});
	$('img[name=dislikes]',controls).click(function() {
		var test = p.current().attr('name');
		if ( test ) p.handleStarring('dislikes',test);
	});
	$('button[name=new]',manager).click(function() {		p.handleNewClick();	});
	$('button[name=load]',manager).click(function(e) {		p.handleLoadClick(e);	});
	$('button[name=save]',manager).click(function(e) {		p.handleSaveClick(e);	});
	var rplOutOfSync = function (e,data) {
		if ( p.isRpl() == data.playlist._id ) {
			p.setPlaylistName(p.noname);
			$(document).trigger('playlistUpdate', { 'action': 'remove' } );
		}
	};

	$(".emptyPlaylist span.link",drop_arg).bind("click",function () { appendRandomSongs(10); });

	$(document).bind('rplDropSuccess', rplOutOfSync );
	$(document).bind('rplRenameSuccess',function(e,data) { rplRenameSuccessHandler(data);	});
	$(document).bind('rplAppendSuccess',rplOutOfSync);
  
	$(document).bind('player.currentSongProgress', function(e, data) {
		bar.setNetloadBar(data.progress);
	});

	$(document).bind('player.mainTimeUpdate',function ( e, data) { p.updateControls(data); });

	$(document).bind('player.currentSongChanged',function(e,data) {
		debug("playlist: player.currentSongChanged event",data);
		$('.song',ui).removeClass('current');
		debug("setting current class on ",data.current.song);
 		data.current.song.addClass('current');
// 		debug($('.current',ui));
		p.initControls();
		if ( data.current.track.audio.readyState == data.current.track.audio.HAVE_ENOUGH_DATA ) {
// 			debug("playlist: setting netload bar to loaded");
			bar.setNetloadBar({ 'lengthComputable': true, 'total':1, 'loaded': 1 });
		} else {
// 			debug("playlist: setting netload bar to not loaded");
			bar.setNetloadBar({ 'lengthComputable': true, 'total':1, 'loaded': 0 });
		}
		p[mode].currentSongChanged();
		setTimeout(function () {
			document.title = $(".title",data.current.song).text() + ' - '+ $(".artist",data.current.song).text()
			updatePlayingHeader (data.current.song);
		},500);
		// autoscroll
		var startPx = ui.get(0).scrollTop;
		var height = ui.height();
		var stopPx = startPx + height;
		var h = data.current.song.position().top + startPx;
// 		debug("interval ", startPx, stopPx," , top : ", h);
		if ( h < startPx || h > stopPx ) {
			ui.animate({scrollTop: h - (height / 2)}, 300);
// 			ui.get(0).scrollTop =  h - (height / 2);
		}
	});

	$(document).bind('player.currentSongEnded',function () { p.handleNextClick(); });

	$(document).bind('playlistUpdate',function () {
		if ( ui.data('playlistUpdateTimeout') ) {
			window.clearTimeout(ui.data('playlistUpdateTimeout'));
		}
		ui.data(
			'playlistUpdateTimeout',
			window.setTimeout(recordCurrentPlaylist,10000)
		);
	});

	$(document).bind('starringUpdate',function (e, response ) {
		if ( response.status == 'success' && response.data.status == 'success' ) {
			p.starringUpdated(response.data.data.id, response.data.data.star);
			d10.user.refresh_infos();
		}
	});

  var updatePlayingHeader = function (song) {
    var widget = $("header div.playing");
    if ( !song ) {
      widget.fadeOut("fast");
      return ;
    }
    var s = song.clone();
	if ( $("html").hasClass("csstransitions") && widget.is(":visible") ) {
		debug("trying css transform trick");
		var buffer = $("<div></div>");
		buffer.html($(".title",s)).append(" (").append($(".length",s)).append(")")
		.append("<br>").append($(".artist",s)).append(" - ").append($(".album",s))
		widget.addClass("small");
		setTimeout(function() {
			widget.html(buffer.html())
			.removeClass("small");
		}, 500);
		return ;
	}
	
    widget.html($(".title",s)).append(" (").append($(".length",s)).append(")")
      .append("<br>").append($(".artist",s)).append(" - ").append($(".album",s));
    if ( widget.not(":visible") ) {
      widget.fadeIn("fast");
    }
  };

	var getSongsIds = function () {
		return $('.song',ui).map(function() {      return $(this).attr('name');    }   ).get()
	}

	this.initControls = function () {
		var total_secs = parseInt($('.length',p.current()).attr('seconds'));
		bar.setMax(total_secs);
		bar.setBar({"currentTime": 0});
		var d = new Date(1970,1,1,0,0,total_secs);
		$('span[name=total]',controls).html(d.getMinutes()+':'+d.getSeconds());
		$('img[name=play]',controls).hide();
		$('img[name=pause]',controls).show();
		p.starringControls();
	}






	this.updateControls = function (data) {
		bar.setBar(data);
		var d = new Date(1970,1,1,0,0,data.currentTime);
		$('span[name=secs]',controls).html(d.getMinutes()+':'+d.getSeconds());
	}

	this.starringUpdated = function (id,star) {
		var current_id = p.current().attr('name');
		if ( current_id != id )	return ;
		$('img[name=likes]',controls).removeClass('littletrans');
		$('img[name=dislikes]',controls).removeClass('littletrans');
		if ( star == null ) {
			$('img[name=likes]',controls).addClass('littletrans');
			$('img[name=dislikes]',controls).addClass('littletrans');
		} else if ( star == 'likes' ) {
			$('img[name=dislikes]',controls).addClass('littletrans');
		} else if ( star == 'dislikes' ) {
			$('img[name=likes]',controls).addClass('littletrans');
		} 
	}

	this.starringControls = function () {
		// test if user likes this song
		$('img[name=likes]',controls).removeClass('littletrans');
		$('img[name=dislikes]',controls).removeClass('littletrans');
		var id = p.current().attr('name');
		var upref = d10.user.get_preferences();
		if ( upref ) {
			if ( typeof(upref.likes) == 'undefined' || !upref.likes[id] ) {
				$('img[name=likes]',controls).addClass('littletrans');
			}
			if ( typeof(upref.dislikes) == 'undefined' || !upref.dislikes[id] ) {
				$('img[name=dislikes]',controls).addClass('littletrans');
			}
		}
	}

	this.handleStarring = function ( type, id ) {
		d10.bghttp.put({'url': site_url+'/api/starring/'+type+'/'+id,'dataType': 'json','callback':'triggerEvent:starringUpdate'});
	}

	this.seekTo = function (secs) { audio.seek(secs); }

	this.handlePlayClick = function () {
		if ( p.size() == 0 ) {
			return true;
		}
		var c = p.current();
		
		if ( c.length ) {	
			if ( audio.resume() ) {
				$('img[name=play]',controls).hide();
				$('img[name=pause]',controls).show();
			}
		} else {					// no song playing
			playSong(p.first());
		}
	}

	this.handlePauseClick = function () {
		audio.pause();
		$('img[name=pause]',controls).hide();
		$('img[name=play]',controls).show();
	}

	this.handleNextClick = function () {
		var n = p.next();
		if ( n == null )  {
			p.current().removeClass("current");
			$('img[name=pause]',controls).hide();
			$('img[name=play]',controls).show();
			updatePlayingHeader();
		} 
		else {
			playSong(n);
		}
	}

	this.handlePreviousClick = function () {
		var n = p.prev();
		if ( n != null ) {
			playSong(n);
		}
	}

	var playSong = function (n) {
		audio.play(n);
	}

	this.empty = function () {
		audio.empty();
		$('.song',ui).remove();
		if ( $(".emptyPlaylist",drop_arg).not(":visible") ) {
			$(".emptyPlaylist",drop_arg).show();
		}
	}

	this.size = function () {		return $('.song',ui).length;	}

	this.current = function () {		return $('.current',ui);	}

	this.first = function () {		return $('.song:first',ui);	}

	this.last = function () {		return $('.song:last',ui);	}

	this.next = function () {
		var c = p.current();
		if ( ! c.length )				return null;
		var n = c.next();
		if ( !n.length )			return null;
		return n;
	}

	this.prev = function () {
		var c = p.current();
		if ( ! c.length )				return null;
		var n = c.prev();
		if ( !n.length )			return null;
		return n;
	}

	this.volume = function ( fl , fromPrefs ) {
		debug ("playlist : should adjust volume to "+fl);
		$('body').data('volume',fl);
		audio.volume();
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
	};

	var recordCurrentPlaylist = function () {
		if ( p.isRpl() ) {
			d10.bghttp.put({
				'url': site_url+'/api/current_playlist',
				'data': { 'playlist': p.isRpl() } ,
				'dataType':'json',
				'callback': 'triggerEvent:currentPlaylistChanged'
			});
			return ;
		}
		var ids = getSongsIds();
		d10.bghttp.put({
			'url': site_url+'/api/current_playlist',
			'data': { 'ids[]': ids } ,
			'dataType':'json',
			'callback': 'triggerEvent:currentPlaylistChanged'
		});
	}


  // if playlist got a name, list = {'_id': 'pl***', 'songs': [ 'aaa**' ] }
	this.loadPlaylist = function ( list ) {
		p.empty();
		if ( !list._id ) {
			this.setPlaylistName(this.noname);
			var items = '';
			for ( var index in list) { items += d10.song_template(list[index]); }
			if ( items.length ) { p.append($(items)); }
			if  ( startup ) startup = false;
		} else {
// 			ui.data('waitRpl',list._id);
			var opts = {"url": site_url+"/api/plm/" + list._id, "dataType": "json", "success": loadPlm };
			d10.bghttp.get ( opts );
// 			d10.user.get_playlist(list._id, loadPlm );
		}
	}

	var setPlaylistName = this.setPlaylistName = function(name,id) {
		//debug("setting playlist title to "+name);
		$('aside .playlisttitle > span').html(name);
		if ( id ) {
			$('aside .playlisttitle > span').attr('name',id);
		} else {
			$('aside .playlisttitle > span').attr('name','');
		}
	}

	this.loadFromPlm = function (rpldiv,name) {
		p.empty();
		p.setPlaylistName(name,rpldiv.attr('name'));
		var cloned = $('.song',rpldiv).clone();
		p.append(cloned);
	}

	this.handleNewClick = function() {
		p.setPlaylistName(this.noname);
		p.empty();
		$(document).trigger('playlistUpdate', { 'action': 'remove' } );
	};


	this.handleLoadClick = function (e) {
		var elem = $('<div class="hoverbox overlay"><div class="part">Charger...</div></div>');
		playlists = d10.user.get_playlists();
		if ( !playlists.length ) {
			return false;
		}
		for ( var index in playlists ) {
			var tt = $('<div class="clickable"></div>');
			tt.attr("name",playlists[index]._id).html(playlists[index].name);
			elem.append(tt);
		}
		elem.css({'visibility':'hidden','top':0,'left':0}).appendTo($('body'));
		var height = elem.outerHeight(false);
		var width = elem.outerWidth(false);
		var wwidth = $(window).width();
		var left = e.pageX - width + 10;
		var top= e.pageY - height + 10;
		if ( top < 0 ) top = 0;

		elem.hide()
		.css ( {
			'top': top,
			'left' : left,
			'visibility':''
		})
	//     .mouseleave(function() {$(this).remove();})
		.find('.clickable')
		.click(function() {
	//       ui.data('waitRpl',$(this).attr('name'));
			var opts = {"url": site_url+"/api/plm/"+$(this).attr('name'),"dataType": "json", "success": loadPlm };
			d10.bghttp.get ( opts );
// 			d10.user.get_playlist($(this).attr('name'),loadPlm);
			$('img[name=load]',manager).one('click',function(e) {		p.handleLoadClick(e);	});
			$(this).closest('.overlay').ovlay().close();
		});
	//     .appendTo("body")
		elem.ovlay({"onClose":function() {this.getOverlay().remove();} });
	//     elem.fadeIn('fast');
	};

  var catchPlaylistSuccess = function (e,response) {
    if ( response.playlist.name ==  $('aside .playlisttitle > span').text() ) {
      p.setPlaylistName(response.playlist.name,response.playlist._id);
      $(document).unbind('rplCreationSuccess',catchPlaylistSuccess);
      $(document).unbind('rplCreationFailure',catchPlaylistFailure);
      $(document).unbind('rplUpdateSuccess',catchPlaylistSuccess);
      $(document).unbind('rplUpdateFailure',catchPlaylistFailure);
      $('aside .manager').slideDown();
    }
    $(document).trigger('playlistUpdate');
  }

  var catchPlaylistFailure = function (e,response) {
    if ( response.data.name ==  $('aside .playlisttitle > span').text() ) {
      p.setPlaylistName(p.noname);
      $(document).unbind('rplCreationSuccess',catchPlaylistSuccess);
      $(document).unbind('rplCreationFailure',catchPlaylistFailure);
      $(document).unbind('rplUpdateSuccess',catchPlaylistSuccess);
      $(document).unbind('rplUpdateFailure',catchPlaylistFailure);
      $('aside .manager').slideDown();
    }
  }


  var recordRpl = function (name)  {
    $('aside .playlisttitle > span').text(name);
    $(document).bind('rplCreationSuccess',catchPlaylistSuccess);
    $(document).bind('rplCreationFailure',catchPlaylistFailure);
    $(document).trigger('rplCreationRequest',
      {
        'songs[]' : getSongsIds(),
        'name': name,
        'from': 'playlist'
      }
    );
  }

  var updateRpl = function (name,id)  {
    $('aside .playlisttitle > span').text(name);
    var catchUpdatePlaylistSuccess = function() {
      d10.user.get_playlist(id);
      catchPlaylistSuccess();
    }
    $(document).bind('rplUpdateSuccess',catchUpdatePlaylistSuccess);
    $(document).bind('rplUpdateFailure',catchPlaylistFailure);
    var pldiv = $("<div><div class=\"list\"></div></div>");
    pldiv.attr("name",id).attr("immediate",true);
    $(".list",pldiv).append($(".song",ui).clone());
    $(document).trigger('rplUpdateRequest', pldiv );
  }

	$("aside .saveplaylist input").keypress(function(e) {
		if ( e.keyCode == 13 ) { $("aside .saveplaylist button").click(); }
	});
	$("aside .saveplaylist span.link").click(function() {
		$("aside .saveplaylist").slideUp('fast');
		$("aside .manager").slideDown('fast');
	});
	$("aside .saveplaylist button").click(function() {
		var container = $('aside .saveplaylist');
		if ( !$('input[type=text]',container).val().length ||
			$('input[type=text]',container).val() == $('input[type=text]',container).attr('defaultvalue') ) {
			$('span.link',container).trigger('click');
			return ;
		}
		container.slideUp("fast");
		if ( d10.user.playlist_exists($('input[type=text]',container).val()) )  {
			$("aside .updateplaylist").slideDown("fast");
		} else {
			recordRpl($('input[type=text]',container).val());
		}
	});

	$("aside .updateplaylist button").click(function() {
		$("aside .updateplaylist").slideUp("fast");
		$("aside .manager").slideDown('fast');
		var pl = d10.user.get_playlists();
		var name = $('aside .saveplaylist input[type=text]').val();
		for ( var index in pl ) {
			if ( pl[index].name == name ) {
			updateRpl(name,pl[index]._id);
			return false;
			}
		}
		return false;
	});

	$('aside .updateplaylist span.link').click(function(){
		$("aside .updateplaylist").slideUp("fast");
		$("aside .saveplaylist").slideDown("fast");
	});


	this.handleSaveClick = function () {
		var container=$('aside .saveplaylist');
		$('aside .manager').slideUp('fast');
		container.slideDown('fast');
		$('input[type=text]',container).val('').focus(function() {
		if ( $(this).val() == $(this).attr('defaultvalue') ) {
			$(this).val('');
		}
		})
		.blur(function() {
			if ( $(this).val() == '' ) {
				$(this).val($(this).attr('defaultvalue'));
			}
		}).get(0).focus();
	};

	function loadPlm (response) {
		ui.empty();
		var items = '';
		for ( var index in response.data.songs ) {
			items += d10.song_template(response.data.songs[index]);
		}
		if ( items.length ) { p.append($(items)); }
		setPlaylistName(response.data.name,response.data._id);
		if ( startup )  startup = false;
		else $(document).trigger('playlistUpdate', { 'action': 'copy' } );
	};
  
  

	this.append = function (item, after) {
		var index = -1;
		if ( after ) { index = after.prevAll().length; }
		if ( index >= 0 && ui.children().eq(index).length ) {
		item.insertBefore(ui.children().get(index));
		} else {
		item.appendTo(ui);
		}
	//     debug("checking empty thing");
		playlistAppendPost ();
	};

	this.isRpl = function () { return $('aside .playlisttitle > span').attr('name'); }

	var playlistAppendPost = function() {
		if ( $(".emptyPlaylist",drop_arg).is(":visible") ) {
			$(".emptyPlaylist",drop_arg).hide();
		}
		if ( p.isRpl() ) {
			p.setPlaylistName(p.noname);
		}
		$(document).trigger('playlistUpdate', { 'action': 'copy' } );
	};

  var rplDropSuccessHandler = function (data) {
    if ( p.isRpl() == data.playlist._id ) { p.setPlaylistName(p.noname); }
  }

  var rplRenameSuccessHandler = function (data) {
    if ( p.isRpl() == data.playlist._id ) { p.setPlaylistName(data.playlist.name,data.playlist._id); }
  }

	var appendRandomSongs = function(count, genres) {
		count = count || 3;
		genres = genres || [];
		var opts = {
			"url": site_url+"/api/random",
			"dataType": "json",
			"data": {
				"not[]": getSongsIds(),
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
				p.append($(items));
				}
			}
		};
		for ( var index in d10.user.get_preferences().dislikes ) { opts.data["really_not[]"].push(index); }
		if ( genres && genres.length )  opts.data["name[]"] = genres;
		d10.bghttp.post(opts);
	};

  this.classic = {
    "currentSongChanged": function() {},
    "setup": function(){$("div.autofill div.off",controls).show()},
    "setdown": function() {$("div.autofill div.off",controls).hide()}
  };

  this.genre = {
    "currentSongChanged": function() {
      setTimeout(function() {
        var genres = p.genre.widget.overlay.find("div.checked").map(function() {     return $(this).attr('name');    }   ).get();
        if ( p.current().nextAll().length < 3 ) {
          setTimeout(function() {appendRandomSongs(3, genres)},3000);
        }
      },5000);
    },
    "setup": function(){
      $("div.autofill div.on",controls).show();
    },
    "setdown": function() {
      $("div.autofill div.on",controls).hide();
    },
    "widget": {
      "overlay": $("div.autofill div.overlay")
    }
  };
  
  $("div.autofill div.off > span.link",controls).click(function() {
    p[mode].setdown();
    mode = "genre";
    p[mode].setup();
  });

  $("div.autofill div.on > span.link",controls).click(function() {
    
    if ( p.genre.widget.overlay.ovlay() ) {
      return p.genre.widget.overlay.ovlay().close();
    }
    var pos = $(this).position();
    var top = pos.top-200;
    if ( top < 10 )  top = 10;
    p.genre.widget.overlay.css({"top": top ,"left": pos.left-270, "width": "250px"})
    .ovlay({"load":true});
  });
  $("div.disable",p.genre.widget.overlay).click(function () {
    p[mode].setdown();
    mode = "classic";
    p[mode].setup();
    p.genre.widget.overlay.ovlay().close();
  });
  $("div.close",p.genre.widget.overlay).click(function() {
    p.genre.widget.overlay.ovlay().close();
  });
  $(".list > div",p.genre.widget.overlay).click(function() { $(this).toggleClass("checked"); });

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
    d10.playlist.seekTo(Math.floor(pix/punit));
    debug(pix+' = '+pix/punit+' secs');
  });

  this.getMax = function () { return pmax; }

  // in seconds
  this.setMax = function(num) {
    pmax=parseInt(num);
    punit=ui.width() / pmax;
  }

  this.setBar = function(data) {
    $('div.timer',ui).css({
      width: Math.floor(punit*data.currentTime)
    });
  }


  this.setNetloadMax = function (num) {
    netload_pmax=parseInt(num);
    netload_punit=ui.width() / netload_pmax;
  }

  this.setNetloadBar = function(data) {
    if ( !data.lengthComputable ) {
      return false;
    }
    this.setNetloadMax(data.total);
//     debug("loaded: ",data.loaded," total: ",data.total); 
    $('div.netload',ui).css({
      width: Math.floor(netload_punit*data.loaded)
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
		$('div',ui).css( 'width', pix);
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
}

});