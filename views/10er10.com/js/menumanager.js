(function($){

/*

 options :


	'menu': jQuery : menu container
	'container': jQuery : content container
	'active_class' : the CSS class to set on menu elements when active
	'default_active_label' : to fire up a label on init
	'effect': enable effects
*/


d10.fn.menuManager = function ( settings ) {// menu_arg, container_arg, active_class_arg, default_active_label_arg ) {
	var that = this;
	
	
	
	var switchLabel = function (label,arg,active){
		var menuitem = $('*[action='+label+']',options.menu);
		// show the right div
		if ( options.effects ) {
			var inSpeed = options.inSpeed;
			if ( !active ) {
				if ( menuitem.attr("data-mm-in-effect") == "fadeIn" ) {
					this.getContainer(label).fadeIn(inSpeed);
				} else {
					this.getContainer(label).slideDown(inSpeed);
				}
			} else {
				var labelContainer = this.getContainer(label);
				this.getContainer(active).fadeOut(options.outSpeed,function() {
					$(this).hide();
					if ( menuitem.attr("data-mm-in-effect") == "fadeIn" ) {
						labelContainer.fadeIn(inSpeed);
					} else {
						labelContainer.slideDown(inSpeed);
					}
				});
				//menubar
				this.current_menuitem().removeClass(options.active_class);
			}
		} else {
			//                debug("effects disabled");
			if ( active ) {
				this.getContainer(active).hide();
				//menubar
				this.current_menuitem().removeClass(options.active_class);
			}
			this.getContainer(label).show();
		}

		// set the active class on menuitem
		menuitem.addClass(options.active_class);
	};

	var options = {
		'property': 'id',
		'displayEvent' : function (label,arg) {
			$(document).trigger('menuClick', { 'label': label, 'arg': arg });
		},
		'outSpeed': 'def',
		'inSpeed': 'def',
		'effects': true,
		'displayAlreadyActive': function (label,arg) {},
		'displayActivate' : switchLabel,
		'rootRouteHandler': false,
		"routePrepend": [],
		"routeActivate": function(label,segments,settings) {
			switchLabel.call(that,label, null, that.current_label());
		},
		"routeAlreadyActive": function(){}
	};
	
	options = $.extend(options,settings);
	

	options.menu.bind('click', function (e) {
		var menuItem = $(e.target).closest('*[action]');
		if ( !menuItem.length ) {
			return ;
		}
		if ( menuItem.hasClass(options.active_class) && menuItem.attr("data-no-active-click") ) {
			return ;
		}
		label = menuItem.attr('action');
		var newRoute = options.routePrepend.slice(0);
		newRoute.push(label);
		var url = "#" + d10.routeEncode(newRoute) ;
		window.location.hash = url;
	});


	//
	//
	// this is bind/trigger implementation
	//
	//
	var matchTrigger = function (name, trigger) {
		var classes = name.replace(/^\s+/,"").replace(/\s+$/,"").split(".");
		name = classes.shift();
		if ( !name )  return false;
		var selectors = trigger.selector.replace(/^\s+/,"").replace(/\s+$/,"").split(" ");
	//     var match = {"name": [], "classes": [] };
		for (var index in selectors) {
		var current = selectors[index].replace(/^\s+/,"").replace(/\s+$/,"").split(".");
		if ( !current.length || current[0] != name && current[0].length > 0 ) {
			continue;
		}
		if ( current.length == 1 ) {
			return true;
		}
		current.shift();
		var ok = true;
		for ( var i in current ) {
			if ( classes.indexOf(current[i]) < 0 ) {
				ok = false;
			}
		}
		if ( !ok )  continue;
		return true;
		}
	};
  
	var triggers = [];
	this.trigger = function ( name, data ) {
		for ( var index in triggers ) {
		if ( matchTrigger(name, triggers[index]) ) {
			triggers[index].callback.call(options.container,{"type": name},data);
		}
		}
	};
  
	this.bind = function( evts, callback )  {
		triggers.push({ "selector": evts, "callback": callback  });
	};

	this.unbind = function ( evts ) {
		var nt = [];
		for ( var index in triggers ) {
			if ( !matchTrigger(name, triggers[index]) ) {
				nt.push(triggers[index]);
			}
		}
		triggers = nt;
	};
	
	this.current_label = function() {
		var back = this.current_menuitem();
		if ( !back )	return false;
		return back.attr('action');
	}

	this.current_menuitem = function() {
		var back = $('*.'+options.active_class,options.menu);
		if ( back.length == 0 )	return false;
		return back;
	}

	this.menuitem = function(label) {
		return $('*[action='+label+']',options.menu);
	};

	this.getContainer = function(label) {
		if ( options.property == 'id' )
			return $('#'+label,options.container);
		else	{
			return $('> *['+options.property+'='+label+']',options.container);
		}
	}
/*
	this.toggleDisplay = function (label, arg ) {
// 		debug("toggleDisplay: "+label);
		if ( typeof label != 'string' ) {
			return false;
		}

		var menuitem = $('*[action='+label+']',options.menu);
		var containeritem = this.getContainer(label);

		//send the event
		options.displayEvent.call(this,label,arg);

		//find active label
		var active = this.current_label();
		if ( active == label )	{// label is already active
// 		debug ("label "+label+" is already active");
			options.displayAlreadyActive.call(this,label,arg);
		} else {
// 			debug ("label is "+active+", should set to "+label);
			options.displayActivate.call(this,label,arg,active);
		}
	};

*/
	this.route = function (route, opts) {
// 		debug("route request",route,opts);
		var settings = {"originalRoute": null, "rootLabel": null};
		opts = opts || {};
		$.extend(settings,opts);
		var active = this.current_label();
		var segments = d10.routeDecode(route);
		debug("route segments",segments);
		var label = segments.shift();
		var menuitem = $('*[action='+label+']',options.menu);
		if ( !menuitem.length ) {
// 			debug("route : label ",label," unknown");
			return false;
		}

		if ( !settings.originalRoute ) {
			settings.originalRoute = route;
			settings.rootLabel = label;
		}
		var event = options.rootRouteHandler ? "route." : "subroute." ;
		event += label;
		debug("menumanager triggering event ",event,options);
		if ( options.rootRouteHandler ) {
			$(document).trigger( event , {"route": route, "label": label, "segments": segments, "active": active == label , "env": settings });
			var url = "#"+d10.routeEncode(route);
			this.updateHash(url);
		} else {
	       debug("triggering container event on ",options.container );
			this.trigger( event , {"route": route, "label": label, "segments": segments, "active": active == label , "env": settings });
		}


		if ( active == label )	{ options.routeAlreadyActive(label, segments, settings); } 
		else { options.routeActivate(label,segments,settings); }
	};

	if ( options.default_active_label && typeof options.default_active_label == 'string' ) {
// 		this.toggleDisplay(options.default_active_label);
		
		var menuitem = $('*[action='+options.default_active_label+']',options.menu);
		var containeritem = this.getContainer(options.default_active_label);
		
		//send the event
		options.displayEvent.call(this,options.default_active_label);
		
		//find active label
		var active = this.current_label();
		if ( active == options.default_active_label )	{// label is already active
			// 		debug ("label "+label+" is already active");
			options.displayAlreadyActive.call(this,options.default_active_label);
		} else {
			// 			debug ("label is "+active+", should set to "+label);
			options.displayActivate.call(this,options.default_active_label,null,active);
		}
	}


	if ( options.rootRouteHandler ) {
		var externHashChange = true;
		this.updateHash = function (url) {
			externHashChange = false;
			location.hash = url;
			externHashChange = true;
		};
		window.onhashchange = function () {
			if ( externHashChange ) { that.route( location.href.split("#")[1] || "" ); }
		};
	}


}

})(jQuery);