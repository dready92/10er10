var d10 = require ("./d10"),
	bodyDecoder = require("connect/middleware/bodyDecoder"),
	querystring = require("querystring"),
	exec = require('child_process').exec;

exports.api = function(app) {

	app.get("/api/pagination/:sort", function(request,response) {
		var sortTypes = [ "hits","ts_creation","album","artist","genre","title","s_user","s_user_likes" ],
		db = d10.db.db("d10");
		
		var preHooks = {
			hits: function() {
				db.reduce(false).descending(true);
			},
			ts_creation: function() {
				db.reduce(false).descending(true);
			},
			album: function() {
				if ( request.query.album && request.query.album.length ) {
					db.startkey( [request.query.album] ).endkey([request.query.album,[]]);
				}
				db.reduce(false);
			},
			artist: function() {
				if ( request.query.artist && request.query.artist.length ) {
					db.startkey( [request.query.artist] ).endkey([request.query.artist,[]]);
				}
				db.reduce(false);
			},
			genre: function() {
				if ( !request.query.genre || d10.config.genres.indexOf(request.query.genre) < 0 ) {
					return d10.rest.err(428, request.query.genre, request.ctx);
				}
				db.reduce(false).startkey([request.query.genre]).endkey([request.query.genre,[]]);
			},
			title: function () {
				db.reduce(false);
				if ( request.query.title && request.query.title.length ) {
					db.startkey([request.query.title]).endkey([request.query.title,[]]);
				}
			},
			s_user: function () {
				db.startkey([request.ctx.user._id]).endkey([request.ctx.user._id,[]]);
			},
			s_user_likes: function () {
				db.startkey([request.ctx.user._id]).endkey([request.ctx.user._id,[]]);
			}
		};
		
		if ( sortTypes.indexOf(request.params.sort) < 0 ){
			return d10.rest.err(427, request.params.sort, request.ctx);
		}
		if ( preHooks[request.params.sort] && preHooks[request.params.sort].call ) {
			preHooks[request.params.sort].call(this);
		}
		
// 		$data = $this->couch_ci->getForeignList("pagination","mapping",$this->uri->segment(3),"name",
//              array('rpp'=>$this->config->item('rpp')));
		db.getForeignList(
			{
				data: {rpp: d10.config.rpp},
				success: function(resp) {
					d10.rest.success(resp.pages,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, request.params.sort, request.ctx);
				}
			},
			"pagination",
			"mapping",
			request.params.sort,
			"name"
		);
		
		
	});


	app.get("/api/ts_creation",function(request,response) {
		var db = d10.db.db("d10").include_docs(true).reduce(false).descending(true).limit(d10.config.rpp);
// 		d10.log("debug",request.query);
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
			request.query["startkey[]"][0] = parseInt(request.query["startkey[]"][0]);
			db.startkey_docid( request.query.startkey_docid ).startkey( request.query["startkey[]"] );
		}
		
		db.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, request.params.sort, request.ctx);
				}
			},
			"ts_creation",
			"name"
		);
		
	});

	app.get("/api/hits",function(request,response) {
		var db = d10.db.db("d10").include_docs(true).reduce(false).descending(true).limit(d10.config.rpp);
// 		d10.log("debug",request.query);
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
			request.query["startkey[]"][0] = parseInt(request.query["startkey[]"][0]);
			db.startkey_docid( request.query.startkey_docid ).startkey( request.query["startkey[]"] );
		}
		
		db.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, request.params.sort, request.ctx);
				}
			},
			"hits",
			"name"
		);
		
	});
	
	app.get("/api/titles/titles",function(request,response) {
		var db = d10.db.db("d10").include_docs(true).reduce(false).limit(d10.config.rpp);
// 		d10.log("debug",request.query);
		if ( request.query.title && request.query.title.length ) {
// 			d10.log("debug",request.url,"setting endkey");
			db.endkey([request.query.title,[]]);
		}
		
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
// 			request.query["startkey[]"][0] = parseInt(request.query["startkey[]"][0]);
			db.startkey_docid( request.query.startkey_docid ).startkey( request.query["startkey[]"] );
		}
		
		db.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, request.params.sort, request.ctx);
				}
			},
			"title",
			"name"
		);
		
	});
	
	app.get("/api/artists/artists",function(request,response) {
		var db = d10.db.db("d10").include_docs(true).reduce(false).limit(d10.config.rpp);
// 		d10.log("debug",request.query);
		if ( request.query.artist && request.query.artist.length ) {
// 			d10.log("debug",request.url,"setting endkey");
			db.endkey([request.query.artist,[]]);
		}
		
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
// 			request.query["startkey[]"][0] = parseInt(request.query["startkey[]"][0]);
			db.startkey_docid( request.query.startkey_docid ).startkey( request.query["startkey[]"] );
		}
		
		db.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, request.params.sort, request.ctx);
				}
			},
			"artist",
			"name"
		);
		
	});
	
	app.get("/api/albums/albums",function(request,response) {
		var db = d10.db.db("d10").include_docs(true).reduce(false).limit(d10.config.rpp);
		if ( request.query.album && request.query.album.length ) {
			db.endkey([request.query.album,[]]);
		}
		
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
			request.query["startkey[]"][1] = parseInt(request.query["startkey[]"][1]);
			db.startkey_docid( request.query.startkey_docid ).startkey( request.query["startkey[]"] );
		}
		
		db.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, resp, request.ctx);
				}
			},
			"album",
			"name"
		);
		
	});
	
	app.get("/api/songs/s_user",function(request,response) {
		var db = d10.db.db("d10").include_docs(true).endkey([request.ctx.user._id,[]]).limit(d10.config.rpp);
		
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
// 			request.query["startkey[]"][1] = parseInt(request.query["startkey[]"][1]);
			db.startkey_docid( request.query.startkey_docid ).startkey( request.query["startkey[]"] );
		}
		
		db.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, resp, request.ctx);
				}
			},
			"s_user",
			"name"
		);
		
	});
	

	app.get("/api/usersongs",function(request,response) {
		var db = d10.db.db("d10").include_docs(true).endkey([request.ctx.user._id,[]]).limit(d10.config.rpp);
		
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
			// 			request.query["startkey[]"][1] = parseInt(request.query["startkey[]"][1]);
			db.startkey_docid( request.query.startkey_docid ).startkey( request.query["startkey[]"] );
		}
		
		db.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, resp, request.ctx);
				}
			},
			"s_user_likes",
			"name"
		);
		
	});
	
	
	/*
	 
	 function usersongs_get() {
		 log_message('debug',print_r($_REQUEST,true));
		 $this->couch_ci->include_docs(true);
		 if ( $this->get("startkey") ) {
			 $this->couch_ci->startkey($this->get("startkey"));
} else {
	$this->couch_ci->startkey( array($this->login->user->id()) );
}
$this->couch_ci->limit($this->config->item('rpp'))->endkey( array( $this->login->user->id(),array() ) );
try {
	$back = $this->couch_ci->getView('s_user_likes',"name");
} catch (Exception $e) {
	return $this->response( json_error(4));
}
return $this->response( json_success($back) );
}

*/
	
	
	
	app.get("/api/genres/genres",function(request,response) {
		if ( !request.query.genre || d10.config.genres.indexOf(request.query.genre) < 0 ) {
			return d10.rest.err(428, request.query.genre, request.ctx);
		}
		var db = d10.db.db("d10").include_docs(true).reduce(false).limit(d10.config.rpp);
		if ( request.query.startkey_docid && request.query["startkey[]"] ) {
			db.startkey_docid( request.query.startkey_docid ).startkey( request.query["startkey[]"] );
		}
		db.endkey([request.query.genre, {} ] );
		db.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function(resp) {
					return d10.rest.err(423, resp, request.ctx);
				}
			},
			"genre",
			"name"
		);
		
	});
	
	
	app.get("/api/title",function(request,response) {
		var db = d10.db.db("d10").inclusive_end(false);
		if ( request.query.start && request.query.start.length ) {
			var q = d10.ucwords(request.query.start);
			db.startkey([q]).endkey([d10.nextWord(q)]);
		}
		db.getList(
			{
				success: function(resp) {
// 					d10.log("debug",request.url, "success ! ");
// 					d10.log("debug",resp);
					response.writeHead(200, request.ctx.headers );
					response.end (
						JSON.stringify(resp.titles)
					);
// 					d10.rest.success(resp.titles,request.ctx);
				},
				error: function(a,b) {
// 					console.log("error ! ",a,b);
// 					d10.log("debug",a);
					response.writeHead(200, request.ctx.headers );
					response.end (
						"[]"
					);
				}
			},
			"title",
			"search",
			"search"
		   );
	});
	
	app.get("/api/artist",function(request,response) {
		var db = d10.db.db("d10").inclusive_end(false);
		if ( request.query.start && request.query.start.length ) {
			var q = d10.ucwords(request.query.start);
			db.startkey([q]).endkey([d10.nextWord(q)]);
		}
// 		d10.log("debug",request.url,"sending list request");
		db.getList(
			{
				success: function(resp) {
// 					d10.log("debug",request.url, "success ! ");
// 					d10.log("debug",resp);
					response.writeHead(200, request.ctx.headers );
					response.end (
						JSON.stringify(resp.artists)
					);
// 					d10.rest.success(resp.titles,request.ctx);
				},
				error: function(a,b) {
// 					console.log("error ! ",a,b);
// 					d10.log("debug",a);
					response.writeHead(200, request.ctx.headers );
					response.end (
						"[]"
					);
				}
			},
			"artist",
			"search",
			"search"
		   );
	});
	
	app.get("/api/album",function(request,response) {
		var db = d10.db.db("d10").inclusive_end(false);
		if ( request.query.start && request.query.start.length ) {
			var q = d10.ucwords(request.query.start);
			db.startkey([q]).endkey([d10.nextWord(q)]);
		}

		db.getList(
			{
				success: function(resp) {
// 					d10.log("debug",resp);
					response.writeHead(200, request.ctx.headers );
					response.end (
						JSON.stringify(resp.albums)
					);
				},
				error: function(a,b) {
					response.writeHead(200, request.ctx.headers );
					response.end (
						"[]"
					);
				}
			},
			"album",
			"search",
			"search"
		   );
	});
	
	app.get("/api/artistsListing",function(request,response) {
		d10.db.db("d10").group(true).group_level(1)
		.getView(
			{
				success: function(resp) {
					d10.rest.success(resp,request.ctx);
				},
				error: function (resp) {
					d10.rest.err(423, resp, request.ctx);
				}
			},
			"artist",
			"name"
		);
	});
	app.get("/api/genresResume",function(request,response) {
		d10.db.db("d10").group(true).group_level(1)
		.getView(
			{
				success: function(resp) {
					d10.rest.success(resp.rows,request.ctx);
				},
				error: function (resp) {
					d10.rest.err(423, resp, request.ctx);
				}
			},
			"genre",
			"artist"
		);
	});
	/*
  function title_get() {
//   $this->couch_ci->group(true)->group_level(1);
    if ( $this->input->get('start') ) {
      $q = ucwords($this->input->get('start'));
      $end = substr($q,-1);
      $end = chr(ord($end)+1);
      $end = substr($q,0,-1).$end;
      $this->couch_ci->startkey(array( $q ))->endkey(array( $end ));
    }
    try {
      $res = $this->couch_ci->getList('title','search','search');
    } catch ( Exception $e ) {
      log_exception($e);
      return $this->response( array() );
    }
    $this->response($res->titles);
	}

*/
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	

}; // exports.api