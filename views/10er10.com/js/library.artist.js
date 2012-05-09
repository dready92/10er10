define(["js/d10.templates", "js/d10.rest", "js/d10.router", "js/d10.dataParsers", "js/d10.toolbox", "js/playlist"],
       function(tpl, rest, router, dataParsers, toolbox, playlist) {
  
  "use strict";
  var getRelatedArtists = function(artist, template) {
    rest.artist.related(artist,{
      load: function(err, data) {
        if ( err ) { return ; }
        var template_data = {artist: artist, artists: [], moreArtistsLink: [], moreArtists: []}, sorted = [], source, initialDisplayCount = 10;
        if ( toolbox.count(data.artistsRelated) ) {
            source = data.artistsRelated;
        } else {
            source = data.artists;
        }
        for ( var i in source ) {
            var currentArtist = { artist: i, weight: source[i] },
                added = false;
            
            for (var j in sorted ) {
                if ( sorted[j].weight < currentArtist.weight ) {
                    sorted.splice(j,0,currentArtist);
                    added = true;
                    break;
                }
            }
            if ( !added ) { sorted.push(currentArtist); }
        }
        if ( !sorted.length ) {
          return ;
        }
        
        for ( var  i in sorted ) {
          var artistFragment = {artist: sorted[i].artist, artist_e: sorted[i].artist.replace("\"","&quot;")};
          if ( i < initialDisplayCount ) {
            template_data.artists.push( artistFragment );
          } else {
            template_data.moreArtists.push( artistFragment );
          }
        }
        if ( i >= initialDisplayCount ) {
          template_data.moreArtistsLink.push(true);
        }
        var artistTemplate = $(tpl.mustacheView("library.content.artist.related", template_data));
        artistTemplate.find(".moreLink").click(function() {
          $(this).remove();
          artistTemplate.find(".link.hidden").fadeIn();
        });
        artistTemplate.find(".artistLink").click(function() {
          router.navigateTo(["library","artists",$(this).attr("name")]);
        });
        template.find(".relatedArtists").append(artistTemplate);
      }
    });
  };
         
         
  var bindEvents = function(template, topicdiv, categorydiv, topic, category, param) {
    template.find("span[name=all]").click(function(){ router.navigateTo(["library","artists","<all>"]); });
    template.find("span.refresh").click(function(){ 
      onContainerCreation(topicdiv, categorydiv, topic, category, param);
    });
    template.find("button[name=see]").click(function() {
      router.navigateTo(["library","albums",$(this).attr("data-album")]);
    });
    template.find("button[name=load]").click(function() {
      var songs = $(this).closest(".oneAlbumRow").find("div.song").clone();
      playlist.append(songs);
    });
  };
  
  var onRoute = function(topicdiv, categorydiv, topic, category, param) {};
  
  var onContainerCreation = function(topicdiv, categorydiv, topic, category, param) {
    
    categorydiv.html(tpl.mustacheView("loading",{}));
    
    var restResponsesCount = 0;
    var responses = {hits:null, all: null};
    
    var onRestResponse = function(key, data) {
      restResponsesCount++;
      responses[key] = data;
      if ( restResponsesCount == 2 ) {
        if ( responses.all == null ) {
          return debug("libraryArtist error", category);
        }
        responses.all.hits = responses.hits;
        delete responses.hits;
        var template = $(tpl.mustacheView("library.content.artist",responses.all));
        categorydiv.html(template);
        bindEvents(template, topicdiv, categorydiv, topic, category, param);
        getRelatedArtists(category,template);
      }
    };
    
    var parseAlbumSongs = function(all) {
      var template_data = { no_album: [], albums: []  };
      var parsed = dataParsers.multiAlbumsParser(all);
      parsed.sort(function(a,b) {
        var datea = a.date.length ? a.date[ (a.date.length -1) ] : 0;
        var dateb = b.date.length ? b.date[ (b.date.length -1) ] : 0;
        return dateb - datea;
      });
      parsed.forEach(function(album) {
        if ( album.album.length ) {
          album.album_e = album.album.replace("\"","&quot;");
          template_data.albums.push(album);
        } else {
          template_data.no_album.push(album);
        }
      });
      return template_data;
    };
    
    rest.artist.songHits(category, {
      load: function(err,resp) {
        if ( err ) {
          return onRestResponse("hits", []);
        }
        if ( !resp.length ) {
          return onRestResponse("hits", []);;
        }
        var html = '';
        var songCount = 0;
        resp.forEach(function(row) {
          if ( songCount>=15 ) {
            return ;
          }
          html+=tpl.song_template(row.doc);
          songCount++;
        });
        onRestResponse("hits", [html]);
      }
    });
    
    rest.artist.songsByAlbum(category, {
      load: function(err,resp) {
        if ( err ) {
          return onRestResponse("all",null);
        }
        var template_data = parseAlbumSongs(resp);
        template_data.artist = category;
        onRestResponse("all", template_data);
      }
    });
    
    
  };
  
  return {
    onContainerCreation: onContainerCreation,
    onRoute: onRoute
  };
});