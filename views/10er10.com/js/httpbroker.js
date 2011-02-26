(function($){





function httpmanager ( base_url ) {

  var worker = new Worker(base_url+'js/httpworker.js');
  var that = this;
  var cache = {};

  this.active = function() {
    var count = 0;
    for ( var i in cache ) {
      count++;
    }
    return count;
  }

 var genUniqueId = function () {
    var result = "c" + Math.round(Math.random() * 424242);

    if ( cache[result] )
    {
        result = genUniqueId();
    }
    return result;
  };

  worker.onmessage = function(e){
    var data = e.data;
    try {
      data = JSON.parse(data);
    } catch (e) {
		if ( d10.debug && d10.debug_options.network ) {
			debug("BAD BAD : onmessage : unable to decode data",data);
		}
      return false;
    }
	if ( d10.debug && d10.debug_options.network ) {
		debug ("got worker message",data);
	}

    data.request = cache[data.request_id];
    data.request._stopTime  = new Date().getTime();
//     debug(data);
    /*
     * Handle "complete" callback option
     */
    if ( typeof data.request.complete == 'function' ) {
      if ( data.request.context && typeof data.request.context == 'object' ) {
        data.request.complete.call(data.request.context,data,data.status);
      } else {
        data.request.complete(data,data.status);
      }
    }

    /*
     * Handle "success" callback option
     */
    if ( typeof data.request.success == 'function' && data.status == 'success' ) {
      if ( data.request.context && typeof data.request.context == 'object' ) {
        data.request.success.call(data.request.context,data.data);
      } else {
        data.request.success(data.data);
      }
    }

    /*
     * Handle "error" callback option
     */
    if ( typeof data.request.error == 'function' && data.status != 'success' ) {
      if ( data.request.context && typeof data.request.context == 'object' ) {
        data.request.error.call(data.request.context,data,data.error);
      } else {
        data.request.error(data, data.error);
      }
    }

    if ( typeof data.request.callback == 'function' ) {
      if ( data.request.context && typeof data.request.context == 'object' ) {
        data.request.callback.call(data.request.context,data);
      } else {
        data.request.callback(data);
      }
    } else if ( data.request.callback.substr(0,13) == 'triggerEvent:' ) {
      debug('httpmanager triggering ',data.request.callback.substr(13));
      //debug(e.data);
      $(document).trigger(data.request.callback.substr(13),data);
    } else if ( data.request.callback.substr(0,8) == 'storeAs:' ) {
      $('body').data(data.request.callback.substr(8),data.data);
    } else if ( typeof that[data.request.callback] == 'function' ) {
      that[data.request.callback](data);
    } else {
		if ( d10.debug && d10.debug_options.network ) {
			debug("httpworker callback ",data.request.callback,' inconnu');
		}
    }
    delete cache[data.request_id];
  }


  this.request = function ( options, request_id ) {
    if ( ! options.url ) { return ; }
    if ( ! options.callback ) {     options.callback = 'ignore';    }
    if ( ! options.method   ) {     options.method   = 'GET';       }
    if ( ! options.dataType ) {     options.dataType = 'html';        }

    // generate unique ID
    if ( !request_id ) { request_id =  genUniqueId(); }

    options.request_id = request_id;
    cache[request_id]  = options;

    var request = {
      'request_id': request_id,
      'url': options.url,
      'method': options.method,
      'dataType': options.dataType
    };


    if ( options.data ) {
      if ( typeof options.data == 'object' )  request.toSend = $.param(options.data);
      else                                    request.toSend = options.data;
    }
    //debug(request);
    cache[request_id]._startTime  = new Date().getTime();
	if ( d10.debug && d10.debug_options.network ) {
		debug('http manager posting ',options.method,options.url,options);
	}
    worker.postMessage( JSON.stringify(request) );
  }

  this.ignore = function(response) {    return ;  }

  this.rud = function (response) { user.refresh_infos(); }
  this.loadPlaylist = function (response) {
    if ( response.data.status == 'success' ) {
      d10.playlist.loadPlaylist(response.data.data);
    }
  }
}






function httpbroker (num) {
  var http = {};
	var cache = [];
	var loop  = null;
	var requests_count = 0;

  this.init = function (base_url) {
    for ( var i = 0; i<num; i++ ) {
      http['http'+i] = new httpmanager(base_url);
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

	this.run  = function ( options, fipo ) {
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
			if ( d10.debug && d10.debug_options.network ) {
				debug("Request ",requests_count);
			}
			freeworker.request(cache.pop());
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

	this._request_singlehttp = function ( options ) {
		cache[cache.length] = options;
		if ( loop == null ) { this.run (); }
	}

	this._request_multihttp = function (options) {
		for ( var index in http ) {
			if ( !http[index].active() ) {
				http[index].request(options);
				return ;
			}
		}
		debug("no manager available... :-(");
	}

}

d10.bghttp = new httpbroker(10);

})(jQuery);