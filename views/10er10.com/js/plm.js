(function($){

d10.fn.plm = function (mydiv,mypldiv) {
	var that = this;
	var plmUpdateTimeout = null;

  $(document).bind('rplRenameResponse',function(e,data) {		rplRenameResponseHandler(data);	});
  $(document).bind('rplRenameSuccess',function(e,data) {    rplRenameSuccessHandler(data);	});

  $(document).bind('rplDropResponse',function(e,data) {		rplDropResponseHandler(data);	});
  $(document).bind('rplDropSuccess',function(e,data) {		rplDropSuccessHandler(data);	});

	/*
	
		when appending a song (json object) to an rpl
		
		
	*/
	var _appendSong = function(song, pldiv,index) {
		if ( typeof index == 'undefined' || 
					index > $('.list',pldiv).children().length || 
					index < 0 )	 {
			index = $('.list',pldiv).children().length;
		}
    var songtpl = null;
    if ( song._id ) { songtpl = $(d10.song_template(song)); } 
    else { songtpl = song; }

    var nextOne = $('.list',pldiv).children().eq(index);
    if ( nextOne.length ) { songtpl.insertBefore( nextOne ); } 
    else { songtpl.appendTo( $('.list',pldiv) ); }

		if ( $('.empty:visible',pldiv).length ) {
			$('.empty',pldiv).addClass("hidden");
		}
    if ( $('.list:visible',pldiv).length == 0 ) {
      $('.list',pldiv).removeClass("hidden");
    }
	};

	/*
	
	
		when creating a playlist view
	
	
	*/
	var _createRPLDisplay = function (content_container, id ) {
		var pldiv = $( d10.mustacheView('my.plm.rpl') )
      .hide()
      .attr('name',id);

    d10.dnd.dropTarget (pldiv,$('.list',pldiv),{
		"moveDrop": function(source,target,infos) {
			if ( infos.wantedNode ) { infos.wantedNode.after(source); } 
			else { $('.list',pldiv).prepend(source); }
			that.update_playlist(pldiv.attr("name"));
//			$(document).trigger('rplUpdateRequest', pldiv );
			return true;
		},
		"copyDrop": function(source,target,infos) {
			debug("copyDrop, wantedNode : ",infos.wantedNode, infos);
			var item = source.clone().removeClass('hidden').removeClass('dragging').removeClass('selected').removeClass('current').show().css('display','').css('opacity',1);
			if ( infos.wantedNode ) { infos.wantedNode.after(item); } 
			else { $('.list',pldiv).prepend(item); }
			if ( $('.empty:visible',pldiv).length ) {
				$('.empty',pldiv).addClass("hidden");
			}
			if ( $('.list:visible',pldiv).length == 0 ) {
				$('.list',pldiv).removeClass("hidden");
			}
			
			that.update_playlist(pldiv.attr("name"));
//			$(document).trigger('rplUpdateRequest', pldiv );
			
			return true;
		}
    });

     pldiv.find('.list')
     .delegate("div.song span.remove","click",function(e) {
       $(this).closest('.song').fadeOut('fast',function() {
         $(this).remove();
         if ( $('.song',pldiv).length == 0 ) {
           $('.empty',pldiv).toggleClass("hidden",false);
           $(".list",pldiv).toggleClass("hidden",true);
         }
         that.update_playlist(pldiv.attr("name"));
       });
     })
/*
	.delegate("div.song","click",function(e) {
		if ( $(e.target).closest(".add").length == 0 )
			$(this).toggleClass("selected");
	})
    .delegate("div.song","dblclick",function(e) {
    	debug("plm dblclick");
        d10.playlist.append(
          $(this).clone()
        );
     });
*/
    pldiv.find('.controls button[name=rename]').click(function() {
      pldiv.find('.controls').hide();
      pldiv.find('.rename').slideDown();
      pldiv.find('.rename input[name=name]').val(
        $('.plm-list .plm-list-item[name='+pldiv.attr('name')+']',mydiv).text()
      ).get(0).focus();
    });
    pldiv.find(".rename input[name=name]").keypress(function(e) {
      if ( e.keyCode == 13 ) {
        pldiv.find(".rename button[name=rename]").click();
      }
    });
    pldiv.find('.rename button[name=rename]').click(function () {
      rplRenameRequestHandler(pldiv,pldiv.find('.rename input[name=name]').val());
      pldiv.find('.controls').slideDown();
      pldiv.find('.rename').hide();
      return false;
    });
    pldiv.find('.rename button[name=no]').click(function () {
      pldiv.find('.controls').slideDown();
      pldiv.find('.rename').hide();
      return false;
    });

    pldiv.find('.controls button[name=drop]').click(function() {
      pldiv.find('.controls').hide();
      pldiv.find('.drop').slideDown();
      return false;
    });
    pldiv.find('.drop button[name=yes]').click(function () {
      rplDropRequestHandler(pldiv);
      pldiv.find('.controls').slideDown();
      pldiv.find('.drop').hide();
      return false;
    });
    pldiv.find('.drop button[name=no]').click(function () {
      pldiv.find('.controls').slideDown();
      pldiv.find('.drop').hide();
      return false;
    });
    pldiv.find('button[name=load]').click(function() {
		
		var rpldoc = {
			_id: pldiv.attr('name'),
			name: $('.plm-list .plm-list-item[name='+pldiv.attr('name')+']',mydiv).html(),
			songs: pldiv.children(".list").children(".song").map(function() {      return $(this).attr('name');    }   ).get()
		};

		d10.playlist.empty();
		d10.playlist.append(pldiv.children(".list").children(".song").clone());		
		var driver = d10.playlist.loadDriver("rpl",{},{rpldoc: rpldoc},function(err,resp) {
			if ( err )	{
				debug("playlistModuleRpl:loadDriver error",err);
				return ;
			}
			debug("plm setting driver",driver);
			d10.playlist.setDriver(driver);
		});
		/*
      d10.playlist.loadFromPlm(
        pldiv,
        $('.plm-list .plm-list-item[name='+pldiv.attr('name')+']',mydiv).html()
      );
	*/
      return false;
    });
		content_container.append(pldiv);
		return pldiv;
	}

	this.init_topic_plm = function () {
		//only load once
		if ( mypldiv.data('loaded') ) {
			return ;
		}
		
		mypldiv.data('loaded',true);
		mypldiv.append(d10.mustacheView('my.plm'));
		
		// event binding
		$('section.plm-list-container .plm-new-form button[name=create]',mypldiv).click(function() {
			$('section.plm-list-container .plm-new-form',mypldiv).hide();
			$('section.plm-list-container',mypldiv).append($('#waititem > img').clone());
			// create new empty playlist
			that.create_playlist( $('section.plm-list-container .plm-new-form input[name=name]',mypldiv).val(), mypldiv );
			return false;
		});
		$('section.plm-list-container .plm-new-form button[name=cancel]',mypldiv).click(function() {
			$('section.plm-list-container img',mypldiv).remove();
			$('section.plm-list-container .plm-new-form',mypldiv).hide();
			$('section.plm-list-container button[name=plm-new]',mypldiv).slideDown('fast');
			return false;
		});
		// user playlists
		var playlists = d10.user.get_playlists();
		for ( var index in  playlists ) {
			$('.plm-list',mypldiv).append(
				'<div class="plm-list-item" name="'+playlists[index]._id+'" action="'+playlists[index]._id+'">'+playlists[index].name+'</div>'
			);
		}

		// bind new playlist link
		$('section.plm-list-container button[name=plm-new]',mypldiv).click (function() {
			$(this).hide().next('.plm-new-form')
			.slideDown('fast').find('input[type=text]').val('').focus();
			return false;
		});


	// manages the left menu to switch playlists
		var mm = this.router = new d10.fn.menuManager ({
			'menu': $('section.plm-list-container .plm-list',mypldiv),
			'container': $('.plm-content-container',mypldiv),
			'active_class': 'active',
			'property': 'name',
			'effects': false,
			"useRouteAPI": true,
			"routePrepend":["my","plm"]
		});
		mm.bind("subroute",function(e,data) {
		that.plm_playlist_display(data.label);
		});
		d10.my.router.bind("subroute.plm",function(e,data) {
	//       debug("got plm subroute event",data);
			if ( data.segments.length && data.segments[0].substr(0,2) == "pl" ) {
				mm.route(data.segments, data.env) ;
			}
//       e.stopPropagation();
		});
	};

	this.plm_playlist_display = function (id) {
			var content_container = $('section.plm-content-container',mypldiv);
			//$('div.rpl',content_container).hide();
			var pldiv = $('div.rpl[name='+id+']',content_container);
			if ( !pldiv.length ) {
//				debug("plm_playlist_display: rpl "+id+" does not exist: creating");
				pldiv = _createRPLDisplay ( content_container , id );
				$('.pleaseWait',pldiv).show();
				$('.list',pldiv).removeClass('hidden').addClass('hidden');
				$('.empty',pldiv).addClass("hidden");
				$('.controls',pldiv).hide();

				
				var onPlaylistResponse = function ( response ) {
					debug("plm load response",response);
					$('.list',pldiv).empty();

					var songs = '';
					for ( var index in response.data.songs ) {
						songs+= d10.song_template(response.data.songs[index]);
					}
					_appendSong ($(songs), pldiv) ;
					if  ( $('.pleaseWait',pldiv).css('display') != 'none' ) {
						$('.pleaseWait',pldiv).hide();
						if ( $('.list',pldiv).children().length ) {
							$('.list',pldiv).removeClass("hidden");
					$('.empty',pldiv).addClass("hidden");
						} else {
							$('.empty',pldiv).removeClass("hidden");
						}
						$('.controls',pldiv).show();
					}
				};
				var opts = {"url": site_url+"/api/plm/"+id,"dataType": "json", "success": onPlaylistResponse };
				d10.bghttp.get ( opts );

			}
	}

	/*
	
		Create a playlist
		
	*/

	this.create_playlist = function (name,opts) {
		opts = opts || {};
		if ( name.length == 0 || d10.user.playlist_exists(name) ) {
			$('section.plm-list-container img',mypldiv).remove();
			$('section.plm-list-container button[name=plm-new]',mypldiv).slideDown('fast');
			return ;
		}
		var data = {name: name};
		if ( opts.songs ) {
			data["songs[]"] = opts.songs;
		}
		d10.bghttp.put(
			{
				url: site_url+'/api/plm/create',
				data: data, 
				dataType: "json",
				error: function(e) {
					debug('trigger; rplCreationFailure');
					$(document).trigger('rplCreationFailure', e.request);
					if ( opts.error ) {
						opts.error(e);
					}

					$('section.plm-list-container img',topicdiv).remove();
					$('section.plm-list-container button[name=plm-new]',topicdiv).show();
				},
				success: function(resp) {
					
					var rplCreationSuccessHandler = function(response) {
						debug("plm:rplCreationSuccessHandler response: ",response);
						if ( !mypldiv.length )	return ;
					   // playlist menu item
						var pl_item = $('<div class="plm-list-item" name="'+response.playlist._id+'" action="'+response.playlist._id+'"></div>');
						debug("plm:createplaylist pl_item: ",pl_item);
						pl_item.html(response.playlist.name);
						debug("plm:createplaylist pl_item: ",pl_item);
						//
						// place menu item alphabetically
						//
						var set=false;
						$('section.plm-list-container .plm-list > div',mypldiv).each (function(i) {
							if ( $(this).html() > response.playlist.name ) {
								$(this).before(pl_item);
								set=true;
								return false;
							}
						});
						if ( set == false ) {
							$('section.plm-list-container .plm-list',mypldiv).append(pl_item);
						}
						
						//
						// remove creation form and show creation link
						//
						// 		if ( response.from && response.from == 'plm' ) {
						$('section.plm-list-container img',mypldiv).remove();
						$('section.plm-list-container  button[name=plm-new]',mypldiv).show();
						// 		}
						//
						// trigger the click event on newly added list item
						//
						debug("plm:createplaylist pl_item: ",pl_item);
						pl_item.trigger('click');
					}
					debug(resp);
					rplCreationSuccessHandler(resp.data);
					if ( opts.success ) {
						opts.success(resp.data.playlist);
					}
					debug('trigger; rplCreationSuccess');
					$(document).trigger('rplCreationSuccess', { 'playlist': resp.data.playlist});
				}
				
			}
		);
		$(document).trigger('rplCreationRequest', { 'name': name , 'from':'plm' });
	}
  /*
   *
   * Update playlist list
   *
   */
  
  
	var _update_playlist = function(name, songs, opts) {
		opts = opts || {};
		d10.bghttp.put(
			{
				url: site_url+'/api/plm/update',
				data:	{ 'playlist': name, 'songs[]': songs },
				dataType: 'json',
				success: function(response) {
					if ( opts.success ) { opts.success(response); }
				},
				error: function(e) {
					if ( opts.error ) { opts.error(e); }
				}
			}
		);
	};
  

	this.update_playlist = function(name,opts) {
	
		var doUpdate = function() {
			var pldiv = mypldiv.find("section.plm-list-container .plm-list .plm-list-item[name="+name+"]");
			if ( !pldiv.length ) {
				if ( opts.error ) {
					opts.error.call(name);
				}
				return;
			}
		
			var songs_id = $('.list .song',pldiv).map(function() { return $(this).attr('name');	}).get();
			_update_playlist(name, songs_id, {
				success: function(response) {
					if ( opts.success ) { opts.success(response); }
					$(document).trigger('rplUpdateSuccess', { 'playlist': response.data.playlist  });
				},
				error: function(e) {
					if ( opts.error ) { opts.error(e); }
					debug('triggering rplUpdateFailure');
					$(document).trigger('rplUpdateFailure', response.request);
				}
			}); 
		};		
		
		opts = opts||{};
		doUpdate();

	};

	this.replace_playlist = function(name,songs,opts) {
		opts = opts||{};
		_update_playlist(name, songs, {
			success: function(response) {
				debug("plm:replace_playlist success callback response: ",response);
				var pldiv = mypldiv.find("section.plm-content-container .rpl[name="+name+"] > .list");
				if ( pldiv.length ) {
					var html = "";
					for ( var i in response.data.songs ) {
						html += d10.song_template(response.data.songs[i]);
					}
					pldiv.empty();
					if ( html.length ) {
						pldiv.html(html);
					}
				}
				if ( opts.success ) { opts.success(response); }
				$(document).trigger('rplUpdateSuccess', {playlist: response.data.playlist  });
			},
			error: function(e) {
				if ( opts.error ) { opts.error(e); }
				debug('triggering rplUpdateFailure');
				$(document).trigger('rplUpdateFailure', response.request);
			}
		}); 
	};

  var rplDropRequestHandler = function ( pldiv ) {
    d10.bghttp.put({
      'url': site_url+'/api/plm/drop',
      'callback':'triggerEvent:rplDropResponse',
      'data': { 'playlist': pldiv.attr('name') },
      'dataType': 'json'
    });
  }

  var rplDropResponseHandler = function ( response ) {
//     debug(response);
    if ( response.status == 'success' && response.data.status == 'success' ) {
      $(document).trigger('rplDropSuccess', response.data.data);
    } else {
      $(document).trigger('rplDropFailure', response.request);
    }
  }

  var rplDropSuccessHandler = function ( response ) {
    $('.plm-list .plm-list-item[name='+response.playlist._id+']',mydiv).slideUp(function() {$(this).remove();});
    $('.plm-content-container .rpl[name='+response.playlist._id+']',mydiv).fadeOut(function() {$(this).remove();});
  }


  /**
   *
   *
   *Playlist renaming
   *
   *
   */


  var rplRenameRequestHandler = function ( pldiv, newname ) {
    d10.bghttp.put({
      'url': site_url+'/api/plm/rename',
      'callback':'triggerEvent:rplRenameResponse',
      'data': {'playlist': pldiv.attr('name'), 'name': newname},
      'dataType': 'json'
    });
  }

  var rplRenameResponseHandler = function ( response ) {
//    debug('rplRename response hander');
    if ( response.status == 'success' && response.data.status == 'success' ) {
      debug("triggering rplRenameSuccess");
      $(document).trigger('rplRenameSuccess', response.data.data);
    } else {
      debug("triggering rplRenameFailure");
      $(document).trigger('rplRenameFailure', response.request);
    }
  }

  var rplRenameSuccessHandler = function ( response ) {
    var item = $('.plm-list .plm-list-item[name='+response.playlist._id+']',mydiv);
    if ( item.length ) {
      item.html(response.playlist.name);
    }
  }
	

	this.append_song = function(song_id,playlist_id,opts) {
		opts = opts || {};
		d10.bghttp.put(
			{
				url: site_url+'/api/plm/append',
				data: {song: song_id, playlist: playlist_id}, 
				dataType: 'json',
				success: function(resp) {
					var playlistdiv=$('div[name=plm] .rpl[name='+resp.data.playlist._id+']',mydiv);
					if ( !playlistdiv.length )	return ;
					_appendSong (resp.data.song, playlistdiv, -1) ;
					if ( opts.success ) {
						opts.success.call(resp);
					}
					debug('trigger; rplAppendSuccess');
					$(document).trigger('rplAppendSuccess', { 'playlist': resp.data.playlist, 'song': resp.data.song, 'index': -1 });
				},
				error: function(e) {
					if ( opts.error ) {
						opts.error.call(e);
					}
					debug('trigger; rplAppendFailure');
					$(document).trigger('rplAppendFailure', e.request);
				}
			}
		);
	};

}



})(jQuery);
