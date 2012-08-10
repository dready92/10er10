"use strict";
define(["js/config"],function(config) {
    var requests_counter = 0;
    var requests = {};
    
    var launchCallbacks = function(type,callbacks, data) {
      if ( callbacks[type] ) {
        callbacks[type](data);
      }
      if ( callbacks.complete ) {
        callbacks.complete(data);
      }
    };
    
    var bindWebWorker = function(worker, options) {
      var settings = {complete: null, success: null, error: null};
      $.extend(settings,options);
      var sendError = function (err,data, request_id) {
        if ( request_id ) {
          if ( requests[request_id] ) {
            var callbacks = requests[request_id];
            delete requests[request_id];
            launchCallbacks("error",callbacks,data);
          }
        }
        launchCallbacks("error",settings,data);
      };
      var sendSuccess = function (data) {
        var request_id = data.request_id ? data.request_id : null;
        if ( request_id ) {
          if ( requests[request_id] ) {
            var callbacks = requests[request_id];
            delete requests[request_id];
            launchCallbacks("success",callbacks,data);
          }
        }
        launchCallbacks("success",settings,data);
      };
      
      worker.onmessage = function(e) {
        var data = null;
        try {
          data = JSON.parse(e.data);
          if ( !data ) { return sendError("parsererror"); }
        } catch(e) { return sendError("parsererror"); }
        if ( data.error ) { return sendError(data.error,data.message, data.request_id ? data.request_id : null); }
        sendSuccess(data);
      };
      worker.onerror = function(e) { sendError("worker",e.message, e.request_id ? e.request_id : null ); };

    };

  var worker = new Worker(config.base_url+"js/jobworker.js");
  bindWebWorker(worker, {});
  var jobs = {
    worker: worker,
    push: function(job,data,options) {
      this.sendJob(job,data,options);
    },
    sendJob: function(job,data,options) {
      var request_id = ++requests_counter;
      if ( options.success || options.error || options.complete ) {
        requests[request_id] = options;
      }
      this.worker.postMessage( JSON.stringify({"job": job,"data": data, request_id: request_id}) );
    }
  };
  return jobs;
});