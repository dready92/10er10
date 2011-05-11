var 	bodyDecoder = require("connect").bodyParser,
		config = require("./config"),
		hash = require("./hash"),
		utils = require("connect").utils,
		d10 = require("./d10"),
		when = require("./when"),
		lang = require("./lang");
		
		
exports.homepage = function(app) {

	var display10er10 = function(request,response,next) {
		var genres = config.genres;
		genres.sort();
		var debug = request.query && request.query.debug ? true : false ;
		var vars = {
			scripts: config.javascript.includes, 
			dbg: debug ? "true":"false", 
			base_url: request.basepath,
			audio_root: d10.config.audio_root,
			img_root: "audioImages",
			img_size: d10.config.images.maxSize,
			genres: genres
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
					lang.parseServerTemplate(request,"html/results/container.html",cb);
// 						d10.view("html/results/container",{},function(data) {cb(null,data);} );
				},
				libraryContainer: function(cb) {
					lang.parseServerTemplate(request,"html/library/container.html",cb);
// 						d10.view("html/library/container",{},function(data) {cb(null,data);} );
				},
				myContainer: function(cb) {
					lang.parseServerTemplate(request,"html/my/container.html",cb);
// 						d10.view("html/my/container",{},function(data) {cb(null,data);} );
				},
				uploadContainer: function(cb) {
					lang.parseServerTemplate(request,"html/upload/container.html",cb);
// 						d10.view("html/upload/container",{},function(data) {cb(null,data);} );
				},
				welcomeContainer: function(cb) {
					lang.parseServerTemplate(request,"html/welcome/container.html",cb);
// 						d10.view("html/welcome/container",{},function(data) {cb(null,data);} );
				}
			},
				function(errs,responses) {
					if ( errs ) {
						console.log("READ ERROR : ",errs);
						response.writeHead(501, request.ctx.headers );
						response.end ("Filesystem error");
					} else {
					lang.parseServerTemplate(request,"homepage.html",function(err,resp) {
						if ( err ) {
							console.log(err);
							return response.end("An error occured");
						}
						response.end(d10.mustache.to_html(resp,vars,responses));
					});
// 						d10.view("homepage",vars,responses,function(html) {
// 							response.end(html);
// 						});
					}
			}
		);

	};
	
	var displayHomepage = function(request,response,next) {
		if ( request.ctx.session && "_id" in request.ctx.session ) {
			d10.log("debug","LOGGED");
		} else {
			d10.log("debug","NOT LOGGED");
		}

		response.writeHead(200, request.ctx.headers );

		if ( request.ctx.session && "_id" in request.ctx.session ) {
			// 		d10.log("debug",request.headers);
			
			
			if ( request.query.lang ) {
				lang.langExists(request.query.lang,function(exists) {
					if ( exists ) {
						console.log("LANG check OK: ",request.query.lang);
						request.ctx.user.lang = request.query.lang;
						d10.couch.auth.storeDoc(request.ctx.user,function(err,resp) {
							request.ctx.lang = request.query.lang;
							if (!err) {console.log("LANG stored", request.query.lang);}
							display10er10(request,response,next);
						});
					} else {
						console.log("LANG check NOT FOUND: ",request.query.lang);
						display10er10(request,response,next);
					}
				});
			} else {
				display10er10(request,response,next);
			}
			
			
			
		} else {
			d10.log("debug","sending login");
			lang.parseServerTemplate(request,"login.html",function(err,html) {
				response.end(html);
			});
// 			d10.view("login",vars,function(html) {
// 				response.end(html);
// 			});
		}
	}
	app.get("/welcome/goodbye",function(request,response,next) {
		d10.couch.d10.deleteDoc(request.ctx.session,function(){});
		/*d10.db.db("d10").deleteDoc(
			{
			},
			request.ctx.session
		);
		*/
	    delete request.ctx.session;
	    delete request.ctx.user;
	    delete request.ctx.userPrivateConfig;
		request.ctx.headers["Set-Cookie"] = config.cookieName+"=no; path="+config.cookiePath;
		//; expires="+new Date().toUTCString();
		displayHomepage(request,response,next);
	});
	app.get("/", displayHomepage);
	app.post("/",function( request, response, next ) {
		
		var checkPass = function () {
			var uid = false;
			d10.log("debug","checking login infos");
			d10.db.loginInfos(
				request.body.username,
				function(loginResponse) {
					d10.log("debug","checking login infos : response");
					var password = hash.sha1(request.body.password),
					valid = false;
					loginResponse.rows.forEach (function(v,k) {
						if ( v.doc._id.indexOf("pr") === 0 ) {
							if ( v.doc.password == password ) {
								valid = true;
								uid = v.doc._id.replace(/^pr/,"");
								return false;
							}
						}
					});
					if ( valid == true && uid ) {
						d10.log("debug","user ",uid,"should be logged");
						var sessionId = d10.uid();
						console.log("session id : ",sessionId);
						var d = new Date();
						// create session and send cookie
						var doc = { 
							_id:"se"+sessionId ,
							userid: uid,
							ts_creation: d.getTime(),
							ts_last_usage: d.getTime()
						};
						d10.couch.auth.storeDoc(doc,function(err,storeResponse) {
							if ( err ) {
								d10.log("debug","error on session recording",err);
								displayHomepage(request,response,next);
								return ;
							}
							d10.log("debug","session recorded : ",storeResponse);

							d10.fillUserCtx(request.ctx,loginResponse,doc);
							var infos = {
								user: request.ctx.user.login,
								session: sessionId
							};
							var d = new Date();
							d.setTime ( d.getTime() + config.cookieTtl );
							request.ctx.headers["Set-Cookie"] = config.cookieName+"="+escape(JSON.stringify(infos))+"; expires="+d.toUTCString()+"; path="+config.cookiePath;
							displayHomepage(request,response,next);
						});
					} else {
						displayHomepage(request,response,next);
					}
				},
				function() {
					displayHomepage(request,response,next);
				}
			);
		};
		
		// login try
		bodyDecoder()(request, response,function() {
			if ( request.body && request.body.username && request.body.password && request.body.username.length && request.body.password.length ) {
				// get uid with login
				d10.log("debug","got a username & password : try to find uid with username");
				checkPass();
			} else {
				displayHomepage(request,response,next);
			}
		});
	});
};
