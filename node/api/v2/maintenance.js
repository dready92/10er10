/* eslint-disable no-plusplus */
const d10 = require('../../d10');
const denormalize = require('../../db/denormalization');

const debug = d10.debug('d10:api:v2:maintenance');


let denormalizationTask = null;
/**
 * @swagger
 * /api/v2/maintenance/denormalize:
 *  post:
 *    tags:
 *      - admins
 *    summary: launch denormalization of data on the Store
 *    operationId: maintenanceDenormalizePost
 *    description: This asks the server to re-denormalize data on every needed document of the store
 *    responses:
 *      '200':
 *        description: progress of data denormalization task
 *        content:
 *          application/json:
 *            schema:
 *              $ref: "#/components/schemas/DenormalizationTask"
 *      '400':
 *        description: wrong call; no task is running
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                error:
 *                  type: string
 *                  description: error message
 *                reason:
 *                  type: string
 *                  description: reason leading to the error
 *  get:
 *    tags:
 *      - admins
 *    summary: get the progress of the denormalization of data on the Store
 *    operationId: maintenanceDenormalize
 *    description: Get the progress of the denormalization task for data on the store
 *    responses:
 *      '200':
 *        description: progress of data denormalization task
 *        content:
 *          application/json:
 *            schema:
 *              $ref: "#/components/schemas/DenormalizationTask"
 *      '400':
 *        description: wrong call; no task is running
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                error:
 *                  type: string
 *                  description: error message
 *                reason:
 *                  type: string
 *                  description: reason leading to the error
 */
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
