(function($){ 
	var jobWorker = function(url,onresponse) {
		var worker = new Worker(url);
		var callbacks = {};
		var running = this.running = false;
		this.sendJob = function(job,data,options) {
	// 		debug("got sendJob...");
			running = true;
			var settings = { "success": function() {}, "error": function() {}, "complete": function() {} };
			callbacks = {};
			$.extend(callbacks,settings,options);
	// 		debug("posting message",job,data);
			worker.postMessage( JSON.stringify({"job": job,"data": data}) );
		};
		worker.onmessage = function(e) {
	// 		debug("jobworker message",e);
			var data = null;
			try {
				data = JSON.parse(e.data);
				if ( !data ) { return sendError("parsererror"); }
			} catch(e) { return sendError("parsererror"); }
			if ( data.error ) { return sendError(data.error,data.message); }
			sendSuccess(data);
		};
		
		worker.onerror = function(e) { sendError("worker",e.message); };
		
		var sendError = function (err,data) {
			onresponse("error",err,data);
	// 		debug("job worker error",callbacks);
			callbacks.error ? callbacks.error(err,data): '';
			callbacks.complete ? callbacks.complete(err,data): '';
			callbacks = {};
			running = false;
		};
		
		var sendSuccess = function (data) {
			onresponse("success",data);
	// 		debug("job worker success",callbacks);
			callbacks.success ? callbacks.success(data) : '';;
			callbacks.complete ? callbacks.complete(data) : '';;
			callbacks = {};
			running = false;
		};
	
	};

	var jobs = function(url, count) {
	var workers = [];
	var dedicatedData = [];
	var i = 0;
	for ( i=1;i<=count;i++) {
		workers.push(
		new jobWorker (url,function() {})
		);
		dedicatedData.push({"queue": []});
	}
	
	this.push = function (job, data, options) {
		debug("push new job",job,data,options);
		if ( dedicated[job] ) {
		return sendDedicated(job,data,options);
		}
		for ( i=0; i<count;i++ ) {
		if ( workers[i].running == false ) {
			workers[i].sendJob(job,data,options);
			return true;
		}
		}
	//     debug("JOBS: no worker available, job dropped ! ",job,data,options);
		return false;
	};
	
	var dedicated = {
		"player": count-1,
		"enablePing": count-1
	};
	var dedicatedInterval = null;
	
	var sendDedicated = function(job,data,options) {
		var index = dedicated[job];
		dedicatedData[index].queue.push({"job":job,"data":data,"options":options});
		dedicatedIteration();
	};

	var queueTimeout = null;
	var dedicatedIteration = function () {
		if ( queueTimeout ) return ;
		
		var iterate = function () {
			debug("dedicated worker iteration starts");
			var skipped = 0;
			for ( var index in dedicatedData ) {
				if ( !workers[index].running ) {
					if ( dedicatedData[index].queue.length ) {
						var a = dedicatedData[index].queue.pop();
						workers[index].sendJob(a.job,a.data,a.options);
					}
				}
			}
			for ( var index in dedicatedData ) {
				if ( dedicatedData[index].queue.length ) {
					queueTimeout = setTimeout(iterate,1000);
					return;
				}
			}
			queueTimeout = null;
		};
		queueTimeout = setTimeout(iterate,1000);
	};
	};

	window.d10.fn.jobs = jobs;
})(jQuery);