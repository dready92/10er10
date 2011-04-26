(function($){

function osd () {
	var ui = function () { return $('#osd'); };
	var default_width = 600;
	var display_length = 4000;

	$(document).bind('rplDropSuccess',function(e,data) {
		send('info',"Playlist <b>"+data.playlist.name+"</b> effacée.");
	});
	$(document).bind('rplCreationSuccess',function(e,data) {
		debug("in osd",data);
		send('info',"Playlist <b>"+data.playlist.name+"</b> créée.");
	});
	$(document).bind('rplAppendSuccess',function(e,data) {
		send('info',"Playlist <b>"+data.playlist.name+"</b> mise à jour.");
	});
	$(document).bind('rplUpdateSuccess',function(e,data) {
		send('info',"Playlist <b>"+data.playlist.name+"</b> mise à jour.");
	});
	$(document).bind('rplRenameSuccess',function(e,data) {
		send('info',"Playlist <b>"+data.playlist.name+"</b> renommée.");
	});











	var send = function (type,message) {
	//     console.log("OSD send method begins : ",type,message);
		var w_width = $(document).width();
		var width = default_width;
		if ( w_width < default_width ) {
			width = w_width;
		}
		var left = (w_width - width) / 2;
		left = Math.ceil(left);
		ui().css({
		'width': width+'px',
		'left' : left+'px',
		'top'  : '0px'
		});
		if ( type != 'error' && type != 'warning' ) {
			type='info';
		}
		var thediv = $('<div></div>');
		if ( typeof message == 'object' ) {
			thediv.append(message);
		} else {
			thediv.html(message);
		}
		thediv.addClass(type).hide().appendTo(ui()).slideDown(function(){
			setTimeout(function () {thediv.slideUp(function() {$(this).remove();});},display_length );
		}); 
	}

	this.send = send;

}

d10.osd = new osd();

delete osd;

})(jQuery);