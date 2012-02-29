var http = require("http"),
	querystring = require("querystring"),
	Url = require("url"),
	events = require("events");

var CONNECTION_DEFAULTS = {
  host: '127.0.0.1',
  port: 5984,
  hostname: '127.0.0.1',
  pathname: "/"
};

var REMOVE_ON_DOC_STORAGE = [ '_conflicts','_revisions','_revs_info' ];
var DO_NOT_JSON_ENCODE = [ "rev", "startkey_docid", "endkey_docid" ];

var serverInstances = {};

function ncouch (url) {

	var uri = Url.parse(url);
	uri.__proto__ = CONNECTION_DEFAULTS;

	var srvurl = uri.pathname ;

	var httpRequest;

	// node v0.5 detector
	if ( http.globalAgent ) {
		//node >= 0.5 
		var agent = new http.Agent();
		agent.maxSockets = 50;
		httpRequest = function(uri, settings, cb) {
			var request = http.request(
				{
					host: uri.hostname,
					port: uri.port ? uri.port : 80,
					method: settings.type,
					path: settings.url,
					headers: settings.headers,
					agent: agent
				},
				cb
			);
// 			request.on("error",err);
			return request;
		};
		
		
	} else {
		//increase the max number of connections to the couch
		if ( "getAgent" in http ) {
			http.getAgent(uri.host, uri.port).maxSockets = 50;
		}
		//node 0.4
		httpRequest = function(uri, settings, cb) {
			var client = http.createClient(uri.port ? uri.port : 80, uri.hostname);
			var request = client.request(settings.type,settings.url ? settings.url : "",settings.headers);
			request.on("response",cb);
			return request;
		};
	}

	
	
	

	var components = {
		database: {}
	};

	var debug=false;
	var requestsCount = 0;
	
// 	console.log(uri);
	
	var serverQuery = this.query = function (options) {
		var settings = {
			type: "GET",
			complete: function() {},
			data: null,
			body: null,
			headers: {}
		};
		
		requestsCount++;
		var ruid = requestsCount;
		
		var defaultHeaders = {
			"Accept": "application/json, text/html, text/plain, */*",
			"Content-Type": "application/json"
		};
				
		for (var i in options ) {
			settings[i] = options[i];
		}
		
		for ( var i in defaultHeaders ) {
			if ( !settings.headers[i] ) {
				settings.headers[i] = defaultHeaders[i];
			}
		}

		if ( settings.body ) {
			settings.headers["Content-Length"] = Buffer.byteLength(settings.body);
		}
		/*
		var client = http.createClient(uri.port ? uri.port : 80, uri.hostname);
		if ( debug ) {
			console.log("request",settings.type,settings.url);
		}
// 		console.log("request",settings);
		var request = client.request(settings.type,settings.url ? settings.url : "",settings.headers);
		request.on("response",function(resp) {
			if ( debug ) {
				console.log(ruid,"request response: ",resp.statusCode);
			}
			resp.setEncoding("utf8");
			var body = "";
			resp.on("data",function(d) { body+=d;});
			resp.on("error", function() {
				settings.complete(resp.statusCode,null,
						 {
							statusCode: resp.statusCode,
							headers: JSON.parse(JSON.stringify(resp.headers)),
							query: options
						 }
				);
			});
			resp.on("end",function() {
				if ( body.length && resp.headers["content-type"] == "application/json" ) {
					try {
						var b = JSON.parse(body);
						body = b;
					} catch (e) {
					}
				}
				if ( debug ) {
					console.log(ruid,"request body: ",body);
				}
				settings.complete(null,body,
						 {
							statusCode: resp.statusCode,
							headers: JSON.parse(JSON.stringify(resp.headers)),
							query: options
						 }
				);
			});
		});
		*/
		var request = httpRequest(
			uri, 
			settings,
			function(resp) {
				if ( debug ) {
					console.log(ruid,"request response: ",resp.statusCode);
				}
				resp.setEncoding("utf8");
				var body = "";
				resp.on("data",function(d) { body+=d;});
				resp.on("error", function() {
					settings.complete(resp.statusCode,null,
							{
								statusCode: resp.statusCode,
								headers: JSON.parse(JSON.stringify(resp.headers)),
								query: options
							}
					);
				});
				resp.on("end",function() {
					if ( body.length && resp.headers["content-type"] == "application/json" ) {
						try {
							var b = JSON.parse(body);
							body = b;
						} catch (e) {}
					}
					if ( debug ) {
						console.log(ruid,"request body: ",body);
					}
					settings.complete(null,body,
						{
							statusCode: resp.statusCode,
							headers: JSON.parse(JSON.stringify(resp.headers)),
							query: options
						}
					);
				});
			}
		);
        try {
          request.end( settings.body ? settings.body : null );
        } catch(e) {
          console.log("############## ncouch can't write ##################");
          throw e;
        }
	};
	

	
	var prepareCouchQuery = function(options) {
		var settings = {
			type: "GET",
			data: {},
			body: null,
			url: ""
		};		
		for ( var i in options ) {	settings[i] = options[i] ; }
		settings.type = settings.type.toUpperCase();
		var keys = {},unsetKeys = false;
		Object.keys(settings.data).forEach(function(key){
			if ( key == "keys" ) {
				settings.body = {keys: settings.data.keys};
				settings.type="POST";
				unsetKeys = true;
			} else {
				if ( DO_NOT_JSON_ENCODE.indexOf(key) < 0 ){
					keys[key] = JSON.stringify(settings.data[key]);
				} else {
					keys[key] = settings.data[key];
				}
			}
		});
		if ( unsetKeys ) delete settings.data.keys;
		
		
		settings.url = settings.url.replace(/^\/+/,"/");
		
		var query = querystring.stringify(keys);
		if ( query && query.length )	settings.url += "?"+query;
		
		if ( settings.body && typeof settings.body != "string" ) {
			settings.body = JSON.stringify( settings.body );
		}
		if ( debug ) {
			console.log("request body",settings.body);
		}
		return settings;
	};
	
	var _query = function(query, statusCodes, callback) {
		statusCodes = statusCodes || [200];
		query = prepareCouchQuery(query);
		callback = callback || function() {};
		
		query.complete = function(err, resp, meta) {
			if ( statusCodes.indexOf( parseInt(meta.statusCode,10) ) > -1 ) {
				var body = query.dataFilter ? query.dataFilter( resp ) : resp;
				callback(
					null, 
					body,
					meta);
				if ( query.event ) {
					query.event(null,body,meta,resp);
				}
			} else {
				var err =  body && typeof body == "object" ? body : {};
				if ( !err.statusCode )	err.statusCode = (meta && meta.statusCode) ? meta.statusCode : 499;
				callback(err,body,meta);
			}
		};
// 		console.log(query);
		return serverQuery(query);
	}
	
	
	var createDatabase = function(name,cb) {
		var dburl = srvurl+"/"+encodeURIComponent(name);
		_query({url: dburl, type: "PUT"},[201],cb);
	};
	
	var databaseExists = function(name,cb) {
		var dburl = srvurl+"/"+encodeURIComponent(name);
		var callback = function(err,resp,meta) {
			if ( err ) {
				return cb(err,resp);
			}
			if ( meta.statusCode == 200 ) {
				return cb(null,true);
			} else {
				return cb(null,false);
			}
		};
		_query({url: dburl, type: "GET"},[200,404],callback);
	};
				
	var _database = function(name) {
		var dburl = srvurl+"/"+encodeURIComponent(name);
			
		var wrapper = new events.EventEmitter();
		wrapper.getDoc = function(id, data, cb) {
			var options = {};
			if ( ! cb &&  typeof data == "function" ) {
				cb = data;
				data = {};
			}
			options.data = data;
			options.event = function(err,resp,meta) { 
				wrapper.emit("get",resp,meta);
			};
			options.url = dburl+"/"+encodeURIComponent(id);
			if ( id.match(/^_design\//) ) {
				options.url = dburl+"/"+id;
			}
			_query(options,null,cb);
		};

		
		wrapper.storeDoc = function ( doc, cb ) {
			var options = {
				url: doc._id ? dburl+"/"+encodeURIComponent(doc._id) : dburl,
				type: doc._id ? "PUT":"POST",
				data: doc._rev ? {rev: doc._rev} : {},
				event: function(err,resp,meta) {
					wrapper.emit("save",err,doc,meta);
				},
				dataFilter: function(resp) {
					doc._id = resp.id;
					doc._rev = resp.rev;
					return doc;
				},
				body: doc
			};
			
			REMOVE_ON_DOC_STORAGE.forEach(function(v) {
				if ( doc[v] )	delete doc[v];
			});
			
			_query(options,[200,201],cb);			
		};
		
		wrapper.deleteDoc = function(doc, cb) {
			if ( typeof doc == "string" ) {
				wrapper.getDoc(doc, function(err,resp,meta) {
					if ( err ) {
						cb(err,resp,meta);
					} else {
						wrapper.deleteDoc(resp,cb);
					}
				});
			}
			if ( !doc || !doc._id )	return false;
			if ( !doc._rev ) {
				return wrapper.deleteDoc(doc._id,cb);
			}
			var options = {
				url: dburl+"/"+encodeURIComponent(doc._id) ,
				type: "DELETE",
				data: {rev: doc._rev},
				event: function(err,resp,meta) {
					wrapper.emit("delete",err,resp,meta);
				},
				dataFilter: function(resp) {
					doc._rev = resp.rev;
					doc._deleted = true;
					return doc;
				}
			};
			if ( doc._id.match(/^_design\//) ) {
                                options.url = dburl+"/"+doc._id;
                        }	
			_query(options,[200],cb);	
		};
		
		wrapper.storeDocs = function(docs,data,cb) {
			if ( ! cb &&  typeof data == "function" ) {
				cb = data;
				data = {};
			}
			var options = {
				body: {docs:[]},
				type: "POST",
				url: dburl+"/_bulk_docs",
				dataFilter: function(resp) {
					if ( Object.prototype.toString.call(resp) !== '[object Array]' ) {
						return resp;
					}
					options.body.docs.forEach(function(d,k) {
						if ( resp[k].rev ) {
							d._id = resp[k].id;
							d._rev = resp[k].rev;
						}
					});
					return options.body.docs;
				},
				emit: function(err,body,meta,resp) {
					resp.forEach(function(v,k) {
						if ( v.rev ) {
							if( v._deleted ) {
								wrapper.emit("delete",err,body[k],meta);
							}else{
								wrapper.emit("save",err,body[k],meta);
							}
						}
					});
				}
			}, doc;
			
			while ( doc = docs.shift() ) {
				REMOVE_ON_DOC_STORAGE.forEach(function(v) {
					if ( doc[v] )	delete doc[v];
				});
				options.body.docs.push(doc);
			}
			_query(options,[200,201],cb);
		}
		
		wrapper.deleteDocs = function(docs,data,cb) {
			docs.forEach(function(doc) {
				doc._deleted=true;
			});
			return wrapper.storeDocs(docs,data,cb);
		};
		
		wrapper.getAllDocs = function (data,cb) {
			if ( ! cb &&  typeof data == "function" ) {
				cb = data;
				data = {};
			}
			var options = {
				url: dburl+"/_all_docs" ,
				 type: "GET",
				 data: data,
				 event: function(err,resp,meta) {
					 wrapper.emit("allDocs",err,resp,meta);
				 }
			};
			_query(options,[200],cb);
		};
		
		wrapper.view = function(view, data, cb) {
			var parts = view.split("/",2);
			if ( parts.length < 2 ) {
				return false;
			}
			if ( ! cb &&  typeof data == "function" ) {
				cb = data;
				data = {};
			}
			var options = {
				url: dburl+"/_design/"+encodeURIComponent(parts[0])+"/_view/"+encodeURIComponent(parts[1]) ,
				type: "GET",
				data: data,
				event: function(err,resp,meta) {
					wrapper.emit("view",err,resp,meta);
				}
			};
			_query(options,[200],cb);
		};
		
		wrapper.list = function(list,data,cb) {
			var parts = list.split("/",4);
			if ( parts.length < 3 ) {
				return false;
			}
			if ( ! cb &&  typeof data == "function" ) {
				cb = data;
				data = {};
			}
			var url = dburl+"/_design/"+encodeURIComponent(parts[0])+"/_list/"+encodeURIComponent(parts[1])+"/" +encodeURIComponent(parts[2]) ;
			if ( parts.length == 4 ) {
				url+="/"+encodeURIComponent(parts[3]);
			}
			var options = {
				url:  url,
				type: "GET",
				data: data,
				event: function(err,resp,meta) {
					wrapper.emit("list",err,resp,meta);
				}
			};
			if ( parts.length == 4 )	options.url += "/"+encodeURIComponent(parts[3]);
			_query(options,[200],cb);
		};
		wrapper.show = function(show,data,cb) {
			var parts = view.split("/",3);
			if ( parts.length < 2 ) {
				return false;
			}
			if ( ! cb &&  typeof data == "function" ) {
				cb = data;
				data = {};
			}
			var options = {
				url: dburl+"/_design/"+encodeURIComponent(parts[0])+"/_show/"+encodeURIComponent(parts[1]),
				type: "GET",
				data: data,
				event: function(err,resp,meta) {
					wrapper.emit("show",err,resp,meta);
				}
			};
			if ( parts.length == 3 )	options.url += "/"+encodeURIComponent(parts[2]);
			_query(options,[200],cb);
		};
		
		wrapper.updateDoc = function(path, data,cb) {
			var parts = path.split("/",3);
			if ( parts.length < 2 ) {
				return false;
			}
			if ( ! cb &&  typeof data == "function" ) {
				cb = data;
				data = {};
			}
			var options = {
				url: dburl+"/_design/"+encodeURIComponent(parts[0])+"/_update/"+encodeURIComponent(parts[1]),
				type: "PUT",
				data: data,
				event: function(err,resp,meta) {
					wrapper.emit("updateDoc",err,resp,meta);
				}
			};
			if ( parts.length == 3 )	options.url += "/"+encodeURIComponent(parts[2]);
			_query(options,[200,201],cb);
		}
		
		wrapper.changes = function(data, cb) {
			var options = {};
			if ( ! cb &&  typeof data == "function" ) {
				cb = data;
				data = {};
			}
			options.data = data;
			options.url = dburl+"/_changes";
			_query(options,null,cb);
		};
		
		wrapper.infos = function(cb) {
			options.url = dburl+"/_changes";
			_query(options,null,cb);
		};
		
		
		/*
		 * var db = ncouch.server("http://localhost:5984/").database("testing");
		 * db.paginatedChanges(20, {filter: "appointments/all"}, function(rows) {
		 * 	console.log("Got new rows from the changes feed: ",rows);
		 * }, function(err,last_seq) {
		 * 	if ( err ) {
		 * 		console.log("An error occured during DB transaction",err);
		 *	} else {
		 * 		console.log("changes feed ended, last_seq:",last_seq);
		 * 	}
		 * });
		 * 
		 */
		
		wrapper.paginatedChanges = function(limit, options, cb, endcb) {
			wrapper.infos(function(err,dbInfos) {
				if ( err )	return endcb(err);
				var since = options.since ? options.since : 0,
					lastSeq = dbInfos.last_seq,
					fetchPart = function() {
						options.since = since;
						options.limit = limit;
						wrapper.changes(options, function(err,resp) {
							if ( err )	return endcb(err);
							var resultsLength = resp.results.length;
							cb(resp.results);
							
							if ( resultsLength < limit || resp.last_seq == lastSeq ) {
								ecb(null,resp.last_seq);
							} else {
								if ( resultsLength ) {
									since = resp.last_seq;
								}
								fetchPart();
							}
						});
					};
				fetchPart();
			});
		};
		
		wrapper.batchObjectsSize = 100;
		
		wrapper.forEach = function(data,cb, then) {
			data = data || {};
			if ( !then ) {
				then = cb;
				cb = null;
			}
// 			rows = [];
			data.limit = batchObjectsSize + 1;
			data.include_docs = true;
			var e = new EventEmitter();
			var _parseOne = function(rows) {
				rows.forEach(
					function(row) {
						if ( cb ) { cb(row.doc); }
						e.emit("doc",row.doc);
					}
				);
			};
			var _forOne = function() {
				wrapper.getAllDocs(data, function(err,resp) {
					if ( err ) { if ( then ) { then(err); } e.emit("complete",err); return ;}
					// check length of response
					if ( resp.rows.length == (wrapper.batchObjectsSize + 1) ) {
						var latest = resp.rows.pop();
						data.startkey       = latest.key;
						data.startkey_docid = latest.id ;
						_parseOne(resp.rows);
						_forOne();
					} else {
						//we're at the end of the stream
						_parseOne(resp.rows);
						if ( then ) { then(); }
						e.emit("complete");
					}
				});
			};
			_forOne();
			return e;
		};
		
		wrapper.filter = function(data, cb, then) {
			var back = [];
			var e = wrapper.forEach(data);
			e.on("doc",function(doc) {if ( cb(doc) == true ) {back.push(doc);} });
			e.on("complete",then(back));
		};
		
		wrapper.map = function(data, cb, then) {
			var back = [];
			var e = wrapper.forEach(data);
			e.on("doc",function(doc) {back.push(cb(doc));});
			e.on("complete",then(back));
		};
		
		return wrapper;
	};
	
	this.database = function(name) {
		if ( !components.database[name] ) {
			components.database[name] = _database(name); 
		}
		return components.database[name]
	}
	
	this.debug = function() {
		if ( !arguments.length ) {
			return debug;
		}
		debug = arguments[0] ? true : false;
		return this;
	}
	
	this.createDatabase = createDatabase;
	this.databaseExists = databaseExists;
	
};

exports.server = function(url) {
	if ( ! serverInstances[url] ) {
		serverInstances[url] = new ncouch(url);
	}
	return serverInstances[url];
};
