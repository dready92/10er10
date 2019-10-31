const d10 = require('../../../d10');

module.exports = artistGet;

function artistGet(request) {
  d10.mcol(d10.COLLECTIONS.ARTISTS).findOne({ _id: request.params.artist })
    .then((artist) => {
      if (!artist) {
        return d10.realrest.err(404, 'Not Found', request.ctx);
      }
      return d10.realrest.success(artist, request.ctx);
    })
    .catch(err => d10.realrest.err(500, err, request.ctx));
}
