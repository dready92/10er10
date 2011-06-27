var bodyDecoder = require("connect").bodyParser,
	hash = require("./hash"),
	fs=require("fs"),
	d10 = require("./d10"),
	when = require("./when"),
	users = require("./d10.users");

var errCodes = {
	430: "Login already registered",
	431: "Login too short",
	432: "Login contains invalid characters",
	440: "Password does not contain enough characters",
	441: "Password does not contain enough different characters"
};

var isValidCode = function(code, callback) {
	if ( code.substr(0,2) !== "in" ) {
		callback(400);
	}
	
	d10.couch.auth.getDoc(code,function(err,doc) {
		if ( err ) {
			return callback(err);
		}
		var ttl = d10.config.invites.ttl * 60 * 60 * 24;
		var now = new Date().getTime() / 1000;
		if ( doc.creation_time + ttl < now ) {
			callback(400);
		}
		callback(false,doc);
	});
};

var createAccount = function(request,response,invite) {
	when(
		{
			parent: function(cb) {
				d10.couch.auth.getDoc(invite.from,cb);
			},
			parentPriv: function(cb) {
				d10.couch.auth.getDoc(invite.from.replace(/^us/,"pr"),cb);
			}
		},
		function(errs,d) {
			if ( errs ) {
				response.writeHead(500,{});
				response.end(JSON.stringify(errs));
				return ;
			}
			var uid = d10.uid();
			var opts = {
				parent: d.parent._id,
				depth: d.parentPriv.depth ? d.parentPriv.depth+1: 1,
				uuid: uid,
				callback: function(err,resp) {
					if ( err ) {
						response.writeHead(500,{});
						response.end(JSON.stringify(err));
					} else {
						response.writeHead(200,{});
						response.end("ok");
						d10.couch.auth.deleteDoc(invite,function(){});
					}
				}
			};
			users.createUser(request.body.login, request.body.password, opts);
		}
	);
}

		
exports.api = function(app) {
	app.post("/code/checkLogin",function(request,response,next) {
		console.log("par ici");
		bodyDecoder()(request, response,function() {
			var db;
			isValidCode( request.body.code,function(err,doc) {
				if ( err ) { return next(); }
				users.isValidLogin( request.body.login, function(err) {
					if ( err ) {
						if ( errCodes[err] ) {
							response.writeHead(err,errCodes[err],{});
						} else {
							response.writeHead(err,{});
						}
					} else {
							response.writeHead(200,{});
					}
					response.end();
				});
			});
		});
	});
	
	app.post("/code/checkPassword",function(request,response,next) {
		bodyDecoder()(request, response,function() {
			isValidCode( request.body.code,function(err,doc) {
				if ( err ) { return next(); }
				users.isValidPassword( request.body.password, function(err) {
					if ( err ) {
						if ( errCodes[err] ) {
							response.writeHead(err,errCodes[err],{});
						} else {
							response.writeHead(err,{});
						}
					} else {
							response.writeHead(200,{});
					}
					response.end();
				});
			});
		});
	});
	app.post("/code/createAccount",function(request,response,next) {
		bodyDecoder()(request, response,function() {
			isValidCode(request.body.code,function(err,doc) {
				if ( err ) { return next(); }

				when(
					{
						login: function(cb) {
							users.isValidLogin(request.body.login,cb);
						},
						password: function(cb) {
							users.isValidPassword(request.body.password,cb);
						}
					},
					function(errs) {
						if ( errs ) {
							var err;
							if ( errs.login )	err = errs.login;
							else				err = errs.password;
							if ( errCodes[err] ) {
								response.writeHead(err,errCodes[err],{});
							} else {
								response.writeHead(err,{});
							}
							response.end();
							return ;
						}
						createAccount(request,response,doc);
					}
				);


			});
		});
	});
	app.get("/code/:id",function(request,response,next) {
		console.log("par ici !");
		isValidCode( request.params.id, function(err,doc) {
			if ( err ) { return next(); }
			var headers = {
				"Content-Type": "text/html; charset=utf-8",
				"Charset": "utf-8"
			};
			// base_url, 
			request.ctx.langUtils.parseServerTemplate(request,"homepage.html",function(err,html) {
				response.writeHead(200,headers);
				response.end(d10.mustache.to_html(html,{site_url: "/", code: request.params.id}));
			});
		});
		
	});
};
