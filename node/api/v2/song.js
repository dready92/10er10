/* eslint-disable prefer-destructuring */
const d10 = require('../../d10');

const SORT_KEYS = {
  creation: 'ts_creation',
  title: 'tokentitle',
};

const helpers = require('./api-helpers');
function getOpts(req) {
  return helpers.getOpts(req, 'tokentitle', SORT_KEYS);
}

module.exports = function apiv2(app) {
  app.get('/list/songs', helpers.getListFn('songs', d10.COLLECTIONS.SONGS, getOpts));
};
