var bodyParser = require('body-parser'),
    jsonParserMiddleware = bodyParser.json(),
    nodemailer = require("nodemailer"),
	d10 = require("./d10");

exports.api = function(app) {


	app.get("/api/invites/count",function(request,response,next) {
		if ( request.ctx.user.invites ) {
			d10.realrest.success(request.ctx.user.invites, request.ctx);
		} else {
			d10.realrest.success(0, request.ctx);
		}
	});

	var isValidEmailAddress = function (emailAddress) {
		return /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/.test(emailAddress);
	};

	var reallySendMail = function (email,body,then) {
		const mailTransport = nodemailer.createTransport(d10.config.emailTransport.type, d10.config.emailTransport.options);
      mailTransport.sendMail({
        from: d10.config.emailSenderLabel+" <"+d10.config.emailSender+">",
        to: email,
        subject: d10.config.invites.subject,
        text: body
      }, function(err,resp) {
        then(err,resp);
      });
	};


	var sendInviteMail = function (email, invite, then) {
		var body = d10.mustache.to_html(d10.config.invites.message,{
			ttl: d10.config.invites.ttl
		},{
			url: d10.mustache.to_html(d10.config.invites.url,{id: invite._id.replace(/^in/,"")})
		});
		reallySendMail(email,body,then);
	};

	app.post("/api/sendInvite", jsonParserMiddleware ,function(request,response) {
		//should have email...?
		if ( !request.ctx.user.invites ) {
			return d10.realrest.err(431,{invites: request.ctx.user.invites}, request.ctx);
		}
		if ( !request.body || !request.body.email || !request.body.email.length ) {
			return d10.realrest.err(427,"missing parameter: email", request.ctx);
		}
		if ( !isValidEmailAddress(request.body.email) ) {
			return d10.realrest.err(434,{}, request.ctx);
		}

		//create invite
		var iid = d10.uid();
		var invite = {
			_id: "in"+iid,
			from: request.ctx.user._id,
			creation_time: new Date().getTime()
		};

		d10.couch.auth.storeDoc(invite,function(err,resp) {
			if ( err ) return d10.realrest.err(423,err,request.ctx);
			sendInviteMail(request.body.email,invite,function(err,resp) {
				if ( err ) {
					return d10.realrest.err(435,err,request.ctx);
				}
				request.ctx.user.invites--;
				d10.couch.auth.storeDoc(request.ctx.user,function(){});
				return d10.realrest.success([],request.ctx);
			});
		});
	});
};
