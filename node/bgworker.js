var config,
	configParser = require(__dirname+"/configParser"),
	d10 = null,
	messageQueue = [],
	jobs = {};

	jobs.updateSongsHits = require(__dirname+"/jobs/updateSongsHits");
	
	console.log(jobs);

configParser.getConfig(function(foo,cfg) {
	config = cfg;
	consumeQueue();
});

process.on("message",function(message) { 
	if ( !message || !message.type ) { return ; }
	messageQueue.push(message);
	consumeQueue();
});



var consumer = false;
var consumeQueue = function() {
	if ( consumer ) { return ; }
	if ( !config ) { return ; }
	if ( !d10 ) {
		//we search the message telling us the configuration we are in
		for ( var i in messageQueue ) {
			if ( messageQueue[i].type == "configuration" ) {
				console.log("background worker: configuration",messageQueue[i]);
				// cool we can configure in production or development mode
				if ( messageQueue[i].production ) {
					configParser.switchProd();
				} else {
					configParser.switchDev();
				}
				d10 = require(__dirname+"/d10");
				d10.setConfig(config);
				messageQueue.splice(i,1);
				messageQueue.push({type: "updateSongsHits"});
				return consumeQueue();
			}
		}
		// no configuration 
		return ;
	}
	
	var next = function() {
		if ( messageQueue.length ) {
			var job = messageQueue.splice(0,1)[0];
			if ( ! job.type in jobs ) {
				console.log("background worker: unknown job ",job);
				return next();
			}
				console.log("background worker: launching ",job);
			jobs[job.type](next);
		}
	};
	
	next();
};
