const package = require('./package.json');
console.log(`Starting ${package.name} v${package.version}`);
process.env.NODE_ENV = 'production';

const logger = require('logger').get('main');
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());
const compression = require('compression');
app.use(compression());

app.set('view engine', 'pug');
app.set('views', __dirname+'/views');
app.use(express.static(path.join(__dirname+'/public')));

logger.info('Configuring routes...');
const routeManager = require('./routes/manager');
routeManager.apply(app, require('./routes/frontend'));
logger.info('Configured routes.');

logger.info(`Listening on port ${process.env.PORT}`);
app.listen(process.env.PORT);

