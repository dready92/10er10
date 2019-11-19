const meController = require('./me');

module.exports = function meRouter(app) {
  app.get('/user/me', meController);
};
