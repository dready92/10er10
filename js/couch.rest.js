// node.js ?
if ( process ) {
	function isObjectType(obj, type) {
// 		return !!(obj && type && type.prototype && obj.constructor == type.prototype.constructor);
// 		debug(obj,typeof obj);
		return ( typeof obj == type ) ;
	}

	if ( !querystring ) {
		var querystring = require("querystring");
	}
	if ( !XMLHttpRequest ) {
		var XMLHttpRequest = require("./XMLHttpRequest").XMLHttpRequest;
	}

	var $ = {
		extend: function() {
			var _extend = function(a,b) {
// 				debug("_extend",b);
				for ( var bkey in b ) {
					a[bkey] = b[bkey];
// 					debug("setting key ",bkey);
				}
			};
// 			debug("extend : enter");
			var args = Array.prototype.slice.call(arguments);
			if ( args.length < 2 ) {
				return false;
			}
			var base = args.shift();
			if ( !isObjectType(base,"object") ) {
				return false;
			}
			var current;
// 			debug("args size: ",args.length);
			while ( current = args.shift() ) {
// 				debug("test",current);
				if ( isObjectType(current,"object") || isObjectType(current,"function") ) {
// 					debug("extending");
					_extend(base, current);
				}
			}
// 			debug("returning first object");
			return base;
		},
		param: function(o) {
			return querystring.stringify(o);
		},
		noop: function(){},
		globalEval: function(){}
	};
	
	var debug = function() { console.log.apply(console,arguments); }
	
}



	
	
	var newXhr = function() {
		if (typeof(XMLHttpRequest) != "undefined") {
			return new XMLHttpRequest();
		} else if (typeof(ActiveXObject) != "undefined") {
			return new ActiveXObject("Microsoft.XMLHTTP");
		} else {
			throw new Error("No XMLHTTPRequest support detected");
		}
	};
	
	var defaultSettings = {
		contentType: "application/json"
	};
	
	var successfulCode = function( code ) {
		try {
			// IE error sometimes returns 1223 when it should be 204 so treat it as success, see #1450
			return !code && location.protocol === "file:" ||
				// Opera returns 0 when status is 304
				( code >= 200 && code < 300 ) ||
				code === 304 || code === 1223 || code === 0;
		} catch(e) {}

		return false;
	};
	
	$.restDefaults = function(opts) {
			if ( !opts )	return defaultSettings;
			if ( opts.contentType )	defaultSettings.contentType = opts.contentType;
	};
	
	/*
	 * ex : $.rest ( "GET", "/test/res1.json",{
			successCodes: function (code) { return (code == 200);} ,
			response: function(response) { //this is the third parameter of $.rest call , response is object {statusCode:, statusMessage:, body:, headers:} },
			success: function(body,response) { //this is the third parameter of $.rest call , body is response.body, response is object {statusCode:, statusMessage:, body:, headers:} },
 			error: function(body,response) { //this is the third parameter of $.rest call , body is response.body, response is object {statusCode:, statusMessage:, body:, headers:} },
			complete: function() { //this is the third parameter of $.rest call },
			data: GET or POST data to send (will be urlencoded),
			body: POST or PU data to send (will be sent asis),
			dataType: cf. jQuery ajax dataType option : however in this version, if you specify json as contentType, and json decoding fail, text response is set as the response body,
			contentType: cf. jQuery ajax contentType option
		});
	*
	* 
	*/
	
	$.rest = function (method, url, opts) {
		if ( !opts.successCodes ) {
			opts.successCodes = successfulCode;
		}
		if ( opts.response ) {
			opts.initialResponse = opts.response;
		}
		opts.response = function(r) {
// 			debug("launching response callbacks");
			var success = this.successCodes(r.statusCode);
			if ( success && this.success && this.success.call )	this.success.call(this,r.body,r);
			if ( !success && this.error && this.error.call )	this.error.call(this,r.body,r);
			if ( this.initialResponse && this.initialResponse.call )		this.initialResponse.call(this,r.body,r);
		};
		return $.restRaw(method,url,opts);
	};
	
	$.restRaw = function ( method, url, opts ) {
		var s = $.extend({
			data: {}, 
			body: null, 
			response: null, 
			async: true,
			accepts: {
						xml: "application/xml, text/xml",
						html: "text/html",
						script: "text/javascript, application/javascript",
						json: "application/json, text/javascript",
						text: "text/plain",
						_default: "*/*"
					}
		},opts);
		var status, data;
		var type = method.toUpperCase();
		if ( s.body && typeof s.body == "object" ) {
			s.body = JSON.stringify(s.body);
		}
		if ( s.type == "PUT" || s.type == "POST" ) {
			if ( !s.body && s.data && typeof s.data == "object" ) {
				s.body = $.param(s.data);
				s.data = null;
			}
		}	else if ( s.data  ) { url += "?"+$.param(s.data); }


		var requestDone = false;

		var response = {statusCode: null, statusMessage: null, body: null, headers: null };
		
		// Create the request object
		var xhr =newXhr();

		if ( !xhr ) { return; }

		// Open the socket
		// Passing null username, generates a login popup on Opera (#2865)
		if ( s.username ) {
			xhr.open(type, url, s.async, s.username, s.password);
		} else {
// 			debug(type, url, s.async);
			xhr.open(type, url, s.async);
		}

		// Need an extra try/catch for cross domain requests in Firefox 3
		try {
			// Set the correct header, if data is being sent
			if ( type == "POST" && !s.contentType ) {
				xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
			} else {
				xhr.setRequestHeader("Content-Type", s.contentType ? s.contentType : defaultSettings.contentType);
			}

			// Set header so the called script knows that it's an XMLHttpRequest
			// Only send the header if it's not a remote XHR
// 			if ( !remote ) {
// 				xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
// 			}

// 			// Set the Accepts header for the server, depending on the dataType
// 			xhr.setRequestHeader("Accept", s.dataType && s.accepts[ s.dataType ] ?
// 				s.accepts[ s.dataType ] + ", */*" :
// 				s.accepts._default );
		} catch(e) {}

		var httpData = function (xhr, type ) {
			var ct = xhr.getResponseHeader("content-type") || "",
				xml = type === "xml" || !type && ct.indexOf("xml") >= 0,
				data = xml ? xhr.responseXML : xhr.responseText;

			if ( xml && data.documentElement.nodeName === "parsererror" ) {
				 return "parsererror" ;
			}
// 			debug("in httpData : ",data);
			// The filter can actually parse the response
			if ( typeof data === "string" ) {
				// Get the JavaScript object, if JSON is used.
				if ( type === "json" || !type && ct.indexOf("json") >= 0 ) {
// 					debug("in httpData : ",data);
					try {
						data = JSON.parse( data );
					} catch (e) {}
// 					debug("in httpData : ",data);

				// If the type is "script", eval it in global context
				} else if ( type === "script" || !type && ct.indexOf("javascript") >= 0 ) {
					$.globalEval( data );
				}
			}
			return data;
		};
		
		var handleError = function (s, xhr, status, errMsg) {};

		
		// Set the Accepts header for the server, depending on the dataType
		xhr.setRequestHeader("Accept", s.dataType && s.accepts[ s.dataType ] ?
		s.accepts[ s.dataType ] + ", */*; q=0.01" :
		s.accepts._default );
		
		
		// Wait for a response to come back
		var onreadystatechange = xhr.onreadystatechange = function( isTimeout ) {
// 			debug("onreadystatechange", xhr.readyState);
			// The request was aborted
			if ( !xhr || xhr.readyState === 0 || isTimeout === "abort" ) {
				// Opera doesn't call onreadystatechange before this point
				// so we simulate the call
				if ( !requestDone ) {
					complete();
				}

				requestDone = true;
				if ( xhr ) {
					xhr.onreadystatechange = $.noop();
					xhr = null;
				}
				// The transfer is complete and the data is available, or the request timed out
			} else if ( !requestDone && xhr && (xhr.readyState === 4 || isTimeout === "timeout") ) {
				requestDone = true;
				xhr.onreadystatechange = $.noop();

				try {
					response.headers = xhr.getAllResponseHeaders();
				} catch (e) {}
				try {
					// process the data (runs the xml through httpData regardless of callback)
					data = httpData( xhr, s.dataType ? s.dataType : null );
// 					debug("data",data);
				} catch(err) { }
				response.body = data;
				if ( isTimeout === "timeout" ) {
					response.statusCode = 408;
					response.statusMessage = "Request Timeout";
				}
				else
				{
					try { response.statusCode = xhr.status ; } catch (e) {}
					try { response.statusMessage = xhr.statusText ; } catch (e) {}
				}
				
// 				debug("/*callin*/g ? ", require("util").inspect(s));
				if ( s.response )	s.response.call(s,response);
				
				if ( isTimeout === "timeout" ) {
					xhr.abort();
				}

				// Stop memory leaks
				if ( s.async ) {
					xhr = null;
				}
			}
		};

		// Override the abort handler, if we can (IE doesn't allow it, but that's OK)
		// Opera doesn't fire onreadystatechange at all on abort
		try {
			var oldAbort = xhr.abort;
			xhr.abort = function() {
				if ( xhr ) {
					oldAbort.call( xhr );
				}

				onreadystatechange( "abort" );
			};
		} catch(e) { }

		// Timeout checker
		if ( s.async && s.timeout > 0 ) {
			setTimeout(function() {
				// Check to see if the request is still happening
				if ( xhr && !requestDone ) {
					onreadystatechange( "timeout" );
				}
			}, s.timeout);
		}

		// Send the data
		try {
			console.log(type,":",url,": sending data",s.body);
			xhr.send( s.body ? s.body : null );
		} catch(e) {
// 			console.log(e);
// 			console.log(s.body, s.data);
			response.statusCode = 499;
			response.statusMessage = "Unable to send the request";
			if ( s.response )	s.response.call(s,response);
			// Fire the complete handlers
			complete();
		}

		function complete() {
			// Process result
			if ( s.complete ) { s.complete.call( s ); }
		}
		
		// return XMLHttpRequest to allow aborting the request etc.
		return xhr;
	}



	
	// options :
	//		data: query parameters (as in jQuery)
	//		body: premade body to send as is (ex sending JSON)
	//		response: callback when the rest query is done (aither successful or in error)
	//		success: callback when the rest query is successful
	//		error : callback when the rest query is in error
	//		successCodes: callback (taking the rest status code in argument) that should return true if the rest query is successful
	var queryAndTest = function(method,url,options) {
		$.rest(method,url,options);
	};
	
	var prepareViewQuery = function(client) {
		var qp = client.queryParameters;
		client.queryParameters = {};
		var back = {method: "GET",data: null,body: null};
		if ( qp.keys ) {
			back.body = JSON.stringify({keys: qp.keys});
			delete qp.keys;
			back.method="POST";
		}
		back.data = qp;
		return back;
	}
	
	//view options validation helpers
	var ensureInt = function(v) {
		v = parseInt(v,10);
		return isNaN(v) ? false : v;
	};
	
	var getBoolean = function(v) {
		return v ? true : false;
	};
	
	
	$.joc = function ( dsn, database, options ) {
		var client = {
			dsn: dsn.replace(/\/+$/,""),
			database: database,
			options: typeof options == "object" ? options : {},
			queryParameters: {},
			propertiesToRemoveOnStorage: ["_conflicts","_revisions","_revs_info"],
			getServerUri: function() {
				return this.dsn;
			},
			getDatabaseUri: function() {
				return this.getServerUri()+"/"+encodeURIComponent(this.database);
			},
			getDatabaseName: function () {
				return this.database;
			},
			listDatabases: function(opts) {
				var settings = $.extend({successCodes: function(c) {return ( c == 200 ) ;}, dataType: "json" },this.options,opts);
				queryAndTest("GET",this.getServerUri()+"/_all_dbs",settings);
				return true;
			},
			createDatabase: function (opts) {
				var settings = $.extend({successCodes: function(c) {return ( c == 201 ) ;}, dataType: "json" },this.options,opts);
				queryAndTest("PUT",this.getDatabaseUri(),settings);
				return true;
			},
			deleteDatabase: function (opts) {
				var settings = $.extend({successCodes: function(c) {return ( c == 200 ) ;}, dataType: "json" },this.options,opts);
				queryAndTest("DELETE",this.getDatabaseUri(),settings);
				return true;
			},
			getDatabaseInfos: function(opts) {
				var settings = $.extend({successCodes: function(c) {return ( c == 200 ) ;}, dataType: "json" },this.options,opts);
				queryAndTest("GET",this.getDatabaseUri(),settings);
				return true;
			},
			// two specific options : ifTrue & ifFalse
			// this method overrides opts.success & opts.successCodes
			databaseExists: function(opts) {
				opts.success = function(data, restResponse) {
					if ( restResponse.status == 200 && this.ifTrue ) {
						this.ifTrue.call(this,data,restResponse);
					} else if ( restResponse.status == 404 && this.ifFalse ) {
						this.ifFalse.call(this,data,restResponse);
					}
				};
				opts.successCodes = function(c) {return ( c == 200 || c == 404 ) ;};
				this.getDatabaseInfos(opts);
				return true;
			},
			compactDatabase: function(opts) {
				var settings = $.extend({successCodes: function(c) {return ( c == 202 ) ;}, dataType: "json" },this.options,opts);
				queryAndTest("POST",this.getDatabaseUri()+"/_compact",settings);
				return true;
			},
			cleanupDatabaseViews: function(opts) {
				var settings = $.extend({successCodes: function(c) {return ( c == 202 ) ;}, dataType: "json" },this.options,opts);
				queryAndTest("POST",this.getDatabaseUri()+"/_view_cleanup",settings);
				return true;
			},
			getDoc: function (opts, id) {
				if ( typeof id != "string" || !id.length ) {
					return false;
				}
				if ( id.match(/^_design\//) ) {
					id = "/_design/"+encodeURIComponent(id.replace(/^_design\//,""));
				} else {
					id = encodeURIComponent(id);
				}
				opts.data = $.extend( this.queryParameters, opts.data ? opts.data : {} );
				var settings = $.extend({successCodes: function(c) {return ( c == 200 ) ;}, dataType: "json" },this.options,opts);
				queryAndTest("GET",this.getDatabaseUri()+"/"+id,settings);
				return true;
			},
			storeDoc: function(opts,doc) {
				if ( typeof doc != "object" ) return false;
				for ( var index in doc ) {
					if ( this.propertiesToRemoveOnStorage.indexOf(index) >= 0 ) {
						delete doc[index];
					}
				}
				var method = "POST",
					url = this.getDatabaseUri();
				if ( doc._id ) {
					url+="/"+encodeURIComponent(doc._id);
					method = "PUT";
				}
				var settings = $.extend({successCodes: function(c) {return ( c == 200 || c == 201 ) ;}, dataType: "json", body: doc },this.options,opts);
// 				console.log(method,url,settings);
				queryAndTest(method,url,settings);
				return true;
			},
			updateDoc: function(opts, ddoc, handler, doc_id) {
				var url = this.getDatabaseUri()+"/_design/"+encodeURIComponent(ddoc)+"/_update/"+encodeURIComponent(handler)+"/";
				if ( doc_id && doc_id.length ) url+=encodeURIComponent(doc_id);
				var settings = $.extend({successCodes: function(c) {return ( c == 200 || c == 201 ) ;}, dataType: "json" },this.options,opts);
				queryAndTest("PUT",url,settings);
			},
			deleteDoc: function(opts,doc){
				if ( typeof doc != "object" || !doc._id || !doc._rev ) return false;
// 				console.log("delete doc : start");
				var settings = $.extend({successCodes: function(c) {return ( c == 200 ) ;}, dataType: "json",data: {rev: doc._rev} },this.options,opts);
				queryAndTest("DELETE",this.getDatabaseUri()+"/"+encodeURIComponent(doc._id),settings);
				return true;
			},
			copyDoc: function(opts,doc_id, new_doc_id) {
				var settings = $.extend({successCodes: function(c) {return ( c == 200 ) ;}, dataType: "json" },this.options,opts);
				queryAndTest("COPY",this.getDatabaseUri()+"/"+encodeURIComponent(doc._id),settings,new_id);
			},
			storeDocs: function(opts,docs,allOrNothing) {
				for ( var i = 0, len = docs.length; i < len; i++) {
					for ( var index in docs[i] ) {
						if ( this.propertiesToRemoveOnStorage.indexOf(index) >= 0 ) {
							delete docs[i][index];
						}
					}
				}
				if ( opts.data ) delete opts.data;
				var body = {docs: docs};
// 				opts.data.docs = docs;
				if ( allOrNothing )	body.allOrNothing = true;
				var settings = $.extend({successCodes: function(c) {return ( c == 200 || c == 201 ) ;}, dataType: "json" , contentType: "application/json", body: JSON.stringify(body)},this.options,opts);
				queryAndTest("POST",this.getDatabaseUri()+"/_bulk_docs",settings);
				return true;
			},
			deleteDocs: function(opts,docs,allOrNothing) {
				for ( var i = 0, len = docs.length; i < len; i++) {
					for ( var index in docs[i] ) {
						if ( this.propertiesToRemoveOnStorage.indexOf(index) >= 0 ) {
							delete docs[i][index];
							
						}
					}
					docs[i]._deleted = true;
				}
				opts.data = opts.data ? opts.data : {};
				opts.data.docs = docs;
				if ( allOrNothing )	data.allOrNothing = true;
				var settings = $.extend({successCodes: function(c) {return ( c == 200 || c == 201 ) ;}, dataType: "json" },this.options,opts);
				queryAndTest("POST",this.getDatabaseUri()+"/_bulk_docs",settings);
				return true;
			},
			getView: function(opts,ddoc,handler) {
				if ( !ddoc || !ddoc.length || !handler || !handler.length ) return false;
				var url = this.getDatabaseUri()+"/_design/"+encodeURIComponent(ddoc)+"/_view/"+encodeURIComponent(handler);
				var q = prepareViewQuery(this);
				var settings = $.extend(
					{
						successCodes: function(c) {return ( c == 200 || c == 201 ) ;}, 
						dataType: "json",
						data: q.data, 
						body: q.body,
						contentType: "application/json"
					},this.options,opts);
				queryAndTest(q.method,url,settings);
				return true;
			},
			getList: function(opts,ddoc,handler,view) {
				if ( !ddoc || !ddoc.length || !handler || !view )	return false;
				var url = this.getDatabaseUri()+"/_design/"+encodeURIComponent(ddoc)+"/_list/"+encodeURIComponent(handler)+"/"+encodeURIComponent(view);
				var q = prepareViewQuery(this);
				var settings = $.extend({successCodes: function(c) {return ( c == 200 || c == 201 ) ;}, dataType: "json",data: q.data, body: q.body },this.options,opts);
				queryAndTest(q.method,url,settings);
				return true;
			},
			getForeignList: function(opts,ddoc,handler,view_ddoc, view_handler) {
				if ( !ddoc || !ddoc.length || !handler || !view_ddoc || !view_handler )	return false;
				var url = this.getDatabaseUri()+"/_design/"+encodeURIComponent(ddoc)
							+"/_list/"+encodeURIComponent(handler)
							+"/"+encodeURIComponent(view_ddoc)+"/"+encodeURIComponent(view_handler);
				var q = prepareViewQuery(this);
				if ( opts.data && typeof opts.data == "object" ) {
					$.extend(q.data,opts.data);
					opts.data = q.data;
				}
				var settings = $.extend({successCodes: function(c) {return ( c == 200 || c == 201 ) ;}, dataType: "json",data: q.data, body: q.body },this.options,opts);
				queryAndTest(q.method,url,settings);
				return true;
			},
			getShow: function(opts, ddoc, handler, doc_id) {
				if ( !ddoc || !handler ) return false;
				var url = this.getDatabaseUri()+"/_design/"+encodeURIComponent(ddoc)+"/_show/"+encodeURIComponent(handler);
				if ( doc_id )	url+="/"+encodeURIComponent(doc_id);
				var settings = $.extend({successCodes: function(c) {return ( c == 200 || c == 201 ) ;}, dataType: "json" },this.options,opts);
				queryAndTest("GET",url,settings);
				return true;
			},
			getAllDocs: function(opts) {
				var url = this.getDatabaseUri()+"/_all_docs";
				var q = prepareViewQuery(this);
// 				console.log(q);
				var settings = $.extend(
					{
						successCodes: function(c) {return ( c == 200 || c == 201 ) ;}, 
						dataType: "json",
						data: q.data,
						contentType: "application/json",
						body: q.body 
					},this.options,opts);
				queryAndTest(q.method,url,settings);
				return true;
			},
			getViewInfos: function(opts,ddoc) {
				if ( !ddoc ) return false;
				var settings = $.extend({successCodes: function(c) {return ( c == 200 ) ;}, dataType: "json" },this.options,opts);
				queryAndTest("GET", this.getDatabaseUri()+"/_design/"+encodeURIComponent(ddoc)+"/_info", settings);
				return true;
			},
			compactViews: function(opts,ddoc) {
				if ( !ddoc ) return false;
				var settings = $.extend({successCodes: function(c) {return ( c == 202 ) ;}, dataType: "json" },this.options,opts);
				queryAndTest("POST", this.getDatabaseUri()+"/_compact/"+encodeURIComponent(ddoc), settings);
				return true;
			},
			getUUIDs: function(opts, count) {
				v = ensureInt(v);
				if ( !v )	v = 1;
				var settings = $.extend({successCodes: function(c) {return ( c == 200 ) ;}, dataType: "json", data: {count: v} },this.options,opts);
				queryAndTest("GET",this.getServerUri()+"/_uuids",settings);
				return true;
			},
			
			
			
			open_revs: function(value) {
				if ( typeof value == "string" && value == "all" ) {
					this.queryParameters["open_revs"] = value;
				} else if ( typeof value == "array" ) {
					this.queryParameters["open_revs"] = JSON.stringify(value);
				}
				return this;
			},
			since: function(v) {
				v=ensureInt(v);
				if ( v !== false )	this.queryParameters.since = v;
				return this;
			},
			heartbeat: function(v) {
				v=ensureInt(v);
				if ( v !== false )	this.queryParameters.heartbeat = v;
				return this;
			},
			style: function(v) {
				this.queryParameters.style = style;
				return this;
			},
			conflicts: function(v) {
				if ( v )	this.queryParameters.conflicts = "true";
				return this;
			},
			revs: function(v) {
				if ( v )	this.queryParameters.revs = "true";
				return this;
			},
			revs_info: function(v) {
				if ( v )	this.queryParameters.revs_info = "true";
				return this;
			},
			rev: function(v) {
				this.queryParameters.rev = v;
				return this;
			},
			key: function(v) {
				this.queryParameters.key = JSON.stringify(v);
				return this;
			},
			keys: function(v) {
// 				console.log("setting keys");
// 				console.log(typeof v);
				if ( Object.prototype.toString.call(v) === '[object Array]' ) {
// 					console.log("really setting keys");
					this.queryParameters.keys = v;
				}
				return this;
			},
			startkey: function(v) {
				this.queryParameters.startkey = JSON.stringify(v);
				return this;
			},
			endkey: function(v) {
				this.queryParameters.endkey = JSON.stringify(v);
				return this;
			},
			startkey_docid: function(v) {
				this.queryParameters.startkey_docid = String(v);
				return this;
			},
			endkey_docid: function(v) {
				this.queryParameters.endkey_docid = String(v);
				return this;
			},
			limit: function(v) {
				v=ensureInt(v);
				if ( v !== false )	this.queryParameters.limit = v;
				return this;
			},
			skip: function(v) {
				v=ensureInt(v);
				if ( v !== false )	this.queryParameters.skip = v;
				return this;
			},
			stale: function(v) {
				if ( v == "ok" )	this.queryParameters.stale = v;
				return this;
			},
			reduce: function(v) {
				this.queryParameters.reduce = getBoolean(v);
				return this;
			},
			descending: function(v) {
				this.queryParameters.descending = getBoolean(v);
				return this;
			},
			include_docs: function(v) {
				this.queryParameters.include_docs = getBoolean(v);
				return this;
			},
			inclusive_end: function(v) {
				this.queryParameters.inclusive_end = getBoolean(v);
				return this;
			},
			group: function(v) {
				this.queryParameters.group = getBoolean(v);
				return this;
			},
			group_level: function(v) {
				v=ensureInt(v);
				if ( v !== false )	this.queryParameters.group_level = v;
				return this;
			},
		};
		return client;
	};
	
	
if ( process ) {
	exports.joc = $.joc;
}
