$(document).ready(function() {
	$("#container > nav ul").append('<li action="admin"><div><img src="css/22x22/categories/system-help.png" class="middle"> Admin</div><div>Interface d\'admin</div></li>');
	var ui = $('<div id="admin"><nav><ul class="nomark"><li action="users">Users</li></ul></nav></div>');
	$("#main").append(ui);
	
	var templatesLoaded = false;
	var templates = {};
	
	var getTopicUi = function(topic) {
		var tui = $("div[name="+topic+"]",ui);
		if ( tui.length )	return tui;
		tui = $("<div name=\""+topic+"\"></div>");
		return tui.appendTo(ui);
	};
	
	
	d10.admin = {
		router: new d10.fn.menuManager ({
			'menu': $('>nav',ui),
			'container': ui,
			'active_class': 'active',
			'property': 'name',
			'effects': false,
			"routePrepend":["admin"],
			"useRouteAPI": true
		}),
		users: function ( tui ) {
			d10.bghttp.get({
				url: site_url+"/aapi/users",
				dataType: "json",
				success: function(response) {
					debug("response....",response);
					var parsed = [];
					$.each(response.data.users,function(k,v) {
						var user = {
							userid: k,
							login: v.login,
							activity: 0
						};
						if ( k in response.data.sessions && "ts_last_usage" in response.data.sessions[k] ) {
							var d = new Date(response.data.sessions[k].ts_last_usage);
							user.activity = d.getFullYear()+"/"+(d.getMonth()+1)+"/"+d.getDate()+" "+d.getHours()+":"+d.getMinutes();
						};
						parsed.push(user);
					});
					debug(parsed);
					tui.html (
						d10.admin.parse("admin.users",{users: parsed})
					);
					debug(tui.html());
				}
			});
		},
		parse: function (t,d,p) {
			return d10.mustache.to_html( templates[t],d,p);
		},
		ready: function (callback) {
			if ( templatesLoaded ) {
				callback.call();
				return ;
			}
			var iv = setInterval(function() {
				if ( templatesLoaded ) {
					callback.call();
					clearInterval(iv);
				}
			},100);
		}
	};
	
	d10.admin.router.bind("subroute",function(e,data) { 
		d10.admin.ready(function () {
			if ( data.label == "users" ) {
				var tui = getTopicUi(data.label);
				d10.admin.users(tui);
			}
		});
	});

	$(document).bind("route.admin",function(e,data) {
// 		debug(data);
		d10.admin.router.route ( data.segments, data.env );
	});

	d10.bghttp.get({
		url: site_url+"/aapi/templates",
		dataType: "json",
		success: function(response) {
			templates = response.data;
			templatesLoaded = true;
		}
	});
	
	
	//wait for mustache
// 	var miv = setInterval(function() {
// 		if ( Mustache ) {
// 			debug(Mustache);
// 			d10.mustache = Mustache;
// 			clearInterval(miv);
// 		}
// 	},100);
	
	
});