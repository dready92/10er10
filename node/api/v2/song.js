/* eslint-disable prefer-destructuring */
const d10 = require('../../d10');

const SORT_KEYS = {
  creation: 'ts_creation',
  title: 'tokentitle',
};

const helpers = require('./api-helpers');

function getOpts(req) {
  return helpers.getOpts(req, 'tokentitle', { sortKeys: SORT_KEYS, mappings: { genre: 'genre' } });
}

/**
 * @swagger
 * /api/v2/list/songs:
 *    get:
 *      tags:
 *        - users
 *      summary: list songs
 *      operationId: listSongs
 *      description: |
 *        By passing in the appropriate options, you can list any song available in the system
 *      parameters:
 *        - in: query
 *          name: sort
 *          description: define the sorting key of the list
 *          required: false
 *          schema:
 *            type: string
 *            enum: [creation, title]
 *        - in: query
 *          name: sortDirection
 *          description: define the sorting direction (ascending or descending) of the list
 *          required: false
 *          schema:
 *            type: string
 *            enum: [asc, desc]
 *        - in: query
 *          name: skip
 *          description: number of records to skip for pagination
 *          required: false
 *          schema:
 *            type: integer
 *            format: int32
 *            minimum: 0
 *            default: 0
 *        - in: query
 *          name: limit
 *          description: maximum number of records to return
 *          required: false
 *          schema:
 *            type: integer
 *            format: int32
 *            minimum: 0
 *            maximum: 200
 *            default: 20
 *      responses:
 *        '200':
 *          description: listing results matching criteria
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/Song'
 *        '400':
 *          description: bad input parameter
 */

module.exports = function apiv2(app) {
  app.get('/list/songs', helpers.getListFn('songs', d10.COLLECTIONS.SONGS, getOpts));
};
