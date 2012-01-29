var config,
	configParser = require(__dirname+"/configParser"),
	d10 = null,
	messageQueue = [];


configParser.getConfig(function(foo,cfg) {
	config = cfg;
});

process.on("message",function(message) { 
	if ( !message || !message.type ) { return ; }
	messageQueue.push(message);
	consumeQueue();
});



var consumer = false;
var consumeQueue = function() {
	if ( consumer ) { return ; }
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
				d10.setConfig(config);
				messageQueue.splice(i,1);
				return consumeQueue();
			}
		}
		// no configuration 
		return ;
	}
};
