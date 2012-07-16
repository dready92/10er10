var config,
	configParser = require(__dirname+"/configParser"),
	d10 = null,
	messageQueue = [],
	working = false,
	jobs = {};

	jobs.updateSongsHits = require(__dirname+"/jobs/updateSongsHits");
	jobs.updateAlbumHits = require(__dirname+"/jobs/updateAlbumHits");
	jobs.updateArtistHits = require(__dirname+"/jobs/updateArtistHits");
	console.log(jobs);

configParser.getConfig(function(foo,cfg) {
	config = cfg;
	consumeQueue();
});

process.on("message",function(message) { 
    pushInQueue(message);
});



var consumer = false;

var pushInQueue = function(message) {
    if ( !message || !message.type ) { return ; }
    messageQueue.push(message);
    consumeQueue();
};

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
                enableReccurrentJobs();
				pushInQueue({type: "updateSongsHits"});
				pushInQueue({type: "updateAlbumHits"});
                return pushInQueue({type: "updateArtistHits"});
			}
		}
		// no configuration 
		return ;
	}
	
	var next = function(err) {
		working = false;
        if ( err ) {
            console.log("background worker: got an error on previous job: ",err);
        }
		if ( messageQueue.length ) {
			var job = messageQueue.splice(0,1)[0];
			if ( ! job.type in jobs ) {
				console.log("background worker: unknown job ",job);
				return next();
			}
			console.log("background worker: launching ",job);
			working = true;
			jobs[job.type](next);
		}
	};
	if ( !working ) {
		next();
	}
};


var enableReccurrentJobs = function() {
    setInterval(function() {
        pushInQueue({type: "updateSongsHits"});
		pushInQueue({type: "updateAlbumHits"})
		pushInQueue({type: "updateArtistHits"})
    },3600000*12); // 12 hours
};
