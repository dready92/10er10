module.exports = getRandomSongs;

const d10 = require('../../d10');

function getRandomSongs(_view, request) {
  const count = parseInt(request.body.count, 10);
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(count) || count < 1) {
    return d10.realrest.err(427, 'count', request.ctx);
  }
  const genres = request.body.name;
  const not = request.body.not && Array.isArray(request.body.not) ? request.body.not : [];
  const reallyNot = request.body.really_not && Array.isArray(request.body.really_not)
    ? request.body.really_not
    : [];
  const query = {};

  if (genres && genres.length) {
    query.genre = { $in: genres };
  }
  if (reallyNot.length) {
    query._id = { $nin: not.concat(reallyNot) };
  }

  return d10.mcol(d10.COLLECTIONS.SONGS).aggregate([
    { $match: query },
    { $sample: { size: 2 * count } },
  ]).toArray()
    .then((results) => {
      let ids = [];
      if (!results.length) {
        return ids;
      }
      const songsNotLabel = [];
      const songsOk = [];
      results.forEach((doc) => {
        if (not.includes(doc._id)) {
          songsNotLabel.push(doc);
        } else {
          songsOk.push(doc);
        }
      });

      ids = songsOk.slice(0, count);
      if (ids.length < count && songsNotLabel.length) {
        const missing = count - ids.length;
        ids = ids.concat(songsNotLabel.slice(0, missing));
      }
      return ids;
    })
    .then((ids) => {
      d10.realrest.success(ids, request.ctx);
    })
    .catch(err => d10.realrest.err(err.code, err.message, request.ctx));
}
