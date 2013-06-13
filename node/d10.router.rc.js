var     d10 = require("./d10"),
        debug = d10.debug("d10:d10.router.rc");

exports.api = function(app) {
  app.get("/rc", function(request, response, next) {
    request.ctx.langUtils.parseServerTemplate(request,"html/rc/login.html",function(err,resp) {
        if ( err ) {
            debug(err);
            return response.end("An error occured");
        }
        response.end(d10.mustache.to_html(resp,{}));
    });
  });
};