define(["js/d10.templates", "js/d10.rest", "js/d10.router", "js/d10.dataParsers", "js/d10.toolbox", "js/playlist", "js/d10.albumCoverUploader"],
       function(tpl, rest, router, dataParsers, toolbox, playlist, albumCoverUploader) {
  
  "use strict";
  
  var getAlbum = function(album, then) {
	rest.album.get(album,
	  {
		load: then
	  }
	);
  };

  var getTemplateData = function(album, then) {
	var template_data = {album: album, songs:""};
	getAlbum(album, function(err,resp) {
	  if ( err ) {
		return then(template_data);
	  }
	  template_data = dataParsers.singleAlbumParser(resp);
	  then(template_data);
	});
  };
  
  var addExtendedData = function(artists, template) {

    if ( !artists ) return;
    var artistsTemplate = $(tpl.mustacheView("library.content.album.artists",{artists: artists}));
    artistsTemplate.find(".artistLink").click(function() {
        router.navigateTo("library/artists/"+$(this).attr("name"));
      });
    template.find(".relatedArtists").html(artistsTemplate);
  };
  
  var onContainerCreation = function(topicdiv, categorydiv, topic, category, param) {
	getTemplateData(category, function(template_data) {
      if ( template_data.image_alternatives && template_data.image_alternatives[200] ) {
        template_data.image_url = template_data.image_alternatives[200];
        template_data.layoutClass = "mediumImage";
      }
	  var template = $(tpl.mustacheView("library.content.album",template_data));
	  addExtendedData(template_data.artists,template);
	  template.find("span[name=all]").click(function() {
		router.navigateTo(["library","albums", "<all>"]);
	  });
	  template.find("span[name=covers]").click(function() {
		router.navigateTo(["library","albums", "<covers>"]);
	  });
	  template.find("button[name=load]").click(function() {
		var songs = $(this).closest(".oneAlbumRow").find("div.song").clone();
		playlist.append(songs);
	  });
	  template.find("span.refresh").click(function(){ 
		onContainerCreation(topicdiv, categorydiv, topic, category, param);
	  });
      albumCoverUploader.setListeners(template, function(widget) {
        return widget.closest(".oneAlbumRow").find(".list .song").map(function(k,v) { return $(this).attr("name"); }).get();
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