define(["js/domReady","js/d10.playlistModule", "js/playlist.new", "js/user", "js/d10.templates", "js/plm"], 
	   function(foo, playlistModule, playlist, user, tpl, plmanager) {

	var module = new playlistModule("rpl",{},{});
	
	var loadPlm = function (id) {
		debug("playlistModuleRpl:callback empty()");
		playlist.empty();
		playlist.loadDriver("rpl",{},{rpl: id},function(err,resp) {
			if ( err )	{
				debug("playlistModuleRpl:loadDriver error",err);
				return ;
			}
			debug("playlistModuleRpl:callback append()");
			playlist.append(resp);

			debug("playlistModuleRpl:callback setDriver()",this);
			playlist.setDriver(this);
		});
	};

	var loadOverlay = function(e) {
// 		var elem = $('<div class="hoverbox overlay"><div class="part">Charger...</div></div>');
		playlists = user.get_playlists();
		if ( !playlists.length ) {
			return false;
		}
// 		for ( var index in playlists ) {
// 			var tt = $('<div class="clickable"></div>');
// 			tt.attr("name",playlists[index]._id).html(playlists[index].name);
// 			elem.append(tt);
// 		}
		elem = $( tpl.mustacheView("hoverbox.playlist.rpl.container",{rpl: playlists}) );

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
		.find('.clickable')
		.click(function() {
			loadPlm($(this).attr('name'));
			$(this).closest('.overlay').ovlay().close();
		});
		elem.ovlay({"onClose":function() {this.getOverlay().remove();} });
			
	};
	playlist.container().find("div.manager button[name=load]").bind("click",loadOverlay);










	var handleSaveClick = function () {
		
		playlist.container().find("div.manager").slideUp("fast");
		playlist.container().find("div.saveplaylist").slideDown("fast");
		
		playlist.container().find("div.saveplaylist input[type=text]").val('').focus(function() {
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

	playlist.container().find(".saveplaylist input").keypress(function(e) {
		if ( e.keyCode == 13 ) { playlist.container().find(".saveplaylist button").click(); }
	});
	
	playlist.container().find(".saveplaylist span.link").click(function() {
		playlist.container().find(".saveplaylist").slideUp('fast');
		playlist.container().find(".manager").slideDown('fast');
	});
	
	playlist.container().find(".saveplaylist button").click(function() {
		var container = playlist.container().find('.saveplaylist');
		if ( !$('input[type=text]',container).val().length ||
			$('input[type=text]',container).val() == $('input[type=text]',container).attr('defaultvalue') ) {
			$('span.link',container).trigger('click');
			return ;
		}
		container.slideUp("fast");
		if ( user.playlist_exists($('input[type=text]',container).val()) )  {
			playlist.container().find(".updateplaylist").slideDown("fast");
		} else {
			recordRpl($('input[type=text]',container).val());
		}
	});

	var recordRpl = function (name)  {
		plmanager.create_playlist(name, {
				songs: playlist.allIds(),
				success: function(resp) {
					debug("playlistModuleRpl:recordRpl:success resp: ",resp);
    			    $('aside .manager').slideDown();
    			    playlist.loadDriver("rpl",{},{rpldoc: resp},function() {
    					debug("playlistModuleRpl:recordRpl:success setDriver: ",this);
						playlist.setDriver(this);
					});
				},
				error: function() {
			      $('aside .manager').slideDown();		
				}
			}
		);
	};

	playlist.container().find(".updateplaylist button").click(function() {
		playlist.container().find(".updateplaylist").slideUp("fast");
		var pl = user.get_playlists();
		var name = playlist.container().find('.saveplaylist input[type=text]').val();
		for ( var index in pl ) {
			if ( pl[index].name == name ) {
				updateRpl(name,pl[index]._id);
				return false;
			}
		}
		playlist.container().find(".manager").slideDown('fast');
		return false;
	});

	playlist.container().find('.updateplaylist span.link').click(function(){
		playlist.container().find(".updateplaylist").slideUp("fast");
		playlist.container().find(".saveplaylist").slideDown("fast");
	});

	var updateRpl = function (name,id)  {
		playlist.title(name);
		plmanager.replace_playlist(id, playlist.allIds(),{
			success: function(resp) {
   			    $('aside .manager').slideDown();
				playlist.loadDriver("rpl",{},{rpldoc: resp.data.playlist},function() {
					playlist.setDriver(this);
				});
			}
		});
  }


	playlist.container().find("div.manager button[name=save]").click(handleSaveClick);





	//listen changes from plm module to know if we are still in sync
	
	$(document).bind("rplDropSuccess",function(e,data) {
		if ( !module.isEnabled() )	return ;
		if ( playlist.driver() && playlist.driver().playlistId ) {
			var id = playlist.driver().playlistId();
			if ( id && id.substr(0,2) == "pl" && id == data._id ) {
				playlist.loadDriver ("default",{}, {}, function() {playlist.setDriver(this);} );
					debug("playlistModuleRpl setting default driver");
					
			}
		}
	});




	playlist.modules[module.name] = module;
	return module;
});

