var fs = require("fs"),
	d10 = require("./d10"),
	mustache = require("./mustache"),
	when = require("./when");

var langRoot = "../views/10er10.com/lang";
var langs = {};

/*
 * parse Accept-Language headers & returns the available matching language or the default language
 */
var getHeadersLang = function(request,cb) {
	var accepted = request.headers["Accept-Language"] ? request.headers["Accept-Language"].split(",") : null;
	if ( accepted === null || !accepted.length ) {
		return cb(d10.config.templates.defaultLang);
	}
	var chosen = null;
	accepted.forEach(function(v) {
		if ( chosen ) { return ; }
		v = v.split(";").shift().toLowerCase();
		if ( langs[v] ) { chosen = v; }
	});
	if ( chosen ) { return cb(chosen); }
	
	fs.readdir(langRoot, function(err,resp) {
		if ( err ) { return cb(d10.config.templates.defaultLang); }
		accepted.forEach(function(v) {
			if ( chosen ) { return ; }
			v = v.split(";").shift().toLowerCase();
			if ( resp.indexOf(v) >= 0 ) { chosen = v; }
		});
		if ( chosen ) { return cb(chosen); }
		return cb(d10.config.templates.defaultLang);
	});
}

/**
 *load a language definition file
 *
 * @param lng language
 * @param type template type ("server", "client", "shared")
 * @param cb callback ( called with args err & language object )
 * 
 * eg. : loadTemplate("en","server",function(err,resp) { console.log(resp["homepage.html"]["l:welcome"]); });
 * 
 */
var loadTemplate = function ( lng, type, cb ) {
	if ( langs[lng] ) {
		cb (null, langs[lng][type]);
		return ;
	}
	
	langs[lng] = langs[lng] || {};
	langs[lng].server = require( langRoot+"/"+lng+"/server.js" );
	cb(null,langs[lng][type]);
};

/**
* Parses the server template hash 
*
*
*/
exports.parseServerTemplate = function(request, tpl, cb) {
	getHeadersLang(request,function(lng) {
		loadTemplate(lng,"server",function(err,hash) {
			console.log("hash",hash);
			if ( err ) {
				return cb(err);
			}
			fs.readFile(d10.config.templates.node+"/"+tpl, function(err,template) {
				template = template.toString();
				console.log(template);
				if ( err ) { return cb(err); }
				if ( ! tpl in hash ) { return cb(null,template); }
// 				console.log("sending to mustache", typeof template, hash[tpl]);
				return cb(null,mustache.lang_to_html(template, hash[tpl]));
			});
		});
	});
};


