var config,
	configParser = require(__dirname+"/configParser");


configParser.getConfig(function(foo,cfg) {
	config = cfg;
	// production test
	var prod = false;
	if ( process.argv.length > 2 && process.argv[2] == "-p" ) {
		prod = true;
		configParser.switchProd();
	} else {
		configParser.switchDev();
	}
	require("./d10").setConfig(config);
	onConfig(prod);
});


var onConfig = function(isProduction) {

	var express = require('express');
	var d10Router = express.Router();
	var favicon = require('serve-favicon');
	var morgan = require('morgan');
	var logMiddleware = morgan('combined');
	var compression = require('compression');
	var vhost = require('vhost');
	var	httpHelper = require(__dirname+"/httpHelper"),
		homepage = require(__dirname+"/d10.router.homepage"),
		cookieSession = require(__dirname+"/cookieSessionMiddleware"),
		api = require(__dirname+"/d10.router.api"),
		plmApi = require(__dirname+"/d10.router.api.plm"),
		listingApi = require(__dirname+"/d10.router.api.listing"),
		songStuff = require(__dirname+"/d10.router.song"),
		imagesStuff = require(__dirname+"/d10.router.images"),
		invites = require(__dirname+"/d10.router.invites"),
		download = require(__dirname+"/d10.router.audio.download"),
		rc = require(__dirname+"/d10.router.rc"),
		invitesRouter = require(__dirname+"/invites.router"),
		lang = require(__dirname+"/lang"),
		contextMiddleware = require(__dirname+"/contextMiddleware").context,
		webSocketServer = require(__dirname+"/lib/websocket-server"),
		nodeVersion = require(__dirname+"/nodeVersion"),
		dosWatchdog = require(__dirname+"/dosWatchdog");


	process.chdir(__dirname);

	var child = require('child_process').fork(__dirname + '/bgworker.js');
	child.send({type: "configuration", production: isProduction});

	console.log("Database binding: "+config.couch.d10.dsn+"/"+config.couch.d10.database);

	// config.production = true;
	function staticRoutes(app) {
		app.use('/js/', express.static('../views/10er10.com/js'));
		app.use('/css/', express.static('../views/10er10.com/css'));
		app.use('/html/rc/', express.static('../views/10er10.com/html/rc'));
	};

	function staticAudio (app) {
		app.use('/audio/', express.static(config.audio.dir));
	};

	function staticImages (app) {
		app.use('/audioImages/', express.static(config.images.dir));
	};

	function staticInvites(app) {
		app.use('/static/', express.static('../views/invites.10er10.com/static'));
	};




	var d10LangMiddleWare = lang.middleware("../views/10er10.com/lang",config.templates.node, startServer);
	var invitesLangMiddleWare = lang.middleware("../views/invites.10er10.com/lang",config.templates.invites, function(){});



	d10Router.use(contextMiddleware);
	staticRoutes(d10Router);
	d10Router.use(cookieSession.cookieSession);
	d10Router.use(d10LangMiddleWare);
	homepage.homepage(d10Router);
	rc.publicApi(d10Router);
	d10Router.use(function(request,response,next) {
		if ( !request.ctx.session || !request.ctx.user || !request.ctx.user._id ) {
			response.writeHead(404,{"Content-Type":"text/plain"});
			response.end("Page not found");
		}
		else
		{
			next();
		}
	});
	download.api(d10Router);
	staticAudio(d10Router);
	staticImages(d10Router);
	api.api(d10Router);
	plmApi.api(d10Router);
	listingApi.api(d10Router);
	songStuff.api(d10Router);
	imagesStuff.api(d10Router);
	rc.api(d10Router);
	invites.api(d10Router);

	function startServer() {

		var d10Server = express();
		d10Server.use(favicon('../views/10er10.com/favicon.ico'));

		if ( !config.production ) {
			d10Server.use(logMiddleware);
		}

		if ( config.gzipContentEncoding ) {
      var compressFilter = function(req, res){
        var type = res.getHeader('Content-Type') || '';
        return type.match(/css|text|javascript|json|x-font-ttf/);
      };
      d10Server.use(compression({filter: compressFilter}));
		}
		d10Server.use(d10Router);
//		stack.forEach(function(mw) { d10Server.use(mw); });


		var invitesServer = express.Router();
		invitesServer.use(logMiddleware);
		invitesServer.use(contextMiddleware);
		invitesServer.use(invitesLangMiddleWare);
		staticInvites(invitesServer);
		invitesRouter.api(invitesServer);

		var globalSrv = express();
			// 10er10 vhosts
			globalSrv.use(vhost(config.invites.domain,invitesServer));
		// 	defaultServer
			globalSrv.use(d10Server);
		;
		var nodeHTTPServer = globalSrv.listen(config.port);
    dosWatchdog.install(nodeHTTPServer);
    var wsServer = new webSocketServer(nodeHTTPServer, d10Server);

    nodeHTTPServer.on("error", function(err) {
      console.log(err);
    });


		d10Server.on("clientError",function() {
			console.log("CLIENT ERROR");
			console.log(arguments);
		});
		console.log("Production mode ? ",config.production);
    console.log("Server listening on port", config.port);
	};
};
