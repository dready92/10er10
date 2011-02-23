(function($){

var module = {
	name: "title",
	events: {
		currentSongChanged: function() {
			var s = d10.playlist.current();
			document.title = s.find(".title").text() + ' - '+ s.find(".artist",).text();
		},
		ended: function() {
			document.title = "10er10";
		}
	},
	enable: function() {},
	disable: function(){}
};


d10.fn.playlistModules = d10.fn.playlistModules || {};
d10.fn.playlistModules.title = function()  {
        return module;
};

})(jQuery);
