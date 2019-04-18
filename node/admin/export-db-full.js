var prompt = require("prompt"),
		fs = require("fs"),
	config = require("../config"),
	configParser = require('../configParser');
var d10 = require("../d10");
var target, dirname;



function getTarget() {
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
	prompt.get(properties, function (err, results) {
		if (err) {
			return console.log("Error: ", err);
		}
		target = results.target;
		dirname = results.dirname.replace(/\s+$/, "");
		if (dirname.length == 0) {
			dirname = ".";
		}
		checkDirname();
	});
}

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


	configParser.getConfig((err, config) => {
		if (target === 'p') {
			configParser.switchProd();
		} else {
			configParser.switchDev();
		}
		console.log("using databases ", config.couch);

		d10.setConfig(config).then(exportJob);
	});


}

function exportJob() {
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
			include_docs: true
		},
		function(err,resp) {
			if ( err ) {
				then(err);
			} else {
				var design = [];
				resp.rows.forEach(function(v) {
					var doc = v.doc;
					delete doc._rev;
					design.push(doc);
				});
				fs.writeFile(dirname+"/"+db+"-full.json",JSON.stringify(design),then);
			}
		});
};




getTarget();


