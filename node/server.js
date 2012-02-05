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

	var	connect = require("connect");
    connect.router = require("./connect-router");
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
		invitesRouter = require(__dirname+"/invites.router"),
		lang = require(__dirname+"/lang"),
		contextMiddleware = require(__dirname+"/contextMiddleware").context,
		nodeVersion = require(__dirname+"/nodeVersion");
		;

	process.chdir(__dirname);
	
	var child = require('child_process').fork(__dirname + '/bgworker.js');
	child.send({type: "configuration", production: isProduction});

	console.log("Database binding: "+config.couch.d10.dsn+"/"+config.couch.d10.database);

	// config.production = true;
	function staticRoutes(app) {
        console.log(app);
		app.get("/js/*",httpHelper.localPathServer("/js","../views/10er10.com/js",{bypass: config.production ? false : true}));
		app.get("/css/*",httpHelper.localPathServer("/css","../views/10er10.com/css",{bypass: config.production ? false : true}));
	};

	function staticAudio (app) {
		app.get("/audio/*",httpHelper.localPathServer("/audio",config.audio.dir,{bypass: true}));
	};

	function staticImages (app) {
		app.get("/audioImages/*",httpHelper.localPathServer("/audioImages",config.images.dir));
	};

	function staticInvites(app) {
		app.get("/static/*",httpHelper.localPathServer("/static","../views/invites.10er10.com/static"));
	};




	var d10LangMiddleWare = lang.middleware("../views/10er10.com/lang",config.templates.node, startServer);
	var invitesLangMiddleWare = lang.middleware("../views/invites.10er10.com/lang",config.templates.invites, function(){});


	var stack = [
		contextMiddleware,
		connect.router(staticRoutes), 
		cookieSession.cookieSession,
		d10LangMiddleWare,
		connect.router(homepage.homepage),
		// from here we need to be logged:
		function(request,response,next) {
			if ( !request.ctx.session || !request.ctx.user || !request.ctx.user._id ) {
				response.writeHead(404,{"Content-Type":"text/plain"});
				response.end("Page not found");
			}
			else
			{
				next();
			}
		},
		connect.router(download.api),
		connect.router(staticAudio),
		connect.router(staticImages),
		connect.router(api.api),
		connect.router(plmApi.api),
		connect.router(listingApi.api),
		connect.router(songStuff.api),
		connect.router(imagesStuff.api),
		connect.router(invites.api)
	];






	function startServer() {
		
		var d10Server = connect().use(connect.favicon('../views/10er10.com/favicon.ico'));
		if ( !config.production ) {
			d10Server.use(connect.logger());
		}

		if ( config.gzipContentEncoding ) {
//  			if ( nodeVersion.minor > 5 ) { // beginning from node 0.6.0 we use internal gzip encoding
//  				console.log("INFO: using node.js native gzip encoder");
//  				d10Server.use(require("./native-gzip")({ matchType: /css|text|javascript|json|x-font-ttf/ }));
//  			} else {
// 				d10Server.use(require("connect-gzip").gzip({ matchType: /css|text|javascript|json|x-font-ttf/ }));
//  			}
            var compressFilter = function(req, res){
              var type = res.getHeader('Content-Type') || '';
              return type.match(/css|text|javascript|json|x-font-ttf/);
            };
            d10Server.use(connect.compress({filter: compressFilter}));
		}
		stack.forEach(function(mw) { d10Server.use(mw); });


		var invitesServer = connect()
			.use(connect.logger())
			.use(contextMiddleware)
			.use(invitesLangMiddleWare)
			.use(connect.router(staticInvites))
			.use(connect.router(invitesRouter.api))
            .use(
			function (request,response) {
				response.writeHead(404,{"Content-Type": "text/plain"});
				response.end("The page does not exist");
			}
            )
        ;
		


		var globalSrv = connect()
			// 10er10 vhosts
			.use(connect.vhost(config.invites.domain,invitesServer))
		// 	defaultServer
			.use(d10Server)
		;
		globalSrv.listen(config.port);
		
		
		d10Server.on("clientError",function() {
			console.log("CLIENT ERROR");
			console.log(arguments);
		});
/*
		d10Server.on("error",function() {
			console.log("SERVER ERROR");
			console.log(arguments);
		});
		
		globalSrv.on("error",function() {
			console.log("SERVER ERROR");
			console.log(arguments);
		});
		globalSrv.on("clientError",function() {
			console.log("CLIENT ERROR");
			console.log(arguments);
		});
		*/
		console.log("Production : ",config.production);
	};
};
