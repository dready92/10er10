define(["js/domReady","js/d10.playlistModule", "js/playlist.new"], function(foo, playlistModule, playlist) {

	if ( $("html").hasClass("csstransforms") ) {
		var module = new playlistModule("highlight",{
			"playlistUpdate": function() {
				var ui = playlist.container();
				ui.one("transitionend webkitTransitionEnd",function() {
// 					debug("got transitionend");
					ui.unbind("transitionend webkitTransitionEnd");
					ui.removeClass("highlighted");
				});
				ui.addClass("highlighted");
			}
		},{});

		playlist.modules[module.name] = module;
		return module;
	}
});

/*
.animhighlight {  
    -webkit-animation-duration: 0.3s;
    -webkit-animation-name: tester;  
    -webkit-animation-direction: alternate;
    -webkit-animation-iteration-count: 2;
}  
    
  @-webkit-keyframes tester {  
    from {  
      box-shadow: inset 0 0 0 0 rgba(8, 111, 161, 0);
    }  
      
    to {  
      box-shadow: inset 0 0 0 300px rgba(8, 111, 161, 0.6);
    }  
  }  
*/