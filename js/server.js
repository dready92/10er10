var util = require("util"),
	fs = require("fs"),
	http = require("http"),
	connect = require("connect"),
	files = require("./files"),
	stat = require("./serverstat"),
	httpHelper = require("./httpHelper"),
	couch = require("./couch.rest"),
	hash= require("./hash");

	
// 	var httpErrorCodes = {
// 		100: "Continue",
// 		101: "Switching Protocols",
// 		200: "OK",
// 		201: "Created",
// 		202: "Accepted",
// 		203: "Non-Authoritative Information",
// 		204: "No Content",
// 		205: "Reset Content",
// 		206: "Partial Content",
// 		300: "Multiple Choices",
// 		301: "Moved Permanently",
// 		302: "Found",
// 		303: "See Other",
// 		304: "Not Modified",
// 		305: "Use Proxy",
// 		307: "Temporary Redirect",
// 		400: "Bad Request",
// 		401: "Unauthorized",
// 		402: "Payment Required",
// 		403: "Forbidden",
// 		404: "Not Found",
// 		405: "Method Not Allowed",
// 		406: "Not Acceptable",
// 		407: "Proxy Authentication Required",
// 		408: "Request Timeout",
// 		409: "Conflict",
// 		410: "Gone",
// 		411: "Length Required",
// 		412: "Precondition Failed",
// 		413: "Request Entity Too Large",
// 		414: "Request-URI Too Long",
// 		415: "Unsupported Media Type",
// 		416: "Requested Range Not Satisfiable",
// 		417: "Expectation Failed",
// 		500: "Internal Server Error",
// 		501: "Not Implemented",
// 		502: "Bad Gateway",
// 		503: "Service Unavailable",
// 		504: "Gateway Timeout",
// 		505: "HTTP Version Not Supported"
// 	};
// 	


function postRoutes(app) {
	var staticAudio = httpHelper.localPathServer("/audio","/var/www/html/audio");
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
// 		next();
    });
	
	app.get("/audio/*",staticAudio);
	
};

var test2 = function (req,res,next) { console.log("here 2 !");next(); };

connect.createServer( connect.logger(), require("./test1").test1, test2, connect.router(postRoutes)
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