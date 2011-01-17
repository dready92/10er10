var bodyDecoder = require("connect/middleware/bodyDecoder"),
	spawn = require('child_process').spawn,
	d10 = require("./d10");

		
		
exports.api = function(app) {
	

	app.get("/html/invites",function(request,response,next) {
		if ( request.ctx.user.invites ) {
			request.ctx.headers["Content-Type"] = "text/html";
			response.writeHead(200,request.ctx.headers);
			d10.view("invites/invites",{count: request.ctx.user.invites,ttl: d10.config.invites.ttl},function(html) {
				response.end(html);
			});
		} else {
			request.ctx.headers["Content-Type"] = "text/html";
			response.writeHead(200,request.ctx.headers);
			d10.view("invites/no_invite",{},function(html) {
				response.end(html);
			});
		}
	});
	
	var isValidEmailAddress = function (emailAddress) {
		return /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/.test(emailAddress);
	};
	
	

	var sendInviteMail = function (email, invite, then) {
		var body = d10.mustache.to_html(d10.config.invites.message,{
			ttl: d10.config.invites.ttl
		},{
			url: d10.mustache.to_html(d10.config.invites.url,{id: invite._id.replace(/^in/,"")})
		});
// 		body = mime.encodeQuotedPrintable(body);
		d10.log("debug",body);
		var email = spawn("php",["-q","../email/send.php","-s",d10.config.invites.subject,"-f",d10.config.emailSender,"-t",email,"-n",d10.config.emailSenderLabel]);
		email.on("exit",function(code) {
			if ( code )	then(code);
			else		then(null,null);
		});
		email.stdout.on("data",function(d) {
			d10.log("debug",d);
		});
		email.stderr.on("data",function(d) {
			d10.log("debug",d.toString("utf8")	);
		});
		email.stdin.end(body);
	};
	
	app.post("/api/sendInvite",function(request,response) {
		//should have email...?
		bodyDecoder()(request, response,function() {
			d10.log("debug",request.body,"after decode");
			if ( !request.ctx.user.invites ) {
				return d10.rest.err(431,{invites: request.ctx.user.invites}, request.ctx);
			}
			if ( !request.body || !request.body.email || !request.body.email.length ) {
				return d10.rest.err(427,"missing parameter: email", request.ctx);
			}
			if ( !isValidEmailAddress(request.body.email) ) {
				return d10.rest.err(434,{}, request.ctx);
			}
			
			//create invite
			var iid = d10.uid();
			var invite = {
				_id: "in"+iid,
				from: request.ctx.user._id,
				creation_time: new Date().getTime()
			};
			
			d10.couch.auth.storeDoc(invites,function(err,resp) {
				if ( err ) return d10.rest.err(423,err,request.ctx);
				sendInviteMail(request.body.email,invite,function(err,resp) {
					if ( err ) {
						return d10.rest.err(435,err,request.ctx);
					}
					request.ctx.user.invites--;
					d10.couch.auth.storeDoc(request.ctx.user,function(){});
					return d10.rest.success([],request.ctx);
				});
			});
			/*
			d10.db.db("auth").storeDoc({
				success: function() {
					sendInviteMail(request.body.email,invite,function(err,resp) {
						if ( err ) {
							return d10.rest.err(435,err,request.ctx);
						}
						request.ctx.user.invites--;
						d10.db.db("auth").storeDoc({},request.ctx.user);
						return d10.rest.success([],request.ctx);
					});
				},
				error: function(body,err) {
					return d10.rest.err(423,err,request.ctx);
				}
			},
			invite);
			*/
			
// 			
		});
	});
};