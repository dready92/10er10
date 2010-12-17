var util = require("util"),
	fs = require("fs"),
	http = require("http"),
	connect = require("connect"),
	files = require("./files"),
	stat = require("./serverstat"),
	httpHelper = require("./httpHelper"),
	couch = require("./couch.rest"),
	hash = require("./hash"),
	mustache = require("./mustache"),
	config = require("./config");

function staticRoutes(app) {
	var staticAudio = httpHelper.localPathServer("/audio","/var/www/html/audio");
	var staticContent = httpHelper.localPathServer("/css","/var/www/html/d10/css");
	var staticJs = httpHelper.localPathServer("/js","/var/www/html/d10/js");
	app.get("/audio/*",staticAudio);
	app.get("/js/*",staticJs);
	app.get("/css/*",staticContent);
};


var view = function(n,d,p,cb) {
	if ( !cb && p ) {
		cb = p;
		p = null;
	}
	fs.readFile(config.templates.node+n+".html","utf-8", function (err, data) {
		if (err) throw err;
		console.log(data);
		data = mustache.to_html(data,d,p);
		if ( cb )	cb.call(data,data);
	});
};


function homepage(app) {
	app.get('/', function(request, response, next){
		console.log(request.headers);
		response.writeHead(200, {'Content-Type': 'text/plain'});
		view("homepage",{scripts: config.javascript.includes},function(html) {
			response.end(html);
		});
    });
};



var test2 = function (req,res,next) { console.log("here 2 !");next(); };

connect.createServer( connect.logger(), require("./test1").test1, test2, connect.router(staticRoutes), connect.router(homepage)
).listen(8124);

// connect.createServer(connect.staticProvider("/var/www/html/audio")).listen(8118);
	

	var db = couch.joc("http://localhost:5984/","auth");
	db.limit(4).include_docs(true).getAllDocs({
		success: function(data) {			
// 			console.log("getAlldocs success",util.inspect(data)); 		
			data.rows.forEach(function(v,k) {
				console.log(v.doc);
			});
		},
		error: function(data) {			console.log("getAlldocs error"); 		},
	});
	
// 	console.log(hash.sha1("reggae4me"));
	
	
	/*
    app.post('/', function(request, response, next){
		console.log(request.headers);
		var fw = null;
		request.on("data",function(chunk) {
			if ( !fw ) {
				console.log("creating fileWriter");
				console.log(files);
				fw = new files.fileWriter("/tmp/test.ogg");
				fw.open();
			}
	// 		console.log("got request data chunk",typeof chunk);
			fw.write(chunk);
		});
		request.on("end",function() {
			console.log("got request end");
			if ( fw ) {
				fw.close(function (n) {console.log(n,"total bytes written");
					files.md5_file("/tmp/test.ogg", function(text) {
						response.writeHead(200, {'Content-Type': 'text/plain'});
						response.end('Hello World\n'+text+'\n');
						
					});
				});
			} else {
				response.writeHead(200, {'Content-Type': 'text/plain'});
				response.end('Nothing sent\n');
			}

		});
    });
    */