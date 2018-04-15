const swaggerJS = require('swagger-jsdoc');

const options = {
  swaggerDefinition: {
    info: {
      title: '10er10',
      version: '1.0.0', // Version (required)
    },
  },
  apis: ['./swagger/definitions.js', '../node/**/*.js'], // Path to the API docs
};

// Initialize swagger-jsdoc -> returns validated swagger spec in json format
const swaggerSpec = swaggerJS(options);

console.log(swaggerSpec);
