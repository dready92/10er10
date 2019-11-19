const express = require('express');

const apiv2Router = express.Router({ caseSensitive: true });

require('./song')(apiv2Router);
require('./album')(apiv2Router);
require('./artist')(apiv2Router);
require('./maintenance')(apiv2Router);
require('./user')(apiv2Router);

module.exports = apiv2Router;
