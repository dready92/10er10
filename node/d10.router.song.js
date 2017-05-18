var d10 = require ("./d10"),
    debug = d10.debug("d10:d10.router.song"),
	querystring = require("querystring"),
  bodyParser = require('body-parser'),
  jsonParserMiddleware = bodyParser.json(),
	urlencodedParserMiddleware = bodyParser.urlencoded({extended: true}),
	fs = require("fs"),
	files = require("./files"),
	when = require("./when"),
	audioUtils = require("./audioFileUtils"),
	gu = require("./graphicsUtils"),
	spawn = require('child_process').spawn,
	exec = require('child_process').exec,
    EventEmitter = require("events").EventEmitter,
    songProcessorEmitter = require("./lib/song-processor/song-processor-events"),
    songProcessor = require("./lib/song-processor");

exports.api = function(app) {
	app.get("/api/review/list", function(request, response) {
		d10.couch.d10.view("user/song",{key: [request.ctx.user._id,false],include_docs: true},function(err,resp) {
			if ( err ) {
				d10.realrest.err(423, d10.http.statusMessage(423), request.ctx.headers );
				return ;
			}
			var r = [];
			if( resp.rows && resp.rows.length ) {
				resp.rows.forEach(function(v) { r.push(v.doc); });
			}
			d10.realrest.success(r,request.ctx);
		});
	});
	app.get("/html/my/review", function(request,response) {
		request.ctx.headers["Content-Type"] = "text/html";
		d10.couch.d10.view("user/song",{key: [request.ctx.user._id,false],include_docs: true},function(err,resp) {
			if ( err ) {
				response.writeHead(423, d10.http.statusMessage(423), request.ctx.headers );
				response.end();
				return ;
			}
			response.writeHead(200, request.ctx.headers );
			if( resp.rows && resp.rows.length ) {
				var r = [];
				resp.rows.forEach(function(v) { r.push(v.doc); });
				d10.lngView(request,"review/list",{rows: r},{},function(data) {
					response.end(data);
				});
			} else {
				d10.lngView(request,"review/none",{},{},function(data) {
					response.end(data);
				});
			}
		});
	});

	app.put("/api/meta/:id", urlencodedParserMiddleware, function(request,response,next) {
		if ( request.params.id.substr(0,2) != "aa" ) {
			return next();
		}
		if ( !request.body.length ) {
			return d10.realrest.err(417,"no parameter sent",request.ctx);
		}
		var fields = {};
		var errors = {};
		fields.title = request.body.title ? d10.sanitize.string(request.body.title) : "";
		fields.artist = request.body.artist ? d10.sanitize.string(request.body.artist) : "";
		if ( !d10.config.allowCustomGenres ) {
			fields.genre = request.body.genre? d10.sanitize.genre(request.body.genre) : "";
		} else {
			fields.genre = request.body.genre && request.body.genre.length ? request.body.genre : "Other";
		}
		when (
			{
				title: function(cb) {
					if ( !fields.title.length ) {
						d10.lngView(request,"inline/review_err_no_title",{},{},cb);
					} else {
						cb();
					}
				},
				artist: function(cb) {
					if ( !fields.artist.length ) {
						d10.lngView(request,"inline/review_err_no_artist",{},{},cb);
					} else {
						cb();
					}
				},
				genre: function(cb) {
					if ( !fields.genre.length ) {
						d10.lngView(request,"inline/review_err_unknown_genre",{},{},cb);
					} else {
						cb();
					}
				}
			},
			function(errs,responses) {
				if ( responses.title && responses.title.length ) {
					errors.title = responses.title;
				}
				if ( responses.artist && responses.artist.length ) {
					errors.artist = responses.artist;
				}
				if ( responses.genre && responses.genre.length ) {
					errors.genre = responses.genre;
				}
				if ( d10.count(errors) ) {
/*						request.ctx.headers["Content-Type"] = "application/json";
					response.writeHead(200,request.ctx.headers);
					response.end(JSON.stringify(
						{
							status: "error",
							data: {
								code: 6,
								message: d10.http.statusMessage(425)
							},
							fields: errors
						}
									));*/
					d10.realrest.err(412,errors,request.ctx);
					return ;
				}
				if ( request.body.album ) {
					fields.album = d10.sanitize.string(request.body.album);
				} else {
					fields.album="";
				}
				if ( request.body.tracknumber && !isNaN(parseInt(request.body.tracknumber,10)) ) {
					fields.tracknumber = parseInt(request.body.tracknumber,10);
				} else {
					fields.tracknumber = 0;
				}
				if ( request.body.date && !isNaN(parseInt(request.body.date,10)) ) {
					fields.date= parseInt(request.body.date,10);
				} else {
					fields.date = 0;
				}

				fields.valid = true;
				fields.reviewed = true;

				d10.couch.d10.getDoc(request.params.id,function(err,doc) {
					if ( err ) {
						d10.realrest.err(err.statusCode, err.statusMessage, request.ctx);
						return ;
					}

					if ( doc.user != request.ctx.user._id && !request.ctx.user.superman ) {
						debug("debug",request.ctx.user._id,"Not allowed to edit", doc._id);
						d10.realrest.err(403, "Forbidden", request.ctx);
						return ;

					}

					for ( var i in fields ) {
						doc[i] = fields[i];
					}
					d10.couch.d10.storeDoc(doc, function(err,resp) {
						if ( err ) {
							debug("debug","storeDoc error");
							d10.realrest.err(err.statusCode, err.statusMessage, request.ctx);
						}else {
							debug("debug","storeDoc success");
							d10.realrest.success(doc,request.ctx);
							d10.couch.d10wi.storeDoc({_id: doc._id, hits: 0});
						}
					});
				});
			}
		);
	});




	app.put("/api/song", function(request,response) {
		if ( !request.query.filename || !request.query.filename.length
			|| !request.query.filesize || !request.query.filesize.length ) {
			return d10.realrest.err(427,"filename and filesize arguments required",request.ctx);
		}
      var bgencoding = false;
      if ( request.query.bgencoding ) {
        bgencoding = true;
      }
      var songId = "aa"+d10.uid();
      var userId = request.ctx.user._id;
      var proxyRequestEvents = ["data", "end", "error", "close"];
      var proxyConnectionEvents = ["error"];
      var onend = function(data) {
        if ( data.userId != userId || data.songId != songId ) {
          return;
        }
        songProcessorEmitter.removeListener("end",onend);
        if ( data.status == "error" ) {
          d10.realrest.err(data.code, data.data, request.ctx);
        } else if ( data.status == "success" ) {
          d10.realrest.success(data.data, request.ctx);
        }
      };
      var onuploadend = function(data) {
        if ( data.userId != userId || data.songId != songId ) {
          return;
        }
        songProcessorEmitter.removeListener("uploadEnd",onuploadend);
        d10.realrest.success({id: songId, status: "uploadEnd"}, request.ctx);
      };

      if ( bgencoding ) {
        songProcessorEmitter.on("uploadEnd",onuploadend);
      } else {
        songProcessorEmitter.on("end",onend);
      }

      songProcessor(
        songId,
        request.query.filename,
        parseInt(request.query.filesize,10),
        userId,
        request,
        songProcessorEmitter
      );

	});
};
