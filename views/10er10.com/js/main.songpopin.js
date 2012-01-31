"use strict";

define(["js/d10.imageUtils","js/d10.templates"],function(imageUtils, tpl) {
  $("#main").delegate('.song .add','click',function  (e) {
	var plus = $(this).find("img");
	var song = $(this).closest('.song');
	var id=song.attr('name');
	var templateData = {};
	
	
// 	var leftSide = $("<div style=\"float: left; width: 200px; height: 200px; overflow: hidden; border-right: 1px solid white\"></div>");
	var getImage = function(song) {
	  var images = song.attr("data-images");
	  if ( images && images.length ) {
		  var image = images.split(",").shift();
		  return imageUtils.getImageUrl(image);
	  } else {
		  return imageUtils.getAlbumDefaultImage();
	  }
	};
	
	templateData.image_url = getImage(song);
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
	
// 	leftSide.append($("<div></div>").append(getImage(song)));
// 	leftSide.append("<div><span style=\"padding: 5px; vertical-align: top\">"+song.find(".title").html()+"</span></div>");
// 	overlay.append(leftSide);

	var overlay = $(tpl.mustacheView("hoverbox.main.songpopin",templateData));
	overlay.ovlay(
	  {
		closeOnClick: true, 
		closeOnMouseOut: false, 
		closeOnEsc: true, 
		align:{position: "right", reference: plus, leftOffset: 9}
	  }
	);
	
	return false;
  });
});
