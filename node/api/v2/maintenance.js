/* eslint-disable no-plusplus */
const d10 = require('../../d10');
const denormalize = require('../../db/denormalization');

const debug = d10.debug('d10:api:v2:maintenance');


let denormalizationTask = null;

module.exports = function apiv2(app) {
  app.get('/maintenance/denormalize', (req) => {
    if (denormalizationTask) {
      return d10.realrest.success(denormalizationTask, req.ctx);
    }
    const err = { error: 'no task', reason: 'no task is currently running' };
    return d10.realrest.err(400, err, req.ctx);
  });
  app.post('/maintenance/denormalize', denormalizeController);
};

function denormalizeController(req) {
  if (!req.ctx.user.superman) {
    return d10.realrest.err(403, { error: 'Forbidden', reason: 'You are not allowed to launch a maintenance task' }, req.ctx);
  }
  if (denormalizationTask) {
    return d10.realrest.err(400, { error: 'In progress', reason: 'A denormalization task is already running' }, req.ctx);
  }

  denormalizationTask = {
    id: d10.uid(),
    count: 0,
    done: 0,
    errors: 0,
  };

  d10.realrest.success(denormalizationTask, req.ctx);

  return d10.mcol(d10.COLLECTIONS.SONGS).countDocuments()
    .then((documentCount) => {
      denormalizationTask.count = documentCount;
    })
    .then(() => {
      const cursor = d10.mcol(d10.COLLECTIONS.SONGS).find();
      return denormalizeJob(cursor);
    })
    .catch((err) => {
      debug('Denormalization process ended up with an error', err);
      denormalizationTask = null;
    });
}

function denormalizeJob(cursor) {
  return cursor.next()
    .then((song) => {
      if (!song) {
        debug('denormalization job finished, count=', denormalizationTask.done, ' done=', denormalizationTask.count);
        denormalizationTask = null;
        return null;
      }
      return denormalize(song)
        .then((results) => {
          results.filter(settled => settled.status === 'rejected')
            .forEach((err) => {
              debug('Denormalization error', err);
              denormalizationTask.errors++;
            });
          denormalizationTask.done++;

          return denormalizeJob(cursor);
        });
    });
}
