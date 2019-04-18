var config,
	configParser = require("../configParser");

configParser.getConfig(function(err,resp) {
	if ( process.argv.length > 4 && process.argv[4] == "-p" ) {
		configParser.switchProd();
	}else {
		configParser.switchDev();
	}
	config = resp;
	onConfig();
});

function onConfig () {
	var d10 = require("../d10");
	d10.setConfig(config).then(onReady);
}

function onReady () {
	var d10 = require("../d10");

	if ( process.argv.length < 4 ) {
		console.log("Usage: "+process.argv[0]+" "+process.argv[1]+" login count [-p]");
		process.exit(1);
	}

	setTimeout(function() {

		var login = process.argv[2],
			count = parseInt(process.argv[3],10);
			if ( isNaN(count) ) {
				console.log(process.argv[3]+" is not a number");
				process.exit(1);
			}

		d10.couch.auth.view("infos/all",{key: ["login",login],include_docs:true}, function(err,resp) {
			if ( err ) {
				console.log(err,resp);
				console.log("Something went wrong when requesting database");
				process.exit(1);
			}
			if ( resp.rows.length == 0 ) {
				console.log("User "+login+" not found");
				process.exit(0);
			}
			var doc = resp.rows[0].doc;
			doc.invites = count;
			d10.couch.auth.storeDoc(doc,function(err,resp) {
				if ( err ) {
					console.log(err,resp);
					console.log("Unable to update user document "+doc._id);
					process.exit(1);
				}
				console.log("Done. Now restart node server or wait maximum 30 minutes (the maximum time for the session cache before it invalidates)");
			});
		});


	},5000);


	console.log("Giving user "+process.argv[2]+" "+process.argv[3]+" invites");
	console.log("Hit <Crtl>+C to cancel or wait 5 secs");

};

