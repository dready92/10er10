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
/*
var isValidLogin = function(login, callback) {
	if ( login.length < 3 ) {	return callback(431); }
	if ( 
		login.indexOf("<") >= 0 ||
		login.indexOf(">") >= 0 ||
		login.indexOf("/") >= 0 ||
		login.indexOf("\\") >= 0 ||
		login.indexOf("\"") >= 0 ||
		login.indexOf("'") >= 0 ||
		login.indexOf("&") >= 0 
	)	return callback(432);
	if ( login.toLowerCase() == "admin" ||
		 login.toLowerCase() == "administrateur" ||
		  login.toLowerCase() == "administrator" ||
		   login.toLowerCase() == "root"
	)	return callback(430);
	d10.couch.auth.view("infos/all", {key: ["login",login]}, function(err,back) {
		if ( err ) {
			callback(503);
		} else if ( back.rows.length ) {
			callback(430);
		} else {
			callback();
		}
	});
};
*/

/*
var isValidPassword = function(password, callback) {
	if ( password.length < 8 ) {
		return callback(440);
	}
	var hash = [];
	for ( var i = 0; i<password.length ; i++ ) {
		var c = password.charCodeAt(i);
		if ( hash.indexOf(c) < 0 )	hash.push(c);
	}
	console.log(hash);
	if ( hash.length < 4 ) {
		return callback(441);
	}
	callback();
};
*/

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
		/*
		function(errs,d) {
			if ( errs ) {
				response.writeHead(500,{});
				response.end(JSON.stringify(errs));
				return ;
			}
			var uid = d10.uid();
			var user = {
				_id: "us"+uid,
				login: request.body.login,
				parent: d.parent._id
			};
			var priv = {
				_id: "pr"+uid,
				password: hash.sha1(request.body.password),
				depth: d.parentPriv.depth ? d.parentPriv.depth+1: 1
			};
			d10.couch.auth.storeDocs( [ user, priv ], function(err,resp) {
				if ( err ) {
					response.writeHead(500,{});
					response.end(JSON.stringify(err));
				} else {
					createD10UserDocs(request,response,user,invite);
				}
			});
		}
		*/
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
/*
var createD10UserDocs = function(request,response,user,invite) {
	d10.couch.d10wi.storeDocs( [ {_id: user._id.replace(/^us/,"up")}, {_id: user._id.replace(/^us/,"pr")} ], function(err,resp) {
		if ( err ) {
			tryToRemoveAuthDocs(user);
			response.writeHead(500,{});
			response.end();
			return ;
		}
		response.writeHead(200,{});
		response.end("ok");
		d10.couch.auth.deleteDoc(invite,function(){});
	});
};

var tryToRemoveAuthDocs = function (user) {
	d10.couch.auth.getDoc(user._id,function(err,doc) {
		if(!err) {
			d10.couch.auth.deleteDoc(doc,function(){});
		}
	});
	d10.couch.auth.getDoc(user._id.replace(/^us/,"pr"),function(err,doc) {
		if(!err) {
			d10.couch.auth.deleteDoc(doc,function(){});
		}
	});
};
*/
		
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
			fs.readFile(d10.config.templates.invites+"homepage.html","utf-8", function (err, data) {
				if (err) throw err;
				data = d10.mustache.to_html(data,{site_url: "/", code: request.params.id});
				response.writeHead(200,headers);
				response.end(data);
			});
		});
		
	});
};
