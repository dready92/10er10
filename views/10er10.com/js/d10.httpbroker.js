"use strict";
define( ["js/config", "js/d10.toolbox", "js/d10.events", "js/d10.websocket",
        "js/d10.websocket.protocol.wrest"
        ], 
        function(config, toolbox, pubsub, websocket, websocketProtocolWrest) {
    
	function httpmanager ( domainUrl ) {
		// 	debug("worker base_url: ", domainUrl);
		var worker = new Worker(domainUrl+'js/httpworker.js');
		var that = this;
		var cache = {};
		var totalRequests = 1;
		
		this.active = function() {
			return toolbox.count(cache);
		}

		var genUniqueId = function () {
			return totalRequests++;
		};

		worker.onmessage = function(e){
			var data = e.data;
			try {
			data = JSON.parse(data);
			} catch (e) {
				if ( config.debug && config.debug_options.network ) {
					debug("BAD BAD : onmessage : unable to decode data",data);
				}
			return false;
			}
			if ( config.debug && config.debug_options.network ) {
				debug ("got worker message",data);
			}

			data.request = cache[data.request_id];
			data.request._stopTime  = new Date().getTime();
		//     debug(data);
			
			if ( typeof data.request.complete != 'function' ) {
				delete cache[data.request_id];
				return ;
			}
			if ( !data.request.restSuccessCodes ) {
				data.request.restSuccessCodes = [200];
			}
			if ( data.status == "error" ) { // client returned error
				data.request.complete.call(data, 999, data.error);
			} else if ( data.request.restSuccessCodes.indexOf( data.code ) == -1 ) { // server returned error
				data.request.complete.call(data, data.code, data.data);
			} else {
				data.request.complete.call(data, null, data.data);
			}
			delete cache[data.request_id];
            pubsub.topic("rest.time").publish({start: data.request._startTime, stop: data.request._stopTime});
		}


		this.request = function ( options, request_id ) {
			if ( ! options.url ) { return ; }
			if ( ! options.method   ) {     options.method   = 'GET';       }
			if ( ! options.dataType ) {     options.dataType = 'html';      }

			// generate unique ID
			if ( !request_id ) { request_id =  genUniqueId(); }

			options.request_id = request_id;
			cache[request_id]  = options;

			var request = {
				'request_id': request_id,
				'url': options.url,
				'method': options.method,
				'dataType': options.dataType,
				'restSuccessCodes': options.restSuccessCodes ? options.restSuccessCodes:null
			};


			if ( options.data ) {
			if ( typeof options.data == 'object' )  request.toSend = $.d10param(options.data);
			else                                    request.toSend = options.data;
			}
			
			if ( options.contentType ) {
				request.contentType = options.contentType;
			}
			
			//debug(request);
			cache[request_id]._startTime  = new Date().getTime();
			if ( config.debug && config.debug_options.network ) {
				debug('http manager posting ',options.method,options.url,options);
			}
			worker.postMessage( JSON.stringify(request) );
		}

	}






	function httpbroker (num) {
        var http = {};
        var cache = [];
        var loop  = null;
        var requests_count = 0;

		this.init = function (base_url) {
		// 	  var url = window.location.href.replace( new RegExp(base_url+"$","") , base_url);
				var url = base_url;
				for ( var i = 0; i<num; i++ ) {
					http['http'+i] = new httpmanager(url);
				}
		}

		this.get = function ( options ) {
			options.method   = 'GET';
			this.request(options);
		}

			this.post = function( options ) {
			options.method   = 'POST';
			this.request(options);
		}

		this.put = function( options ) {
			options.method   = 'PUT';
			this.request(options);
		}

		this.del = function( options ) {
			options.method   = 'DELETE';
			this.request(options);
		}

		this.request = function ( options ) {
			this.run(options);
		}
		
		this.sendViaWebSocket = function(options) {
          if ( !websocket.isValidProtocol("wrest") ) {
            return false;
          }
          if ( !websocket.socketReady() ) {
            return false;
          }
          if ( 
            websocket.send(websocketProtocolWrest.name,
                              websocketProtocolWrest.prepare(options)) 
             ) {
            return true;
          }
          return false;
        };
		
		this.run  = function ( options, fipo ) {
          if ( options && options.ws && this.sendViaWebSocket(options) ) {
            return ;
          }
			if ( typeof options == 'object' ) {
				if ( fipo ) { cache.push(options); } 
				else { cache.unshift(options); }
			}
			if ( cache.length == 0 ) {
				if ( loop != null ) {
					clearInterval(loop);
					loop = null;
				}
				return ;
			}

			var freeworker = this.getFreeWorker();
			if ( freeworker ) {
				requests_count++;
				if ( config.debug && config.debug_options.network ) {
					debug("Request ",requests_count);
				}
				freeworker.request(cache.pop(), requests_count);
			}

			if ( loop == null && cache.length && this.getFreeWorker() ) {
				setTimeout(function(me) { me.run(); },20,this);
				return ;
			}

			if ( loop == null && cache.length > 0 ) {
				loop = window.setInterval( function (me) { me.run(); },
				300,
				this);
			}
		}

		this.getFreeWorker = function () {
			for ( var index in http ) {
				if ( http[index].active() < 1 ) {
					return http[index];
				}
			}
		};
	};

	return new httpbroker(5);
});

