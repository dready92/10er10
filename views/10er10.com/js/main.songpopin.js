"use strict";

define(["js/d10.imageUtils","js/d10.templates", "js/user", "js/my.plm", "js/d10.router", "js/playlist", "js/d10.events", "js/d10.rest", "js/osd"],
   function(imageUtils, tpl, user, plmanager, router, playlist, pubsub, rest, osd) {

   var getImage = function(song) {
       var images = song.attr("data-images");
       if ( images && images.length ) {
           var image = images.split(",").shift();
           return imageUtils.getImageUrl(image);
       } else {
           return imageUtils.getAlbumDefaultImage();
       }
   };

   var handleStarring = function ( type, id ) {
       rest.song.starring.set(id, type, {
           load: function(err,resp) {
               if ( !err ) {
                   user.refresh_infos(function() {
                       pubsub.topic('songStarring').publish(resp);
                   });
               }
           }
       });
   };

   var addEventsBinding = function(overlay, id, song) {
       var starUp = overlay.find("img[name=likes]"),
           starDown = overlay.find("img[name=dislikes]");

       var upref = user.get_preferences();
       if ( upref ) {
           if ( typeof(upref.likes) == 'undefined' || !upref.likes[id] ) {
               starUp.addClass('littletrans');
           }
           if ( typeof(upref.dislikes) == 'undefined' || !upref.dislikes[id] ) {
               starDown.addClass('littletrans');
           }
       }
       var starringUpdated = function (update_id,star) {
        if ( update_id != id ) return ;
        starUp.removeClass('littletrans');
        starDown.removeClass('littletrans');
        if ( star == null ) {
                starUp.addClass('littletrans');
                starDown.addClass('littletrans');
        } else if ( star == 'likes' ) {
                starDown.addClass('littletrans');
        } else if ( star == 'dislikes' ) {
                starUp.addClass('littletrans');
        }
      };
       starUp.click(function() {
//            overlay.ovlay().close();
           handleStarring('likes',id);
       });
       starDown.click(function() {
//            overlay.ovlay().close();
           handleStarring('dislikes',id);
       });
      pubsub.topic('songStarring').subscribe(function(resp) { 
        starringUpdated(resp.id, resp.star);
      });
       overlay.find("button[data-action=addToPlayer]").click(function() {
           overlay.ovlay().close();
           playlist.append(song.clone());
       });


       overlay.find("[data-action=libraryArtist]").click(function() {
           var name = $(this).attr("data-name");
           overlay.ovlay().close();
           router.navigateTo(["library","artists",name]);
       });
       overlay.find("[data-action=libraryAlbum]").click(function() {
           var name = $(this).attr("data-name");
           overlay.ovlay().close();
           router.navigateTo(["library","albums",name]);
       });
       overlay.find("[data-action=libraryGenre]").click(function() {
           var name = $(this).attr("data-name");
           overlay.ovlay().close();
           router.navigateTo(["library","genres",name]);
       });
       overlay.find("a[data-action=songDownload]").click(function() {
           overlay.ovlay().close();
       });

       overlay.find("button[data-action=editMeta]").click(function() {
           overlay.ovlay().close();
           router.navigateTo(["my","review",id]);
       });
       overlay.find("button[data-action=playlistChooser]").click(function() {
           overlay.find(".playlistsList").show();
           overlay.find(".sliderRibbon").animate({left: "-600px"},500);
       });

       overlay.find(".link[data-action=cancel]").click(function() {
           overlay.find(".sliderRibbon").animate({left: "0px"},300,function() {
               overlay.find(".playlistsList").hide();
           });

       });

       overlay.find(".playlistsList button[data-playlist-id]").click(function() {
           var playlist_id = $(this).attr("data-playlist-id");
           overlay.ovlay().close();
           plmanager.append_song(song.attr("name"),playlist_id);
       });

       overlay.find(".playlistsList button[data-action=toggleForm]").click(function() {
           $(this).closest("div[data-display]").toggleClass("opened");
       });

       overlay.find("button[data-action=playlistCreate]").click(function() {
           var playlistName=overlay.find("input[name=playlistName]").val();
           if ( !playlistName ) {
               osd.send("warning","Playlist name can't be empty");
               return false;
           }
           overlay.ovlay().close();
           var playlistId = user.getPlaylistId(playlistName);
//           debug("id: ",playlistId);

           if ( playlistId ) {
               plmanager.append_song(id, playlistId,{});
           } else {
               plmanager.create_playlist(playlistName, {
                       noDisplay: true,
                       songs: [id]
                   }
               );
           }



           return false;
       });
   };

   var buildTemplateData = function(song, id) {
       var templateData = {};

       templateData.image_url = getImage(song);
       templateData.playlists = user.get_playlists();
       templateData.id        = id;
       templateData.title     = song.find(".title").html();
       templateData.artist    = song.find(".artist").html();
       templateData.genre     = song.attr("data-genre");
       var album = song.find(".album").html();
       if ( album && album.length ) {
           templateData.album = [album];
       }
       var date = song.attr("data-date");
       if ( date && !isNaN(date) && date > 0 ) {
           templateData.date = [date];
       }

       if ( song.attr("data-owner") || user.is_superman() ) {
           templateData.editButton=[true];
       }
        return templateData;
   };

   var buildContentMain = function(plus, song, id) {
       var templateData = buildTemplateData(song, id);
       templateData.addToPlayer = [true];
       var overlay = $(tpl.mustacheView("hoverbox.main.songpopin",templateData))
           .css({visibility: "hidden"})
           .addClass("leftArrow")
           .appendTo($("body"));

       addEventsBinding(overlay,id, song);

       overlay.ovlay(
           {
               closeOnClick: true,
               closeOnMouseOut: false,
               closeOnEsc: true,
               align:{position: "right", reference: plus, leftOffset: 9, topOffset: 4},
               onClose: function() {
                   overlay.remove();
               },
               effect: {
                   show: function(then) {
                       overlay.css("display","block").addClass("opened");
                       setTimeout(then, 200);
                   },
                   hide: function(then) {
                       overlay.removeClass("opened");
                       setTimeout(then, 200);
                   }
               }
           }
       );
   };

   var buildContentPlaylist = function(plus, song, id) {
       var templateData = buildTemplateData(song, id);

       if ( song.nextAll().not(".current").length > 0 ) {
           templateData.removeAllNext = [true];
       }
       if ( song.prevAll().not(".current").length > 0 ) {
           templateData.removeAllPrevious = [true];
       }

       var overlay = $(tpl.mustacheView("hoverbox.main.songpopin",templateData))
           .css({visibility: "hidden"})
           .addClass("rightArrow")
           .appendTo($("body"));

       addEventsBinding(overlay,id, song);

       overlay.find("button[data-action=removeAllNext]").click(function() {
           overlay.ovlay().close();
           playlist.remove(song.nextAll().not(".current"));
       });

       overlay.find("button[data-action=removeAllPrevious]").click(function() {
           overlay.ovlay().close();
           playlist.remove(song.prevAll().not(".current"));
       });

       overlay.ovlay(
           {
               closeOnClick: true,
               closeOnMouseOut: false,
               closeOnEsc: true,
               align:{position: "left", reference: plus, leftOffset: -11, topOffset: 5},
               onClose: function() {
                   overlay.remove();
               },
               effect: {
                   show: function(then) {
                       overlay.css("display","block").addClass("opened");
                       setTimeout(then, 200);
                   },
                   hide: function(then) {
                       overlay.removeClass("opened");
                       setTimeout(then, 200);
                   }
               }
           }
       );
   };

  $("#main").delegate('.song .add','click',function  (e) {
	var plus = $(this).find("img");
	var song = $(this).closest('.song');
	var id=song.attr('name');

    buildContentMain(plus, song, id);
	return false;
  });

  playlist.songsList().delegate("div.song span.options","click", function() {
      //var plus = $(this).find("img");
      var song = $(this).closest('.song');
      var id=song.attr('name');

      buildContentPlaylist(song, song, id);
      return false;
  });

});
