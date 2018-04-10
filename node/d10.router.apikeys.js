const d10 = require("./d10");
const ApiKey = require('./lib/api-key');

module.exports.api = (app) => {
  app.post('/api/apikeys', (req) => {
    const uid = d10.uid();
    const apiKey = new ApiKey(uid);
    const user = req.ctx.user;
    if (!user.apikeys) {
      user.apikeys = [];
    }
    user.apikeys.push(apiKey);

    d10.couch.auth.storeDoc(user, (err, storeResponse) => {
      if (err) {
        return d10.realrest.err(500, err, req.ctx);
      }
      return d10.realrest.success(storeResponse, req.ctx);
    });
  });

  app.get('/api/apikeys', (req) => {
    const apiKeys = req.ctx.user.apikeys ? req.ctx.user.apikeys : [];
    return d10.realrest.success(apiKeys, req.ctx);
  });

  app.delete('/api/apikeys/:apikeyid', (req) => {
    const user = req.ctx.user;

    if (!user.apikeys) {
      user.apikeys = [];
    }
    user.apikeys = user.apikeys.filter(k => k !== req.params.apikeyid);

    d10.couch.auth.storeDoc(user, (err, storeResponse) => {
      if (err) {
        return d10.realrest.err(500, err, req.ctx);
      }
      return d10.realrest.success(storeResponse, req.ctx);
    });
  });
};
