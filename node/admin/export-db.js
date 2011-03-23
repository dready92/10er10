var prompt = require("prompt"),
		fs = require("fs"),
	config = require("../config");

var target, dirname, d10;



var getTarget = function() {
	prompt().ask("Which config to export ? production (p) or test (t)","target")
	.tap(
		function(vars) {
			target = vars.target.toString().replace(/\s+$/,"");
			//console.log(target);
			if ( target != "p" && target != "t" ) {
				console.log("Bad answer... need p or t");
				process.exit(1);
			}
		}
	).ask("Please give the directory to write files to :","dirname")
        .tap(
                function(vars) {
                        dirname = vars.dirname.toString().replace(/\s+$/,"");
                        if ( dirname.length == 0 ) {
                                dirname = ".";
                        }
                        checkDirname();
                }
        ).end();
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
		config.couch = config.couch_prod;
	} else {
		config.couch = config.couch_dev;
	}
	d10 = require("../d10");
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
					delete doc._rev;
					design.push(doc);
				});
				fs.writeFile(dirname+"/"+db+"-design.json",JSON.stringify(design),then);
			}
		});
};




getTarget();


