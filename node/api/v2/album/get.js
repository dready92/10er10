const d10 = require('../../../d10');

module.exports = albumGet;

function albumGet(request) {
  if (!request.params.album || !request.params.album.length) {
    return d10.realrest.err(400, 'Album name cannot be empty', request.ctx);
  }

  d10.mcol(d10.COLLECTIONS.ALBUMS).findOne({ _id: request.params.album })
    .then((album) => {
      if (!album) {
        return d10.realrest.err(404, 'Not Found', request.ctx);
      }
      return d10.realrest.success(album, request.ctx);
    })
    .catch(err => d10.realrest.err(500, err, request.ctx));
}
