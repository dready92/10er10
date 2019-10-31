const d10 = require('../../d10');
const helpers = require('./api-helpers');
const artistGet = require('./artist/get');


const SORT_KEYS = {
  creation: 'ts_creation',
  title: '_id',
};


function getOpts(req) {
  return helpers.getOpts(req, '_id', SORT_KEYS);
}

module.exports = function apiv2(app) {
  app.get('/list/artists', helpers.getListFn('artists', d10.COLLECTIONS.ARTISTS, getOpts));
  app.get('/artist/:artist', artistGet);
};
