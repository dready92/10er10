

const d10 = require('../../d10');


// eslint-disable-next-line no-underscore-dangle
function _random(view, request) {
  const count = parseInt(request.body.count, 10);
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(count) || count < 1) {
    return d10.realrest.err(427, 'count', request.ctx);
  }
  randomWork(view, request.body, count, (err, resp) => {
    if (err) {
      return d10.realrest.err(err.code, err.message, request.ctx);
    }
    return d10.realrest.success(resp, request.ctx);
  });
}

function getRandomIds(resp, count, not, really_not) {
  const shuffle = function shuffle(o) { // v1.0
    // eslint-disable-next-line no-plusplus, no-param-reassign
    for (let j, x, i = o.length; i; j = parseInt(Math.random() * i, 10), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  };


  const ids = [];
  resp.rows.forEach((v) => { ids.push(v.id); });
  if (!ids.length) return ids;
  really_not.forEach((v) => {
    if (ids.indexOf(v) >= 0) ids.splice(ids.indexOf(v), 1);
  });
  if (!ids.length) return ids;
  not.forEach((v) => {
    if (ids.indexOf(v) >= 0) ids.splice(ids.indexOf(v), 1);
  });
  if (!ids.length) {
    return getRandomIds(resp, count, [], really_not);
  }
  if (count > ids.length) {
    return shuffle(ids);
  }

  if (count === 1) {
    const r = Math.floor(Math.random() * ids.length);
    return ids[r];
  }
  shuffle(ids);
  return ids.slice(0, count);
}

function randomWork(view, body, count, callback) {
  const data = {};
  function getArray(v) {
    if (typeof v === 'undefined') return [];
    if (Object.prototype.toString.call(v) !== '[object Array]') {
      if (v.length) return [v];
      return [];
    }
    return v;
  }

  const genres = body.name;
  const not = body.not && Array.isArray(body.not)
    ? body.not
    : [];
  const really_not = body.really_not && Array.isArray(body.really_not)
    ? body.really_not
    : [];
  const query = {};

  if (genres && genres.length) {
    query.genre = { $in: genres };
  }
  if (really_not.length) {
    query._id = { $nin: really_not };
  }
  d10.couch.d10.view(view, data, (err, response) => {
    if (err) {
      return callback({ code: 423, message: err });
    }
    const random = getRandomIds(response, count, not, really_not);
    if (!random.length) {
      return callback(null, { songs: [] });
    }
    d10.couch.d10.getAllDocs({ keys: random, include_docs: true }, (err, resp) => {
      if (err) {
        return callback({ code: 423, message: err });
      }
      let back = [];
      resp.rows.forEach((v) => { back.push(v.doc); });
      return callback(null, back);
    });
  });
}

_random.work = randomWork;

module.exports = _random;
