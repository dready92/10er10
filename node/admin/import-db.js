var prompt = require("prompt"),
		fs = require("fs"),
	config = require("../config");

var target, dirname, d10;



var getTarget = function() {
	prompt().ask("Which db to import to ? production (p) or test (t)","target")
	.tap(
		function(vars) {
			target = vars.target.toString().replace(/\s+$/,"");
			//console.log(target);
			if ( target != "p" && target != "t" ) {
				console.log("Bad answer... need p or t");
				process.exit(1);
			}
			if ( target == "p" ) {
                		config.couch = config.couch_prod;
		        } else {
                		config.couch = config.couch_dev;
		        }
		        d10 = require("../d10");
		        console.log("using databases ",config.couch);

		}
	).ask("Please give the directory to read files from :","dirname")
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

		var dbs = [];
		for ( var i in config.couch ) {
			dbs.push(i);
	        }

		var checkFile = function() {
			if ( !dbs.length ) {
				return setupConfig();
			}
			var db = dbs.pop();
			fs.stat(dirname+"/"+db+"-design.json",function(err,stat) {
				if ( err ) {
					console.log("Error: file "+dirname+"/"+db+"-design.json");
					process.exit(1);
				}else {
					console.log("File "+dirname+"/"+db+"-design.json found");
				}
				checkFile();
			});
		};
		checkFile();

	});
};

var setupConfig = function() {


	var todo = [];
	var then = function(err) {
		if ( err ) {
			console.log("Failed to import DB: ",err);
			process.exit(1);
		}
		if ( todo.length ) {
			todo.pop()();
		} else {
			console.log("End of import");
			process.exit(0);
		}
	};


	for ( var i in config.couch ) {
		todo.push(
			(function(cfg) {
				return function() { importDb(cfg,then);};
			})(i)
		);
	}

	then();
};


var importDb = function(db,then) {
	console.log("importing ",db);
	var filename = dirname+"/"+db+"-design.json";
	fs.readFile(filename,function(err,str) {
		if ( err ) {
			console.log("Can't read "+filename);
			then(err);
		} else {
			var design = null;
			try {
				design = JSON.parse(str);
			} catch (e) { design = null }
			if ( !design ) {
				then ( {message: "JSON parsing failed"} );
			} else {
				var insertOne = function() {
					if ( !design.length ) {
						return then();
					}
					var doc = design.pop();
					console.log("Inserting "+doc._id);
					d10.couch[db].deleteDoc(doc._id,function(err,resp,m) {
						if ( err )	console.log(err,resp,m);
						d10.couch[db].storeDoc(doc,function(err,resp) {
							if ( err ) {
								then(err);
							} else {
								insertOne();
							}
						});
					});
				};
				insertOne();
			}
		}
	});
};




getTarget();


