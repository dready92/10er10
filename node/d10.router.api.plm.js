var d10 = require ("./d10"),
	querystring = require("querystring"),
	rpl = require("./d10.rpl");

var successResp = function(data,ctx) {
	var back = {
		status: "success",
		data: data
	};
	ctx.response.writeHead(200, ctx.headers );
	ctx.response.end (
		JSON.stringify(back)
	);
};

var errResp = function(code, data,ctx) {
	if ( !ctx ) {
		ctx = data;
		data = null;
	}
	var back = {
		status: "error",
		data: {
			code: code,
			message: d10.http.statusMessage(code)
		}
	};
	if (data) {
		back.data.infos = data;
	}
	ctx.response.writeHead(200, ctx.headers );
	ctx.response.end (
		JSON.stringify(back)
	);
};

	
	
	
exports.api = function(app) {
	
	app.get("/api/plm/pl*",function(request,response) {
		rpl.playlistAndSongs("pl"+request.params[0],function(err,playlist) {
			if ( err ) {
				return errResp(423,null,request.ctx);
			}
			if ( playlist.user != request.ctx.user._id ) {
				return errResp(403,null,request.ctx);
			}
			successResp(playlist,request.ctx);
		});
	});
	
	app.put("/api/plm/update",function(request,response) {
		var body = "";
		request.setEncoding("utf8");
		request.on("data",function(chunk) { body+=chunk; });
		request.on("end",function() {
			request.body = querystring.parse(body)
			console.log(request.body,"after decode");
			if ( !request.body.playlist ) {
				return errResp(427,"playlist parameter is empty",request.ctx);
			}
			var songs = request.body["songs[]"] ? request.body["songs[]"] : [];
			if ( Object.prototype.toString.call(songs) !== '[object Array]' ) {
				songs = [ songs ];
			}
			d10.db.db("d10").getDoc(
				{
					success: function(playlist) {
						if ( playlist.user != request.ctx.user._id ) {
							return errResp(403,null,request.ctx);
						}
						rpl.update(playlist, songs, function(err,playlist) {
							if ( !err ) {
								return successResp({playlist: playlist}, request.ctx);
							}
							return errResp(423,null,request.ctx);
						});
					},
					error: function(resp) {
						return errResp(423,resp,request.ctx);
					}
				},
				request.body.playlist
			);
		});
	});
	
	
	app.put("/api/plm/append",function(request,response) {
		var body = "";
		request.setEncoding("utf8");
		request.on("data",function(chunk) { body+=chunk; });
		request.on("end",function() {
			request.body = querystring.parse(body)
			console.log(request.body,"after decode");
			if ( !request.body.playlist ) {
				return errResp(427,"playlist parameter is empty",request.ctx);
			}
			if ( !request.body.song ) {
				return errResp(427,"song parameter is empty",request.ctx);
			}
			
			d10.db.db("d10").getDoc(
				{
					success: function(playlist) {
						if ( playlist.user != request.ctx.user._id ) {
							return errResp(403,null,request.ctx);
						}
						rpl.append(playlist, request.body.song, function(err,resp) {
							if ( !err ) {
								return successResp({playlist: resp.playlist,song: resp.song }, request.ctx);
							}
							return errResp(423,null,request.ctx);
						});
					},
					error: function(resp) {
						return errResp(423,resp,request.ctx);
					}
				},
				request.body.playlist
			);
		});
	});
	
	app.put("/api/plm/create",function(request,response) {
		var body = "";
		request.setEncoding("utf8");
		request.on("data",function(chunk) { body+=chunk; });
		request.on("end",function() {
			request.body = querystring.parse(body);
			if ( !request.body.name || !request.body.name.length ) {
				return errResp(427,"name parameter missing",request.ctx);
			}
			var songs = request.body["songs[]"] ? request.body["songs[]"] : [];
			if ( Object.prototype.toString.call(songs) !== '[object Array]' ) {
				songs = [ songs ];
			}
			rpl.create(request.ctx.user._id, request.body.name, songs,
					   function(err,playlist) {
						   if ( err ) {
							   errResp(423,err,request.ctx);
						   } else {
							   successResp({playlist: playlist}, request.ctx);
						   }
					   }
				);
		});
	});
	
	app.put("/api/plm/rename",function(request,response) {
		var body = "";
		request.setEncoding("utf8");
		request.on("data",function(chunk) { body+=chunk; });
		request.on("end",function() {
			request.body = querystring.parse(body);
			if ( !request.body.name || !request.body.name.length ) {
				return errResp(427,"name parameter missing",request.ctx);
			}
			if ( !request.body.playlist || request.body.playlist.substr(0,2) != "pl" ) {
				return errResp(427,"playlist parameter missing",request.ctx);
			}
			rpl.rename(request.ctx.user._id, request.body.playlist, request.body.name,
					   function(err,playlist) {
						   if ( err ) {
							   errResp(423,err,request.ctx);
						   } else {
							   successResp({playlist: playlist}, request.ctx);
						   }
					   }
			);
		});
	});
	
	app.put("/api/plm/drop",function(request,response) {
		var body = "";
		request.setEncoding("utf8");
		request.on("data",function(chunk) { body+=chunk; });
		request.on("end",function() {
			request.body = querystring.parse(body);
			if ( !request.body.playlist || request.body.playlist.substr(0,2) != "pl" ) {
				return errResp(427,"playlist parameter missing",request.ctx);
			}
			
			d10.db.db("d10").getDoc(
				{
					success: function(playlist) {
						if ( playlist.user != request.ctx.user._id ) {
							return errResp(403,"",request.ctx);
						}
						d10.db.db("d10").deleteDoc(
							{
								success: function(resp) {
									playlist._rev = resp.rev;
									successResp({playlist: playlist}, request.ctx);
								},
								error: function(err) {
									errResp(423,err,request.ctx);
								}
							},
							playlist
						);
					},
					error: function(err) {
						errResp(423,err,request.ctx);
					}
				},
				request.body.playlist
			);
		});
	});
};