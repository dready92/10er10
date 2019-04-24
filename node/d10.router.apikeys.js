const d10 = require('./d10');
const ApiKey = require('./lib/api-key');

module.exports.api = (app) => {
  app.post('/api/apikeys', (req) => {
    const uid = d10.uid();
    const apiKey = new ApiKey(uid);
    const user = req.ctx.user;
    if (!user.apikeys) {
      user.apikeys = [];
    }

    d10.mcol(d10.COLLECTIONS.USERS).updateOne({ _id: user._id }, { $push: { apikeys: apiKey } })
      .then(() => d10.realrest.success(apiKey, req.ctx))
      .catch(err => d10.realrest.err(500, err, req.ctx));
  });

  app.get('/api/apikeys', (req) => {
    const apiKeys = req.ctx.user.apikeys ? req.ctx.user.apikeys : [];
    return d10.realrest.success(apiKeys, req.ctx);
  });

  app.delete('/api/apikeys/:apikeyid', (req) => {
    d10.mcol(d10.COLLECTIONS.USERS).updateOne({ _id: user._id }, { $pull: { apikeys: { key: req.params.apikeyid } } })
      .then(() => d10.realrest.success({ success: true }, req.ctx))
      .catch(err => d10.realrest.err(500, err, req.ctx));
  });
};
