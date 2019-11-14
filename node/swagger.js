module.exports = {
  info: {
    // API informations (required)
    title: '10er10 web jukebox', // Title (required)
    version: '1.0.0', // Version (required)
    description: 'API to interact with a 10er10 server', // Description (optional)
  },
  basePath: '/', // Base path (optional)
  apis: ['./node/api/**/*.js'],
  openapi: '3.0.0',
};
