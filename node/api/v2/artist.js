const d10 = require('../../d10');
const helpers = require('./api-helpers');
const artistGet = require('./artist/get');


const SORT_KEYS = {
  creation: 'ts_creation',
  title: '_id',
};


function getOpts(req) {
  return helpers.getOpts(req, '_id', { sortKeys: SORT_KEYS, mappings: { genre: 'genres' } });
}

/**
 * @swagger
 * /api/v2/list/artists:
 *   get:
 *     tags:
 *       - users
 *     summary: list artists
 *     operationId: listArtists
 *     description: List artists of the songs collection
 *     parameters:
 *       - in: query
 *         name: q
 *         description: Query to match (match is checked against the album's title)
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         description: define the sorting key of the list
 *         required: false
 *         schema:
 *           type: string
 *           enum: [creation, title]
 *       - in: query
 *         name: sortDirection
 *         description: define the sorting direction (ascending or descending) of the list
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: skip
 *         description: number of records to skip for pagination
 *         required: false
 *         schema:
 *           type: integer
 *           format: int32
 *           minimum: 0
 *           default: 0
 *       - in: query
 *         name: limit
 *         description: maximum number of records to return
 *         required: false
 *         schema:
 *           type: integer
 *           format: int32
 *           minimum: 0
 *           maximum: 200
 *           default: 20
 *       - in: query
 *         name: includeSongs
 *         description: include the list of songs in the response body
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       '200':
 *         description: listing results matching criteria
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Artist'
 *       '400':
 *         description: bad input parameter
 */

module.exports = function apiv2(app) {
  app.get('/list/artists', helpers.getListFn('artists', d10.COLLECTIONS.ARTISTS, getOpts));
  app.get('/artist/:artist', artistGet);
};
