const package = require('./package.json');
console.log(`Starting ${package.name} v${package.version}`);
process.env.NODE_ENV = 'debug';

const logger = require('logger').get('main');
const express = require('express');
const path = require('path');
const config = require(require('app-root-path')+'/.env');

const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());
const compression = require('compression');
app.use(compression());
const serveStatic = require('serve-static');
app.use(serveStatic(__dirname+'/public', {
	acceptRanges: true,
	cacheControl: true,
	lastModified: true,
	maxAge: '5m'
}));

app.set('view engine', 'pug');
app.set('views', __dirname+'/views');
//app.use(express.static(path.join(__dirname+'/public')));

logger.info('Configuring routes...');
const routeManager = require('./routes/manager');
routeManager.apply(app, require('./routes/frontend'));
routeManager.apply(app, require('./routes/api/v1/owm'));
logger.info('Configured routes.');

logger.info(`Listening on port ${config.port}`);
app.listen(config.port);

