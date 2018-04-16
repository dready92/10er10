const d10 = require('../../d10');

function _random(view, request) {
  const count = parseInt(request.body.count, 10);
  if (isNaN(count) || count < 1) {
    return d10.realrest.err(427, 'count', request.ctx);
  }

  return randomWork(view, request.body, count, (err, resp) => {
    if (err) {
      return d10.realrest.err(err.code, err.message, request.ctx);
    }
    return d10.realrest.success(resp, request.ctx);
  });
}

function getRandomIds(resp, count, not, reallyNot) {
  function shuffle(o) { // v1.0
    for (let j, x, i = o.length; i; j = parseInt(Math.random() * i, 10), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  }

  const ids = resp.rows.map(row => row.id);
  if (!ids.length) return ids;
  reallyNot.forEach((v, k) => {
    if (ids.indexOf(v) >= 0) ids.splice(ids.indexOf(v), 1);
  });
  if (!ids.length) return ids;
  not.forEach((v) => {
    if (ids.indexOf(v) >= 0) ids.splice(ids.indexOf(v), 1);
  });
  if (!ids.length) {
    return getRandomIds(resp, count, [], reallyNot);
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
    if (Array.isArray(v)) return v;
    if (v.length) return [v];
    return [];
  }

  const name = getArray(body.name);
  if (name.length) {
    data.keys = name;
  }
  const not = getArray(body.not);
  const reallyNot = getArray(body.really_not);

  d10.couch.d10.view(view, data, (err, response) => {
    if (err) {
      return callback({ code: 423, message: err });
    }
    const random = getRandomIds(response, count, not, reallyNot);
    if (!random.length) {
      return callback(null, { songs: [] });
    }

    return d10.couch.d10.getAllDocs({ keys: random, include_docs: true }, (err2, resp) => {
      if (err2) {
        return callback({ code: 423, message: err2 });
      }
      const back = [];
      resp.rows.forEach((v) => { back.push(v.doc); });
      return callback(null, back);
    });
  });
}

_random.work = randomWork;

module.exports = _random;
