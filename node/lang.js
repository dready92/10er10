var fs = require("fs"),
	d10 = require("./d10"),
	debug = d10.debug("d10:lang"),
	mustache = require("./mustache"),
	when = require("./when"),
	pause = require("pause");




exports.middleware = function(langRoot, tplRoot, cb) {

	var langs = false;
	var loadingLangs = false;
	var loadingLangsCb = [];

	/*
	* parse Accept-Language headers & returns the available matching language or the default language
	*/
	var getHeadersLang = function(request,cb) {
		var accepted = request.headers["accept-language"] ? request.headers["accept-language"].split(",") : null;
		if ( accepted === null || !accepted.length ) {
			return cb(d10.config.templates.defaultLang);
		}
		var chosen = null;
		var checkNext = function() {
			if ( accepted.length ==  0 ) {
				return cb(d10.config.templates.defaultLang);
			}
			var lng = accepted.shift().split(";").shift();
			langExists(lng,function(response) {
				if ( response ) {
					cb(lng);
				} else {
					checkNext();
				}
			});
		};
		checkNext();
	};

	var loadLangFiles = function(cb) {
		if ( langs !== false ) {
			return cb() ;
		}
		loadingLangsCb.push(cb);

		if ( loadingLangs ) {
			return ;
		}
		loadingLangs = true;
		fs.readdir(langRoot,function(err,files) {
			langs = {};
			for ( var i in files ) {
				var f = files[i];
				if ( f.match(/\.js$/) ) {
					debug("LANG: including "+langRoot+"/"+f);
					langs[ f.replace(/\.js$/,"") ] = require(langRoot+"/"+f);
				}
			}
			loadingLangs = false;
			loadingLangsCb.forEach(function(cb) { cb()});
		});
	};

	var langExists = function(lng, cb) {
		lng = lng.toLowerCase().replace(/\W+/g,"");
		if ( langs[lng] ) {
			return cb(true);
		}
		return cb(false);
	};


	/**
	*load a language definition file
	*
	* @param lng language
	* @param type template type ("server", "client", "shared")
	* @param cb callback ( called with args err & language object )
	*
	* eg. : loadLang("en","server",function(err,resp) { console.log(resp["homepage.html"]["l:welcome"]); });
	*
	*/
	var loadLang = function ( lng, type, cb ) {
		if ( ! lng in langs ) {
			debug("LANG unknown : ",lng);
			return cb(new Error("lang not found: "+lng));
		}
		if ( ! type in langs[lng] ) {
			debug("LANG type unknown : ",type,lng);
			return cb(new Error("lang type not found: "+lng+"."+type));
		}
		return cb(null,langs[lng][type]);
	};

	/**
	* Parses the server template hash
	*
	*
	*/
	var parseServerTemplate = function(request, tpl, cb) {
	// 	getHeadersLang(request,function(lng) {
	// 	var lng = request.ctx.lang ? request.ctx.lang : d10.config.templates.defaultLang;
	// 	var lng =
		debug("LANG parseServerTemplate: ",tpl,request.url,request.ctx.lang);
		loadLang(request.ctx.lang,"server",function(err,hash) {
			if ( err ) {
				return cb(err);
			}
			fs.readFile(tplRoot+"/"+tpl, function(err,template) {
				template = template.toString();
				if ( err ) { return cb(err); }
				if ( ! tpl in hash ) { return cb(null,template); }
				return cb(null,mustache.lang_to_html(template, hash[tpl]));
			});
		});
	// 	});
	};

	var getSupportedLangs = function(cb) {
		var back = {};
		var keys = [];
		for ( var i in langs ) {
			keys.push(i);
	// 			back[i] = langs[i].langName;
		}
		keys.sort();
		debug("lang keys: ",keys);
		for (var k in keys ) {
			i = keys[k];
			back[i] = langs[i].langName;
		}
		cb(null,back);
	};




	loadLangFiles(cb);

	return function(req,res,next) {


		var fetchFromBrowser = function() {
			var passTheCoochie = function() {
				handle.end();
				next();
				handle.resume();
			};
			var handle = pause(req);
			getHeadersLang(req,function(lng) {
				debug("LANG middleware: browser sniff: ",lng);
				req.ctx.lang = lng;
				if ( req.ctx.session && req.ctx.session._id ) {
					req.ctx.session.lang = lng;
					d10.couch.auth.storeDoc(req.ctx.session, function(err,resp) {
						if ( err ) {debug("LANG : session storage failed: ",err,resp);}
						passTheCoochie();
					});
				} else {
					passTheCoochie();
				}
			});
		};
		req.ctx = req.ctx || {};
		req.ctx.langUtils = {
			getSupportedLangs: getSupportedLangs,
			parseServerTemplate: parseServerTemplate,
			loadLang: loadLang,
			langExists: langExists
		};


	// 	if ( !req.ctx.user  || !req.ctx.user._id ) {
	// 		return next();
	// 	}
		if ( req.ctx.user && req.ctx.user.lang ) {
			debug("LANG middleware: set from user");
			req.ctx.lang = req.ctx.user.lang;
			return next();
		} else if ( req.ctx.session && req.ctx.session.lang ) {
			debug("LANG middleware: set from session");
			req.ctx.lang = req.ctx.session.lang;
			return next();
		}
		fetchFromBrowser();
	};
};
