const d10 = require('../../../d10');

module.exports = meGet;

function meGet(request) {
  const response = {
    user: { ...request.ctx.user },
    playlists: request.ctx.user.playlists,
    preferences: request.ctx.user.preferences,
  };

  delete response.user.playlists;
  delete response.user.preferences;
  delete response.user.password;
  delete response.user.depth;
  delete response.user.parent;
  d10.realrest.success(response, request.ctx);
}
