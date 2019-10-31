const d10 = require('../../d10');
const helpers = require('./api-helpers');
const albumGet = require('./album/get');

const SORT_KEYS = {
  creation: 'ts_creation',
  title: '_id',
};

function getOpts(req) {
  return helpers.getOpts(req, 'tokentitle', SORT_KEYS);
}

module.exports = function apiv2(app) {
  app.get('/list/albums', helpers.getListFn('albums', d10.COLLECTIONS.ALBUMS, getOpts));
  app.get('/album/:album', albumGet);
};
