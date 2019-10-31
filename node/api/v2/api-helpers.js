/* eslint-disable no-prototype-builtins */
const d10 = require('../../d10');
const CONSTANTS = require('../constants');

const debug = d10.debug('d10:apiv2:api-helpers');

module.exports = {
  getListFn,
  ensureSearchPattern,
  ensureSort,
  ensureLimit,
  ensureOffset,
  getOpts,
};

function getListFn(itemClass, mongoCollection, customGetOpts) {
  return function list(req) {
    const mongoQueryOptions = customGetOpts(req);

    const projection = {};
    if (!mongoQueryOptions.includeSongs) {
      projection.songs = 0;
    }

    d10.mcol(mongoCollection).find(mongoQueryOptions.query, projection)
      .sort(mongoQueryOptions.sort)
      .skip(mongoQueryOptions.skip)
      .limit(mongoQueryOptions.limit)
      .toArray()
      .then((response) => {
        d10.realrest.success(response, req.ctx);
      })
      .catch((e) => {
        debug(`Error on GET /list/${itemClass}`, e);
        d10.realrest.err(500, e, req.ctx);
      });
  };
}

function getOpts(req, searchField = '_id', sortKeys) {
  const mongoQueryOptions = {
    query: {},
    limit: ensureLimit(req.query.limit),
    skip: ensureOffset(req.query.offset),
    sort: ensureSort(req.query.sort, req.query.sortDirection, sortKeys),
    includeSongs: ensureBoolean(req.query.includeSongs),
  };

  const searchStr = ensureSearchPattern(req.query.q);
  if (searchStr) {
    mongoQueryOptions.query[searchField] = { $regex: `${searchStr}` };
  }

  const genres = ensureGenres(req.query.genres);
  if (genres) {
    mongoQueryOptions.query.genre = {
      $in: genres
    };
  }

  return mongoQueryOptions;
}

function ensureGenres(q) {
  if (typeof q !== 'string' || !q.length) {
    return null;
  }
  return q.trim().split(',');
}

function ensureSearchPattern(q) {
  if (typeof q !== 'string' || !q.length) {
    return null;
  }
  return d10.ucwords(q.trim());
}

function ensureSort(k, d, sortKeys) {
  return { [ensureSortKey(k, sortKeys)]: ensureSortDirection(d) };
}

function ensureSortKey(k, sortKeys) {
  return typeof k === 'string' && sortKeys.hasOwnProperty(k)
    ? sortKeys[k]
    : CONSTANTS.SORT_DEFAULT.KEY;
}

function ensureSortDirection(d) {
  return typeof d === 'string' && CONSTANTS.SORT_DIRECTIONS.hasOwnProperty(d)
    ? CONSTANTS.SORT_DIRECTIONS[d]
    : CONSTANTS.SORT_DEFAULT.DIRECTION;
}

function ensureOffset(o) {
  let offset = ensureNumber(o, 0);
  offset = ensureIsMin(offset, 0, 0);
  return offset;
}

function ensureLimit(l) {
  let limit = ensureNumber(l, CONSTANTS.LIMIT_DEFAULT);
  limit = ensureIsMax(limit, CONSTANTS.LIMIT_MAX, CONSTANTS.LIMIT_DEFAULT);
  limit = ensureIsMin(limit, 1, CONSTANTS.LIMIT_DEFAULT);

  return limit;
}

function ensureBoolean(b, def = false) {
  if (typeof b !== 'string') {
    return def;
  }

  return b === 'true';
}

function ensureNumber(nb, def = 0) {
  const out = Number(nb);
  if (isNaN(out)) {
    return def;
  }
  return out;
}

function ensureIsMin(nb, min, def = 0) {
  return nb < min ? def : nb;
}

function ensureIsMax(nb, max, def = 0) {
  return nb > max ? def : nb;
}
