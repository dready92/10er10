var 	bodyDecoder = require("connect").bodyParser,
		hash = require("./hash"),
		utils = require("connect").utils,
		d10 = require("./d10"),
		debug = d10.debug("d10:d10.router.homepage"),
		when = require("./when"),
		users = require("./d10.users");
		
		
exports.homepage = function(app) {

	var display10er10 = function(request,response,next) {
		var genres = d10.config.genres;
		genres.sort();
		var debug = request.query && request.query.debug ? true : false ;
		
		var vars = {
			scripts: d10.config.javascript.includes, 
			dbg: debug ? "true":"false", 
			base_url: request.basepath,
			audio_root: d10.config.audio_root,
			img_root: "audioImages",
			img_size: d10.config.images.defaultSize,
			img_default: d10.config.images.default.join(","),
			rpp: d10.config.rpp,
			genres: genres,
			langs: [],
			invites_ttl: d10.config.invites.ttl,
            cookieName: d10.config.cookieName,
			libraryDefaultTab: d10.config.library.defaultTab
		};
		if ( request.query.o && request.query.o.indexOf("a") >= 0 ) {
			vars.debugAudio = true;
		}
		if ( request.query.o && request.query.o.indexOf("n") >= 0 ) {
			vars.debugNet = true;
		}
		if ( debug ) {
			vars.debugloop = true;
		}
		vars.username = request.ctx.user.login;
		when(
			{
				resultsContainer: function(cb) {
					request.ctx.langUtils.parseServerTemplate(request,"html/results/container.html",cb);
				},
				libraryContainer: function(cb) {
					request.ctx.langUtils.parseServerTemplate(request,"html/library/container.html",cb);
				},
				myContainer: function(cb) {
					request.ctx.langUtils.parseServerTemplate(request,"html/my/container.html",cb);
				},
				uploadContainer: function(cb) {
					request.ctx.langUtils.parseServerTemplate(request,"html/upload/container.html",cb);
				},
				welcomeContainer: function(cb) {
					request.ctx.langUtils.parseServerTemplate(request,"html/welcome/container.html",cb);
				},
				langs: function(cb) {
					request.ctx.langUtils.getSupportedLangs(cb);
				}
			},
				function(errs,responses) {
					if ( errs ) {
						debug("READ ERROR : ",errs);
						response.writeHead(501, request.ctx.headers );
						response.end ("Filesystem error");
					} else {
						var lngs = responses.langs;
						delete responses.langs;
						for ( var l in lngs ) {
							if ( l == request.ctx.lang ) {
								vars.langs.push( {id: l, label: lngs[l], checked: true} );
							} else {
								vars.langs.push( {id: l, label: lngs[l]} );
							}
						}
						
						request.ctx.langUtils.parseServerTemplate(request,"homepage.html",function(err,resp) {
							if ( err ) {
								debug(err);
								return response.end("An error occured");
							}
							response.end(d10.mustache.to_html(resp,vars,responses));
						});
					}
			}
		);

	};
	
	var displayHomepage = function(request,response,next) {
		if ( request.ctx.session && "_id" in request.ctx.session && request.ctx.user) {
			debug("homepage router: LOGGED");
		} else {
			debug("homepage router: NOT LOGGED");
		}
		request.ctx.headers["Content-Type"] = "text/html";
		response.writeHead(200, request.ctx.headers );
		
		if ( request.ctx.session && "_id" in request.ctx.session && request.ctx.user ) {
			if ( request.query.lang ) {
				request.ctx.langUtils.langExists(request.query.lang,function(exists) {
					if ( exists ) {
						request.ctx.user.lang = request.query.lang;
						d10.couch.auth.storeDoc(request.ctx.user,function(err,resp) {
							request.ctx.lang = request.query.lang;
							display10er10(request,response,next);
						});
					} else {
						display10er10(request,response,next);
					}
				});
			} else {
				display10er10(request,response,next);
			}
		} else {
			d10.log("debug","sending login");
			request.ctx.langUtils.parseServerTemplate(request,"login.html",function(err,html) {
				response.end(html);
			});
		}
	}
	app.get("/welcome/goodbye",function(request,response,next) {
		d10.couch.auth.deleteDoc(request.ctx.session,function(){});
	    delete request.ctx.session;
	    delete request.ctx.user;
	    delete request.ctx.userPrivateConfig;
		request.ctx.headers["Set-Cookie"] = d10.config.cookieName+"=no; path="+d10.config.cookiePath;
		displayHomepage(request,response,next);
	});
	
	app.get("/", displayHomepage);
	app.post("/",function( request, response, next ) {
		var checkPass = function() {
			users.checkAuthFromLogin(request.body.username,request.body.password,function(err, uid, loginResponse) {
				if ( err || !uid) {
					return displayHomepage(request,response,next);
				}
				
				debug("POST/: user logged with login/password:",uid);
				users.makeSession(uid, function(err,sessionDoc) {
					if ( !err ) {
						d10.fillUserCtx(request.ctx,loginResponse,sessionDoc);
						var cookie = { user: request.ctx.user.login, session: sessionDoc._id.substring(2) };
						var d = new Date();
						d.setTime ( d.getTime() + d10.config.cookieTtl );
						request.ctx.headers["Set-Cookie"] = d10.config.cookieName+"="+escape(JSON.stringify(cookie))+"; expires="+d.toUTCString()+"; path="+d10.config.cookiePath;
						if ( request.ctx.user.lang ) { request.ctx.lang = request.ctx.user.lang; }
					}
					displayHomepage(request,response,next);
				});
				
			});
		};
		
		
		// login try
		bodyDecoder()(request, response,function() {
			if ( request.body && request.body.username && request.body.password && request.body.username.length && request.body.password.length ) {
				// get uid with login
				debug("got a username & password : try to find uid with username");
				checkPass();
			} else {
				displayHomepage(request,response,next);
			}
		});
	});
	
	app.post("/api/session",function(request,response,next) {
		var checkPass = function() {
			users.checkAuthFromLogin(request.body.username,request.body.password,function(err, uid, loginResponse) {
				if ( err ) {
					return d10.realrest.err(500,{error: "login failed",reason: "server messed up"},request.ctx);
				}
				if ( !uid ) {
					return d10.realrest.err(500,{error: "login failed",reason: "invalid credentials"},request.ctx);
				}
				debug("POST /api/session: user logged with login/password: ",uid);
				users.makeSession(uid, function(err,sessionDoc) {
					if ( !err ) {
						d10.fillUserCtx(request.ctx,loginResponse,sessionDoc);
						var cookie = { user: request.ctx.user.login, session: sessionDoc._id.substring(2) };
						var d = new Date();
						d.setTime ( d.getTime() + d10.config.cookieTtl );
						request.ctx.headers["Set-Cookie"] = d10.config.cookieName+"="+escape(JSON.stringify(cookie))+"; expires="+d.toUTCString()+"; path="+d10.config.cookiePath;
						if ( request.ctx.user.lang ) { request.ctx.lang = request.ctx.user.lang; }
						return d10.realrest.err(200,{ok: true},request.ctx);
					} else {
						return d10.realrest.err(500,{error: "login failed",reason: "invalid credentials"},request.ctx);
					}
				});
				
			});
		};
		// login try
		bodyDecoder()(request, response,function() {
			if ( request.body && request.body.username && request.body.password && request.body.username.length && request.body.password.length ) {
				// get uid with login
				debug("got a username & password : try to find uid with username");
				checkPass();
			} else {
				return d10.realrest.err(500,{error: "login failed",reason: "invalid parameters"},request.ctx);
			}
		});
	});
};
