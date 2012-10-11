define(["js/d10.templates", "js/d10.events"], function(tpl, pubsub) {

	function osd () {
		var ui = function () { return $('#osd'); };
		var default_width = 600;
		var display_length = 4000;

		pubsub.topic('rplDropSuccess').subscribe(function(playlist) {
			send('info', tpl.mustacheView("osd.rpl.success.removed",{name: playlist.name}) );
		});
		pubsub.topic('rplCreationSuccess').subscribe(function(data) {
	// 		debug("in osd",data);
			send('info',tpl.mustacheView("osd.rpl.success.created",{name: data.playlist.name}));
		});
		pubsub.topic('rplAppendSuccess').subscribe(function(data) {
			send('info',tpl.mustacheView("osd.rpl.success.updated",{name: data.playlist.name}));
		});
		pubsub.topic('rplUpdateSuccess').subscribe(function(data) {
			send('info',tpl.mustacheView("osd.rpl.success.updated",{name: data.playlist.name}));
		});
		pubsub.topic('rplRenameSuccess').subscribe(function(playlist) {
			send('info',tpl.mustacheView("osd.rpl.success.renamed",{name: playlist.name}));
		});




		var send = function (type,message) {
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

	var o = new osd();
	return o;


});
