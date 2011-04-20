$(document).one("bootstrap:playlist",function() {


	var module = new d10.fn.playlistModule("fade",{},{});
	
	var ui = $("#controls div.audioFade");
	ui.find("input").val( $("body").data("audioFade") );
	ui.find("span.fadeValue").html( $("body").data("audioFade") );

	ui.find("input").bind("input",function() {
		var input = $(this);
		debug("audioFade input : "+input.val());
		var fade = parseInt(input.val(),10);
		if ( isNaN(fade) ) {
			return ;
		}
		debug("setting audioFade to ",fade);
		$("body").data("audioFade",fade);
		ui.find("span.fadeValue").html( fade );
	});
	
});




