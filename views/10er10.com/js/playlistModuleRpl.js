$(document).one("bootstrap:playlist",function() {

	var module = new d10.fn.playlistModule("rpl",{},{});
	
	var loadPlm = function (id) {
		var driver = d10.playlist.loadDriver("rpl",{},{rpl: id},function(err,resp) {
			if ( err )	{
				debug("playlistModuleRpl:loadDriver error",err);
				return ;
			}
			debug("playlistModuleRpl:callback empty()");
			d10.playlist.empty();
			debug("playlistModuleRpl:callback append()");
			d10.playlist.append(resp);
			debug("playlistModuleRpl:callback setDriver()",driver);
			d10.playlist.setDriver(driver);
		});
	};
	
	this.handleSaveClick = function () {
		
		d10.playlist.container().find("div.container").slideDown("fast");
		d10.playlist.container().find("div.saveplaylist").slideUp("fast");
		
		d10.playlist.container().find("div.saveplaylist input[type=text]").val('').focus(function() {
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
	
	
	var loadOverlay = function(e) {
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
// 			var opts = {"url": site_url+"/api/plm/"+$(this).attr('name'),"dataType": "json", "success": loadPlm };
// 			d10.bghttp.get ( opts );
			loadPlm($(this).attr('name'));
			d10.playlist.container().find("div.manager button[name=load]").one('click',loadOverlay);
			$(this).closest('.overlay').ovlay().close();
		});
		//     .appendTo("body")
		elem.ovlay({"onClose":function() {this.getOverlay().remove();} });
		//     elem.fadeIn('fast');
			
	};
	debug("playlistModuleRpl button:",d10.playlist.container().find("div.manager button[name=load]"));
	d10.playlist.container().find("div.manager button[name=load]").one("click",loadOverlay);
	

	d10.playlist.modules[module.name] = module;

});

