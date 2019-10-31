const express = require('express');

const apiv2Router = express.Router({ caseSensitive: true });

require('./song')(apiv2Router);
require('./album')(apiv2Router);
require('./artist')(apiv2Router);

module.exports = apiv2Router;
