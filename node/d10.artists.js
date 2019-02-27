const d10 = require('./d10');

exports.getSongsByHits = function getSongsByHits(artist, options) {
  const rpp = d10.config.rpp + 1;
  const viewName = options.genre ? 'genre/artist-hits' : 'artist/hits';
  const query = {
    reduce: false,
    descending: true,
    include_docs: true,
    startkey: options.startkey ? options.startkey : [artist, {}],
    endkey: [artist],
    limit: rpp,
  };
  if (options.startkey_docid) {
    query.startkey_docid = options.startkey_docid;
  }
  if (options.genre) {
    query.startkey = options.startkey ? options.startkey : [options.genre, artist, {}];
    query.endkey = [options.genre, artist];
  }

  return d10.dbp.d10View(viewName, query);
};
