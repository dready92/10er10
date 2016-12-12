module.exports = function ensureLogin(request, response, next) {
  if (!request.ctx.session || !request.ctx.user || !request.ctx.user._id) {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Page not found');
  } else {
    next();
  }
};
