/* eslint-disable prefer-destructuring */
const d10 = require('../../d10');

const SONGS_OPTS = {
  LIMIT_DEFAULT: 20,
  LIMIT_MAX: 200,
  SKIP_DEFAULT: 0,
  SORT_DEFAULT: 'creation',
  SORTDIRECTION_DEFAULT: 'desc',

  SORT_SET: new Set(['creation', 'title']),
  SORTDIRECTION_SET: new Set(['asc', 'desc']),
  SORTDIRECTION_MAP: {
    creation: 'ts_creation',
    title: 'tokentitle',
  },
};

module.exports = function apiv2(app) {
  app.get('/list/songs', songsListController);

  /**
   * Get a song list
   *
   * Query params:
   * - limit: integer: limit the number of results to return.
   *   default: 20
   *   max: 200
   *
   * - offset: integer: skip starting results
   *   default: 0
   *
   * - sort: string(creation, title) how to sort the song list
   *   default: creation
   *
   * - sortDirection: string(asc, desc) sorting direction
   *   default: desc
   *
   * @param {Request} req Express request object
   * @param {Response} res Express response object
   */
  function songsListController(req) {
    const data = songsListControllerQueryParser(req);
    console.log(data);
    d10.mcol(d10.COLLECTIONS.SONGS).find(data.query)
      .sort(data.sort)
      .skip(data.skip)
      .limit(data.limit)
      .toArray()
      .then(resp => d10.realrest.success(resp, req.ctx))
      .catch(err => d10.realrest.err(500, err, req.ctx));
  }

  function songsListControllerQueryParser(req) {
    const data = {
      query: {},
      limit: SONGS_OPTS.LIMIT_DEFAULT,
      skip: SONGS_OPTS.SKIP_DEFAULT,
      sort: {},
    };

    const q = req.query;

    // check limit
    if ('limit' in q) {
      const limit = Number(q.limit);
      // eslint-disable-next-line no-restricted-globals
      if (!isNaN(limit) && limit > 0 && limit <= SONGS_OPTS.LIMIT_MAX) {
        data.limit = limit;
      }
    }

    // check offset
    if ('offset' in q) {
      const offset = Number(q.offset);
      // eslint-disable-next-line no-restricted-globals
      if (!isNaN(offset) && offset > 0) {
        data.skip = offset;
      }
    }

    // check sort
    let sort = SONGS_OPTS.SORT_DEFAULT;
    let sortDirection = SONGS_OPTS.SORTDIRECTION_DEFAULT;
    if ('sort' in q) {
      if (SONGS_OPTS.SORT_SET.has(q.sort)) {
        sort = q.sort;
      }
    }
    if ('sortDirection' in q) {
      if (SONGS_OPTS.SORTDIRECTION_SET.has(q.sortDirection)) {
        sortDirection = q.sortDirection;
      }
    }
    data.sort[SONGS_OPTS.SORTDIRECTION_MAP[sort]] = sortDirection === 'asc' ? 1 : -1;

    return data;
  }
};
