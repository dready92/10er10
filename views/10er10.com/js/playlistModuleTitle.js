$(document).one("bootstrap:playlist",function() {
	var module = new d10.fn.playlistModule("title",{
		"playlist:currentSongChanged": function() {
			var s = d10.playlist.current();
			document.title = s.find(".title").text() + ' - '+ s.find(".artist").text();
		},
		"playlist:ended": function() {
			document.title = "10er10";
		}
	},{});

	d10.playlist.modules[module.name] = module;

});

