const logger = require('logger').get('HTTP::Frontend');
const backend = require(`${require('app-root-path')}/api/v1/OpenWeatherMap`);

const index = (req, res) => {
	// If the request includes a query string with a location,
	// attempt to cache it before it's asked for
	if(req.query.q) {
		backend.get.by_guessing(req.query.q, req.query.u || 'imperial', 'forecast');
		backend.get.by_guessing(req.query.q, req.query.u || 'imperial', 'weather');
	}
	res.render('index');
};

const routes = [
	{
		'uri': '/',
		'method': 'get',
		'handler': index
	}
];

module.exports = { logger, routes }
