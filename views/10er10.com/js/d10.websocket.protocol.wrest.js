define(["js/config"], function(config) {
  var cache = {};
  var name = "wrest";
  var totalRequests = 1;
  
  var genUniqueId = function () {
      return totalRequests++;
  };
  
  function prepare(options, request_id) {
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
        'headers': {
          cookie: config.cookieName+"="+encodeURIComponent($.cookie(config.cookieName)),
          host: location.hostname
        }
    };


    if ( options.data ) {
    if ( typeof options.data == 'object' )  request.url += "?"+$.d10param(options.data);
    else                                    request.body = options.data;
    }
    
    if ( options.contentType ) {
        request.headers["Content-Type"] = options.contentType;
    }
    
    cache[request_id]._startTime  = new Date().getTime();
    return JSON.stringify(request);
  };
  
  function onmessage (wsMessage) {
    try {
      var data = JSON.parse( wsMessage );
    } catch(e) {
      debug("Bad websocket message ",wsMessage.data," can't be substringed");
      return ;
    }
    data.request = cache[data.request_id];
    delete cache[data.request_id];
    if ( data.contentType && /json/.test(data.contentType) ) {
      data.data = JSON.parse(data.body);
    } else {
      data.data = data.body;
    }
    data.code = data.statusCode;
    delete data.statusCode;
    delete data.body;
    if ( !data.request.restSuccessCodes ) {
      data.request.restSuccessCodes = [200];
    }
    if ( data.request.restSuccessCodes.indexOf( data.code ) == -1 ) { // server returned error
      data.request.complete.call(data, data.code, data.data);
    } else {
      data.request.complete.call(data, null, data.data);
    }
  };
  
  
  return {
    prepare: prepare,
    onmessage: onmessage,
    name: name
  };
  
});