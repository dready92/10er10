var 	bodyDecoder = require("connect/middleware/bodyDecoder"),
		config = require("./config"),
		hash = require("./hash"),
		utils = require("connect/utils"),
// 		d10db = require("./d10db"),
		d10 = require("./d10");
// 		d10data = require("./d10data");


		
		
exports.homepage = function(app) {
	
	var displayHomepage = function(request,response,next) {
// 		console.log(request);
// 		console.log(request.ctx);
		if ( request.ctx.session && "_id" in request.ctx.session ) {
			console.log("LOGGED");
		} else {
			console.log("NOT LOGGED");
		}
// 		console.log("writing headers");
// 		console.log(request.ctx.headers);
// 		var h = {};
// 		for (var i in request.ctx.headers ) {
// 		}
// 		console.log(response.writeHead);
		response.writeHead(200, request.ctx.headers );
// 		console.log(request.ctx);
		if ( request.ctx.session && "_id" in request.ctx.session ) {
			// 		console.log(request.headers);
			var debug = request.query && request.query.debug ? true : false ;
			var vars = {scripts: config.javascript.includes, dbg: debug ? "true":"false", base_url: request.basepath };
			if ( request.query.o && request.query.o.indexOf("a") >= 0 ) {
				vars.debugAudio = true;
			}
			if ( request.query.o && request.query.o.indexOf("n") >= 0 ) {
				vars.debugNet = true;
			}
			if ( debug ) {
				vars.debugloop = true;
			}
			
			d10.view("homepage",vars,function(html) {
				response.end(html);
			});
		} else {
			console.log("sending login");
			d10.view("login",vars,function(html) {
				response.end(html);
			});
		}
	}
	app.get("/welcome/goodbye",function(request,response,next) {
		d10.db.db("d10").deleteDoc(
			{
			},
			request.ctx.session
		);
	    delete request.ctx.session;
	    delete request.ctx.user;
	    delete request.ctx.userPrivateConfig;
		request.ctx.headers["Set-Cookie"] = config.cookieName+"=no; path="+config.cookiePath;
		//; expires="+new Date().toUTCString();
		displayHomepage(request,response,next);
	});
	app.get("/", displayHomepage);
	app.post("/",function( request, response, next ) {
		
		var checkPass = function (uid) {
			console.log("checking login infos ",uid);
			d10.db.loginInfos(
				uid,
				function(loginResponse) {
					console.log("checking login infos : response");
					var password = hash.sha1(request.body.password),
// 					uid = false,
					valid = false;
					loginResponse.rows.forEach (function(v,k) {
						if ( v.doc._id.indexOf("pr") === 0 ) {
							console.log("password check ",password, v.doc.password);
// 							uid = v.doc._id.replace(/^se/,"");
							if ( v.doc.password == password ) {
								console.log("password check ",password, v.doc.password);
								// 							
								valid = true;
								return false;
							}
						}
					});
					console.log("tests",valid,uid);
					if ( valid == true && uid ) {
						console.log("user ",uid,"should be logged");
						var sessionId = utils.uid()+""+utils.uid();
						var d = new Date();
						// create session and send cookie
						var doc = { 
							_id:"se"+sessionId ,
							userid: uid,
							ts_creation: d.getTime(),
							ts_last_usage: d.getTime()
						};
						d10.db.db("auth").storeDoc({
							success: function(storeResponse) {
								console.log("session recorded : ",storeResponse);
								// 									response.rows.push(doc);
								if ( storeResponse.rev ) {
									doc._rev = storeResponse.rev;
								}
								d10.fillUserCtx(request.ctx,loginResponse,doc);
								var infos = {
									user: request.ctx.user.login,
									session: sessionId
								};
								var d = new Date();
								d.setTime ( d.getTime() + config.cookieTtl );
								request.ctx.headers["Set-Cookie"] = config.cookieName+"="+escape(JSON.stringify(infos))+"; expires="+d.toUTCString()+"; path="+config.cookiePath;
								// Set-Cookie:goodcake=%7B%22user%22%3A%22boss%22%2C%22session%22%3A%224dfaee1e15a3d1111e145aa0f2f2f566bd5185a3%22%7D; expires=Wed, 29-Dec-2010 09:47
								// if (val instanceof Date) {
							// val = val.toUTCString();
								
								
								// 									d10data.fillCtx(ctx,response,doc);
								displayHomepage(request,response,next);
							},
							error: function(a,b) {
								console.log("error on session recording",a,b);
								displayHomepage(request,response,next);
							}
						},doc);
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
// 			console.log(request.body,"after decode");
			if ( request.body && request.body.username && request.body.password && request.body.username.length && request.body.password.length ) {
				// get uid with login
				console.log("got a username & password : try to find uid with username");
				var i = d10.db.db("auth").key( ["login",request.body.username] ).getView({
					success: function(res) {
						console.log("got view response ",res.rows.length);
						if ( res.rows && res.rows.length ) {
							var uid = res.rows.pop().id.replace(/^us/,"");
							checkPass(uid);
						} else {
							displayHomepage(request,response,next);
						}
					},
					error: function () {displayHomepage(request,response,next);}
				},"infos","all");
			} else {
				displayHomepage(request,response,next);
			}
		}
		);
	});
};