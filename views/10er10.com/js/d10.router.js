define(["js/d10.eventEmitter"],function(eventEmitter) {
	
	var 	routes = [],
			isRegExp = function(o) {
				return o && o.constructor.toString().indexOf('RegExp()') != -1 || false;
			},
			lastRoute = {path: null, segments: null},
			routeToRegExp = function(route){
				route = route.replace(escapeRegExp, "\\$&")
							.replace(namedParam, "([^\/]*)")
							.replace(splatParam, "(.*?)");
				return new RegExp('^' + route + '$');
			},
			getHash = function() {
				return window.location.href.replace(/^[^#]+/,"");
			},
			parseHash = function(hash) {
				hash = hash.replace(/^#/,"");
				return hash;
			},
			launchRoute = function(resp) {
				resp.route.callback.apply(router, resp.match.slice(1));
				emitter.trigger("route:"+resp.route.name);
				emitter.trigger("router",resp.match);
				lastRoute = {path: resp.path, segments: resp.match};
			},
			getRoute = function(path) {
				var test;
				for ( var i = 0, len = routes.length; i<len; i++ ) {
					test = path.match(routes[i].route)
					if ( test ) {
						return {match: test, route:routes[i], path: path};
					}
				}
				return false;
			},
			normalizeSegments = function(segments) {
				segments = segments || [], normalized =  [];
				if ( typeof segments == "string" ) {
					return segments;
				}
				for ( var i in segments ) {
					normalized.push(encodeURIComponent(segments[i]));
				}
				return normalized.join("/");
			},
			emitter = new eventEmitter()
		;
	// Cached regular expressions for matching named param parts and splatted
	// parts of route strings.
	var namedParam    = /:([\w\d]+)/g;
	var splatParam    = /\*([\w\d]+)/g;
	var escapeRegExp  = /[-[\]{}()+?.,\\^$|#\s]/g;
	var router = {
		route: function(route, name, callback) {
			if ( ! isRegExp(route) ) route = routeToRegExp(route);
			routes.push(
				{
					route: route,
					name: name,
					callback: callback
				}
			);
		},
		startRouting: function(startingPath) {
			var hash = getHash();
			var path = parseHash(hash);
			var selectedRoute = getRoute(path);
			if ( !selectedRoute ) {
				path = normalizeSegments(startingPath);
				selectedRoute = getRoute(path);
				if ( selectedRoute ) {
					window.location.hash = "#"+path;
				}
			}
			if ( selectedRoute ) {
				launchRoute(selectedRoute);
			}
			$(window).bind('hashchange', router.checkUrl);
			return selectedRoute ? path : false;
		},
		navigate: function(where) {
			window.location.hash = "#"+where;
		},
		checkUrl: function() {
			var hash = getHash();
			var path = parseHash(hash);
			if ( lastRoute.path == path ) {
				return ;
			}
			var selectedRoute = getRoute(path);
			if ( selectedRoute ) {
				launchRoute(selectedRoute);
			}
		},
		getLastRoute: function() {
			return lastRoute;
		}
	};
	

	$.extend(router, emitter, {
		_containers: {
			main: {tab: $("#container > nav"), container: $("#main"), select: function(name) { return $("#"+name) }, lastActive: null, currentActive: null}
		},
		switchContainer: function(from,to,tab,name) {
			if ( from ) from.hide().removeClass("active");
			if ( !to.hasClass("active") ) {
				to.fadeIn("fast").addClass("active");
				this.trigger("container:"+tab+"/"+name);
			}
		},
		_activate: function(tab, name, switchCallback) {
			switchCallback = switchCallback || this.switchContainer;
			if ( !this._containers[tab] ) {
				return this;
			}
			var currentActiveName = this.getActive(tab), currentActive = null, futureActive = this._containers[tab].select(name);
			
			if (  currentActiveName == name ) {
				return this;
			}
			if ( currentActiveName ) {
				currentActive = this._containers[tab].select(currentActiveName);
			}
			switchCallback.call(this,currentActive,futureActive,tab,name);
			this.switchTab(tab,name);
			this._containers[tab].lastActive = currentActiveName;
			this._containers[tab].currentActive = name;
			return this;
		},
		switchTab: function(tab,name) {
			var currentActive = this._containers[tab].tab.find(".active"), current = null;
			if ( currentActive.length ) {
				current = currentActive.attr("action");
				if ( current == name ) { return ; }
			}
			currentActive.removeClass("active");
			this._containers[tab].tab.find("[action="+name+"]").addClass("active");
			this.trigger("tab:"+tab+"/"+name);
		},
		navigateTo: function(segments) {
			return this.navigate(normalizeSegments(segments));
		},
		getActive: function(tab) {
			var active = this._containers[tab].tab.find(".active");
			if ( active.length ) {
				return active.eq(0).attr("action");
			}
			return null;
		},
	});
	/*
	
	d10.fn.tabSwitcher = function ( tabWidget, baseSegments, options ) {
		var settings = { 
			getTab: function(widget, segment) {return widget.find("[action="+segment+"]");},
			getSelectedTab: function(widget) {return widget.find(".active");},
			on: function(widget) {return widget.addClass("active");},
			off: function(widget) {return widget.removeClass("active");}
		},
		matchSegments = function(segments) {
			if ( !segments.length || segments.length <= baseSegments.length ) { return false; }
			if ( !baseSegments.length ) { return segments[0]; }
			for ( var i in baseSegments ) {
				if ( baseSegments[i] != segments[i] ) {
					return false;
				}
			}
			return segments[i+1];
		}
		;
		options = options || {};
		$.extend(settings,options);
		d10.router.bind("router",function(segments) {
			var sel = matchSegments(segments);
			if( !sel ) { return ; }
			var tab = settings.getTab(tabWidget, sel);
			if ( !tab.length ) { return ; }
			var activeTab = settings.getSelectedTab(tabWidget);
			if ( activeTab.length ) { settings.off(activeTab) ; }
			settings.on(tab);
		});
	};
	
	*/
	
	return router;
	
	
});
