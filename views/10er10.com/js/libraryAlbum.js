define(["js/d10.templates", "js/d10.rest", "js/d10.router", "js/d10.dataParsers", "js/d10.utils", "js/playlist.new"],
       function(tpl, rest, router, dataParsers, toolbox, playlist) {
  
  "use strict";
  

  var getAlbumArtists = function(album, then) {
	rest.album.artists(album,{
		load: function(err, data) {
			debug(err,data);
			if ( err ) { return then(); }
			var back = [];
			for ( var i in data ) {
				back.push({artist: data[i].key[1], artist_e: data[i].key[1].replace('"','&quot;') });
			}
			if ( back.length == 1 ) {
				return then();
			}
// 			debug(back);
			return then(back);
		}
	});
  };

  var getSongs = function(album, then) {
	rest.song.list.albums(
	  {
		album: album,
		full: true
	  },
	  {
		load: then
	  }
	);
  };

  var getTemplateData = function(album, then) {
	var template_data = {album: album, songs:""};
	getSongs(album, function(err,resp) {
// 	  debug("album getSongs: ",resp);
	  if ( err ) {
		return then(template_data);
	  }
	  template_data = dataParsers.singleAlbumParser(resp);
	  debug("album template_data: ",template_data);
	  then(template_data);
	});
  };
  
  var addExtendedData = function(album, template) {
	getAlbumArtists(album,function(artists) {
	  if ( !artists ) return;
	  var artistsTemplate = $(tpl.mustacheView("library.content.album.artists",{artists: artists}));
	  debug(artistsTemplate);
	  artistsTemplate.find(".artistLink").click(function() {
          router.navigateTo(["library","artists",$(this).attr("name")]);
        });
	  template.find(".relatedArtists").html(artistsTemplate);
	});
  };
  
  var onContainerCreation = function(topicdiv, categorydiv, topic, category, param) {
	getTemplateData(category, function(template_data) {
	  var template = $(tpl.mustacheView("library.content.album",template_data));
	  addExtendedData(category,template);
	  template.find("span[name=all]").click(function() {
		router.navigateTo(["library","albums", "<all>"]);
	  });
	  template.find("button[name=load]").click(function() {
		var songs = $(this).closest(".oneAlbumRow").find("div.song").clone();
		playlist.append(songs);
	  });
	  template.find("span.refresh").click(function(){ 
		onContainerCreation(topicdiv, categorydiv, topic, category, param);
	  });
	  categorydiv.html(template);
	});
  };

  
  var onRoute = function(){};

  return {
    onContainerCreation: onContainerCreation,
    onRoute: onRoute
  };

});