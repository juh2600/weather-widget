const package = require('./package.json');
console.log(`Starting ${package.name} v${package.version}`);
process.env.NODE_ENV = 'debug';

const logger = require('logger').get('main');
const http = require('http');
const express = require('express');
const path = require('path');
const config = require(require('app-root-path')+'/.env');
const cache_config = require('./cache_config');

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
	immutable: true,
	maxAge: process.env.NODE_ENV === 'production' ? cache_config.ttl : 0
}));

app.set('view engine', 'pug');
app.set('views', __dirname+'/views');
//app.use(express.static(path.join(__dirname+'/public')));
app.use((req, res, next) => {
	logger.info(`${new Date().toISOString().replace('T', ' ').replace(/\..*Z/, 'Z')} ${req.headers['x-forwarded-for'] || req.connection.remoteAddress} ${req.method.toLocaleUpperCase()} ${req.url}`);
	next();
});

logger.info('Configuring routes...');
const routeManager = require('./routes/manager');
routeManager.apply(app, require('./routes/frontend'));
routeManager.apply(app, require('./routes/api/v1/owm'));
logger.info('Configured routes.');

logger.info(`Listening on port ${config.port}`);
http.createServer(app).listen(config.port);

