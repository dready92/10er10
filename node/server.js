var	connect = require("connect"),
	httpHelper = require("./httpHelper"),
	homepage = require("./d10.router.homepage"),
	cookieSession = require("./cookieSessionMiddleware"),
	api = require("./d10.router.api"),
	plmApi = require("./d10.router.api.plm"),
	listingApi = require("./d10.router.api.listing"),
	songStuff = require("./d10.router.song"),
	invites = require("./d10.router.invites"),
	download = require("./d10.router.audio.download")
	;

function staticRoutes(app) {
	app.get("/js/*",httpHelper.localPathServer("/js","/var/www/html/d10/js"));
	app.get("/css/*",httpHelper.localPathServer("/css","/var/www/html/d10/css"));
};

function staticAudio (app) {
	app.get("/audio/*",httpHelper.localPathServer("/audio","/var/www/html/audio"));
};

var d10Server = connect.createServer( 
	connect.logger(), 
	require("./contextMiddleware").context,
	connect.router(staticRoutes), 
	cookieSession.cookieSession,
	connect.router(download.api),
	connect.router(staticAudio),
	connect.router(homepage.homepage),
	connect.router(api.api),
	connect.router(plmApi.api),
	connect.router(listingApi.api),
	connect.router(songStuff.api),
	connect.router(invites.api)
);

connect.createServer(
	// 10er10 vhosts
	connect.vhost("10er10.com",d10Server),
	connect.vhost("www.10er10.com",d10Server),
	//defaultServer
	d10Server
		)
.listen(8124);

d10Server.on("error",function() {
	console.log("SERVER ERROR");
	console.log(arguments);
});
d10Server.on("clientError",function() {
	console.log("CLIENT ERROR");
	console.log(arguments);
});
