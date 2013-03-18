define(["js/domReady","js/d10.playlistModule", "js/playlist"], function(foo, playlistModule, playlist) {
	var widget= $("#player .mainScreen");
    var titleWidget = widget.find(".songTitle");
    var artistWidget = widget.find(".songArtist");
    var albumWidget = widget.find(".songAlbum");
	var updatePlayingHeader = function (song) {
		if ( !song ) {
// 		  widget.fadeOut("fast");
          titleWidget.empty();
          artistWidget.empty();
          albumWidget.empty();
		  return ;
		}
		debug("topInfos: ", titleWidget, artistWidget);
		titleWidget.html(song.find(".title").html());
        artistWidget.html(song.find(".artist").html());
        var album = song.find(".album").html();
        if ( album ) {
          albumWidget.insertAfter(artistWidget);
        } else {
          albumWidget.detach();
        }
        albumWidget.html(album);
        return ;
	  };

	var module = new playlistModule("topinfos",{
			"playlist:currentSongChanged": function() {
				updatePlayingHeader(playlist.current());
			},
			"playlist:ended": function() {
				updatePlayingHeader();
			}
		},{});

	playlist.modules[module.name] = module;
	return module;
});
