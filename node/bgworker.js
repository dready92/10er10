var config,
	configParser = require(__dirname+"/configParser"),
	d10 = null,
	messageQueue = [],
	working = false,
    debug = function() {console.log.apply(console, arguments);},
	jobs = {};

	jobs.updateSongsHits = require(__dirname+"/jobs/updateSongsHits");
	jobs.updateAlbumHits = require(__dirname+"/jobs/updateAlbumHits");
	jobs.updateArtistHits = require(__dirname+"/jobs/updateArtistHits");

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
				// cool we can configure in production or development mode
				if ( messageQueue[i].production ) {
					configParser.switchProd();
				} else {
					configParser.switchDev();
				}
				d10 = require(__dirname+"/d10");
                debug = d10.debug("d10:bgworker");
				d10.setConfig(config).then(() => {
					messageQueue.splice(i, 1);
					enableReccurrentJobs();
					pushInQueue({ type: "updateSongsHits" });
					pushInQueue({ type: "updateAlbumHits" });
					pushInQueue({ type: "updateArtistHits" });
				});
				return;
			}
		}
		// no configuration
		return ;
	}

	var next = function(err) {
		working = false;
        if ( err ) {
            debug("got an error on previous job: ",err);
        }
		if ( messageQueue.length ) {
			var job = messageQueue.splice(0,1)[0];
			if ( ! job.type in jobs ) {
				debug("unknown job ",job);
				return next();
			}
			debug("launching ",job);
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
