define(["js/domReady","js/d10.playlistModule", "js/playlist.new"], function(foo, playlistModule, playlist) {
	var module = new playlistModule("title",{
		"playlist:currentSongChanged": function() {
			var s = playlist.current();
			document.title = s.find(".title").text() + ' - '+ s.find(".artist").text();
		},
		"playlist:ended": function() {
			document.title = "10er10";
		}
	},{});

	playlist.modules[module.name] = module;
	return module;
});

