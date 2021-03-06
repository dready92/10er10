const fs = require('fs');
const promisify = require('util').promisify;
const d10 = require('./d10');

const debug = d10.debug('d10:router:audio:download');

exports.api = function api(app) {
  app.get('/audio/download/aa:id', (request, response) => {
    const songId = `aa${request.params.id}`;
    let extension = 'ogg';
    if (request.query.extension && request.query.extension.length) {
      extension = request.query.extension.replace(/\W+/g, '');
    }
    const file = `${d10.config.audio.dir}/${songId.substr(2, 1)}/${songId}.${extension}`;

    Promise.all([
      promisify(fs.stat)(file),
      d10.mcol(d10.COLLECTIONS.SONGS).findOne({ _id: songId })
    ])
      .then(([stat, doc]) => {
        if (!doc) {
          response.status(404).json({ error: 'Not found', reason: `No song with id "${songId}" in datastore` });
          return;
        }
        request.ctx.headers['Content-Type'] = 'application/octet-stream';
        request.ctx.headers['Content-Disposition'] = `attachment; filename="${doc.artist} - ${doc.title}.${extension}"`;
        request.ctx.headers['Content-Transfer-Encoding'] = 'binary';
        request.ctx.headers.Expires = '0';
        request.ctx.headers.Pagma = 'no-cache';
        request.ctx.headers['Content-Length'] = `${stat.size}`;
        response.writeHead(200, request.ctx.headers);
        fs.createReadStream(file).pipe(response);
      })
      .catch((err) => {
        debug(err);
        response.writeHead(501, request.ctx.headers);
        response.end('Filesystem error');
      });
  });
}; // exports.api
