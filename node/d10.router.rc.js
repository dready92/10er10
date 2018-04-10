var     d10 = require("./d10"),
        bodyParser = require('body-parser'),
        jsonParserMiddleware = bodyParser.json(),
        urlencodedParserMiddleware = bodyParser.urlencoded({extended: true}),
        debug = d10.debug("d10:d10.router.rc"),
        fs = require("fs"),
        when = require("./when"),
        emitter = require('./lib/rc-events'),
        users = require("./d10.users");

const session = require('./session');

var readOneFileOrDir = function(stats, fileName, completePath, opts) {
  if ( stats.isDirectory() ) {
    return function(then) {
      readFilesInDir(completePath, opts, then);
    };
  } else if ( !opts.match || opts.match.test(fileName) ) {
    return function(then) {
      fs.readFile(completePath,then);
    };
  }
};

var lsAndStatDir = function (dir, callback) {
  fs.readdir(dir, function(err,files) {
    if ( err ) {
      debug(dir, err);
      return callback(err);
    }
    var jobs = {};
    files.forEach(function(fileName) {
      jobs[fileName] = function(then) {
        fs.stat(dir+"/"+fileName, then);
      };
    });
    if ( !d10.count(jobs) ) { debug("no jobs on ",dir); return callback(null,{});  };
    when(jobs, callback);
  });
};


var readFilesInDir = function(dir, opts, callback) {
  debug("readFilesInDir on ",dir);
  opts = opts || {};

  var allShouldBeRead = function (readErrs, readResps) {
    if ( readErrs ) { debug(readErrs); return callback(readErrs); }
    var sortedCompletePath = [];
    for (var completePath in readResps) { sortedCompletePath.push(completePath); }
    sortedCompletePath.sort();

    var allText = "";
    sortedCompletePath.forEach(function(completePath) {
      allText += readResps[completePath];
    });
    return callback(null,allText);
  };

  lsAndStatDir(dir, function(errs,stats) {
    if ( errs ) {
      debug("STAT ERROR : ",errs);
      return then(errs);
    }
    debug("lsAndStatDir back for ",dir);
    var readJobs = {};
    for (var s in stats) {
      var completePath = dir+"/"+s;
      var closure = readOneFileOrDir(stats[s], s, completePath, opts);
      if ( closure ) {
        readJobs[completePath] = closure;
      }
    }
    if ( !d10.count(readJobs) ) { debug("no jobs on ",dir); return allShouldBeRead(null,"");  };
    when(readJobs, allShouldBeRead);
  });
};

exports.publicApi = function(app) {
  app.get("/rc", function(request, response, next) {
    request.ctx.langUtils.parseServerTemplate(request,"html/rc/login.html",function(err,resp) {
        if ( err ) {
            debug(err);
            return response.end("An error occured");
        }
        response.end(d10.mustache.to_html(resp,{}));
    });
  });
  app.get("/rc/js", function(request, response, next) {
    var jsPath = d10.config.javascript.rootDir+"/rc";
    readFilesInDir(jsPath, {match: /\.js$/}, function(err,text) {
      if ( err ) {
        debug(err);
        response.writeHead(500,request.ctx.headers);
        return response.end(err);
      }
      request.ctx.headers["Content-type"] = "application/javascript";
      response.writeHead(200, request.ctx.headers );
      response.end(text);
    });
  });
  app.get("/rc/js/config.js", function(request, response, next) {
    response.writeHead(200, {"Content-Type": "application/javascript"});
    response.end("define([], function() { return " + JSON.stringify(
      {
        site_url: "",
        base_url: "/",
        img_default: d10.config.images.default,
        img_root: "../audioImages",
        cookieName: d10.config.cookieName
      }
    )+"});");
  });

  app.put("/api/rc/logout", function(request, response, next) {
    debug("PUT /api/rc/logout");
    if ( !request.ctx.user || !request.ctx.remoteControlSession ) {
      return d10.realrest.err(404,{error: "session not found"},request.ctx);
    }
    var cookie = {user: "", remoteControlSession: ""};
    request.ctx.setCookie(cookie);
    var id = {
      user: request.ctx.user._id,
      session: request.ctx.remoteControlSession._id
    };
    session.removeSession(id.session, function() {
      emitter.emit("logout",id);
      d10.realrest.success({logout: true},request.ctx);
    });
  });

  app.post("/api/rc/login", jsonParserMiddleware, urlencodedParserMiddleware, function(request, response, next) {
    debug("POST /api/rc/login begin");
    if ( request.body.login && request.body.password ) {
      debug("POST /api/rc/login: try to auth user ["+request.body.login+"]");
      users.checkAuthFromLogin(request.body.login,request.body.password,function(err, uid, loginResponse) {
        if ( err || !uid) {
          return sessionErrorResponse(err, request.ctx);
        }

        debug("POST /api/rc/login: user ["+request.body.login+"] logged with login/password: ",uid);
        session.makeRemoteControlSession(uid, function(err,sessionDoc) {
          if ( !err ) {
              session.fillUserCtx(request.ctx,loginResponse,sessionDoc);
              var cookie = { user: request.ctx.user.login, remoteControlSession: sessionDoc._id.substring(2) };
              request.ctx.setCookie(cookie);
              if ( request.ctx.user.lang ) { request.ctx.lang = request.ctx.user.lang; }
              return sessionSuccessResponse(sessionDoc._id, request.ctx);
          }
          return sessionErrorResponse(err, request.ctx);
        });
      });
      return ;
    }
    debug("POST /api/rc/login: no user/pass provided, lookup current session");
    if ( request.ctx.remoteControlSession && request.ctx.remoteControlSession._id
          && request.ctx.remoteControlSession._id.substr(0,2) == "rs" ) {
      debug("Successfully logged from current session");
      return sessionSuccessResponse(request.ctx.session._id, request.ctx);
    }
    debug("POST /api/rc/login: no current session");
    return sessionErrorResponse("Nothing to log in", request.ctx);
  });
};

function sessionSuccessResponse (sessionId, ctx) {
  d10.realrest.success({login: true, session: sessionId}, ctx);
};

function sessionErrorResponse (err, ctx) {
  d10.realrest.err(401, {login: false}, ctx);
};

exports.api = function(app) {
};
