var d10 = require ("./d10"),
	querystring = require("querystring"),
	qs = require("qs"),
	rpl = require("./d10.rpl"),
	bodyDecoder = require("connect").bodyParser;
	
exports.api = function(app) {
	
	app.get("/api/plm/pl*",function(request,response) {
		rpl.playlistAndSongs("pl"+request.params[0],function(err,playlist) {
			if ( err ) {
				return d10.realrest.err(423,null,request.ctx);
			}
			if ( playlist.user != request.ctx.user._id ) {
				return d10.realrest.err(403,null,request.ctx);
			}
			d10.realrest.success(playlist,request.ctx);
		});
	});
	
	app.put("/api/plm/update",function(request,response) {
		var body = "";
		request.setEncoding("utf8");
		request.on("data",function(chunk) { body+=chunk; });
		request.on("end",function() {
			request.body = querystring.parse(body)
			d10.log("debug",request.body,"after decode");
			if ( !request.body.playlist ) {
				return d10.realrest.err(427,"playlist parameter is empty",request.ctx);
			}
			var songs = request.body["songs[]"] ? request.body["songs[]"] : [];
			if ( Object.prototype.toString.call(songs) !== '[object Array]' ) {
				songs = [ songs ];
			}
			
			d10.couch.d10.getDoc(request.body.playlist,function(err,playlist) {
				if ( err) {
					return d10.realrest.err(423,err,request.ctx);
				}
				if ( playlist.user != request.ctx.user._id ) {
					return d10.realrest.err(403,null,request.ctx);
				}
				rpl.update(playlist, songs, function(err,response) {
					if ( !err ) {
						return d10.realrest.success(response, request.ctx);
					}
					return d10.realrest.err(423,err,request.ctx);
				});
			});
		});
	});
	
	
	app.put("/api/plm/append/pl:id",function(request,response) {
		bodyDecoder()(request, response,function() {
			d10.log("debug",request.body,"after decode");
			if ( !request.body.song ) {
				return d10.realrest.err(427,"song parameter is empty",request.ctx);
			}
			
			d10.couch.d10.getDoc("pl"+request.params.id,function(err,playlist) {
				if ( err ) {
					return d10.realrest.err(423,err,request.ctx);
				}
				if ( playlist.user != request.ctx.user._id ) {
					return d10.realrest.err(403,null,request.ctx);
				}
				rpl.append(playlist, request.body.song, function(err,resp) {
					if ( !err ) {
						return d10.realrest.success({playlist: resp.playlist, song: resp.song }, request.ctx);
					}
					return d10.realrest.err(423,null,request.ctx);
				});
			});
		});
	});
	
	app.put("/api/plm/create",function(request,response) {
		var body = "";
		request.setEncoding("utf8");
		request.on("data",function(chunk) { body+=chunk; });
		request.on("end",function() {
			request.body = qs.parse(body);
			if ( !request.body.name || !request.body.name.length ) {
				return d10.realrest.err(427,"name parameter missing",request.ctx);
			}
			var songs = request.body["songs"] ? request.body["songs"] : [];
			if ( Object.prototype.toString.call(songs) !== '[object Array]' ) {
				songs = [ songs ];
			}
			rpl.create(request.ctx.user._id, request.body.name, songs,
					   function(err,playlist) {
						   if ( err ) {
							   d10.realrest.err(423,err,request.ctx);
						   } else {
							   d10.realrest.success(playlist, request.ctx);
						   }
					   }
				);
		});
	});
	
	app.put("/api/plm/rename/pl:id",function(request,response) {
		bodyDecoder()(request, response,function() {
			if ( !request.body.name || !request.body.name.length ) {
				return d10.realrest.err(427,"name parameter missing",request.ctx);
			}
			rpl.rename(request.ctx.user._id, "pl"+request.params.id, request.body.name,
					   function(err,playlist) {
						   if ( err ) {
							   d10.realrest.err(423,err,request.ctx);
						   } else {
							   d10.realrest.success(playlist, request.ctx);
						   }
					   }
			);
		});
	});
	
	app.delete("/api/plm/pl:id",function(request,response) {
		var playlist_id = "pl"+request.params.id;
		d10.couch.d10.getDoc(playlist_id,function(err, playlist) {
			if ( err ) {
				d10.realrest.err(423,err,request.ctx);
			}
			if ( playlist.user != request.ctx.user._id ) {
				return d10.realrest.err(403,"",request.ctx);
			}
			d10.couch.d10.deleteDoc(playlist,function(err,resp) {
				if ( err ) {
					return d10.realrest.err(423,err,request.ctx);
				}
				d10.realrest.success(playlist, request.ctx);
			});
		});
	});
};
