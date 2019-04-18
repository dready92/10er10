var prompt = require("prompt"),
		fs = require("fs");
var target, dirname, d10;
var config,
	configParser = require("../configParser");

configParser.getConfig(function(err,resp) {
	if ( process.argv.length > 4 && process.argv[4] == "-p" ) {
		configParser.switchProd();
	}else {
		configParser.switchDev();
	}
	config = resp;
	getTarget();
});



var getTarget = function() {
	var properties = [
		{
			name: "target",
			message: "Which config to export ? production (p) or test (t)",
			empty: false,
			validator: /p|t/
		},
		{
			name: "dirname",
			message: "Please give the directory to write files to ",
			empty: false
		}
	];
	prompt.start();
	prompt.get(properties, function(err,results) {
// 		console.log(results);
		if ( err ) {
			return console.log("Error: ",err);
		}
		target = results.target;
		dirname = results.dirname.replace(/\s+$/,"");
		checkDirname();
	});
};

var checkDirname = function() {
	fs.stat(dirname,function(err,stat) {
		if ( err ) {
			console.log("Directory error : ", err.message);
			process.exit(1);
		}
		if ( !stat.isDirectory() ) {
			console.log("Directory error : ",dirname," is not a valid directory");
			process.exit(1);
		}
	});

	setupConfig();
};

var setupConfig = function() {
	if ( target == "p" ) {
		configParser.switchProd();
	} else {
		configParser.switchDev();
	}
	d10 = require("../d10");
	d10.setConfig(config).then(onReady);
}

function onReady () {
	console.log("using databases ",config.couch);

	var todo = [];
	var then = function(err) {
		if ( err ) {
			console.log("Failed to export DB: ",err);
			process.exit(1);
		}
		if ( todo.length ) {
			todo.pop()();
		} else {
			console.log("End of export");
			process.exit(0);
		}
	};


	for ( var i in config.couch ) {
		todo.push(
			(function(cfg) {
				return function() { exportDb(cfg,then);};
			})(i)
		);
	}

	then();
};


var exportDb = function(db,then) {
	console.log("exporting ",db);
	d10.couch[db].getAllDocs(
		{
			include_docs: true,
			startkey: "_design/",
			endkey: "_designa"
		},
		function(err,resp) {
			if ( err ) {
				then(err);
			} else {
				var design = [];
				resp.rows.forEach(function(v) {
					var doc = v.doc;
					if ( doc._id == "_design/user" || ! doc._id.match(/^_design\/us/) ) {
						delete doc._rev;
						design.push(doc);
					}
				});
				fs.writeFile(dirname+"/"+db+"-design.json",JSON.stringify(design),then);
			}
		});
};






