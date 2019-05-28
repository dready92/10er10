/* eslint-disable no-param-reassign */
const ncouch = require('ncouch');


function toPromise(fn, context) {
  return (...args) => new Promise((resolve, reject) => {
    args.push((err, response) => {
      if (err) {
        reject(err);
      } else {
        resolve(response);
      }
    });
    fn.apply(context, args);
  });
}

function makePromisesDb(couch) {
  const db = {};
  db.trackGetAllDocs = toPromise(couch.track.getAllDocs, couch.track);
  db.d10GetAllDocs = toPromise(couch.d10.getAllDocs, couch.d10);
  db.d10wiGetAllDocs = toPromise(couch.d10wi.getAllDocs, couch.d10wi);
  db.authGetAllDocs = toPromise(couch.auth.getAllDocs, couch.auth);
  return db;
}

module.exports = function patchD10(d10) {
  d10.couch = {
    d10: ncouch.server(d10.config.couch.d10.dsn).debug(false)
      .database(d10.config.couch.d10.database),
    auth: ncouch.server(d10.config.couch.auth.dsn).debug(false)
      .database(d10.config.couch.auth.database),
    track: ncouch.server(d10.config.couch.track.dsn).debug(false)
      .database(d10.config.couch.track.database),
    d10wi: ncouch.server(d10.config.couch.d10wi.dsn).debug(false)
      .database(d10.config.couch.d10wi.database),
  };
  d10.dbp = makePromisesDb(d10.couch);
}
