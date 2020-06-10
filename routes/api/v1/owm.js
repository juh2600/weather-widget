const version = 'v1';
const name = 'OpenWeatherMap';
const abbrev = 'owm';

const logger = require('logger').get(`HTTP::API${version}::${name}`);
const backend = require(`${require('app-root-path')}/api/${version}/${name}`);

const fetchAllWeather = (req, res) => {
	backend
		.get
		.by_guessing(req.query.q, req.query.u)
		.then(data => {
			res.status(data.status.code);
			return data;
		})
		.then(data => res.json(data))
		.catch(console.err);
};

const fetchCurrentWeather = (req, res) => {
	backend
		.get
		.by_guessing(req.query.q, req.query.u, 'current')
		.then(data => {
			res.status(data.status.code);
			return data;
		})
		.then(data => res.json(data))
		.catch(console.err);
};

const fetchForecast = (req, res) => {
	backend
		.get
		.by_guessing(req.query.q, req.query.u, 'forecast')
		.then(data => {
			res.status(data.status.code);
			return data;
		})
		.then(data => res.json(data))
		.catch(console.err);
};

const routes = [
	{
		'uri': `/api/${version}/${abbrev}`,
		'method': 'get',
		'handler': fetchAllWeather
	},

	{
		'uri': `/api/${version}/${abbrev}/current`,
		'method': 'get',
		'handler': fetchCurrentWeather
	},

	{
		'uri': `/api/${version}/${abbrev}/forecast`,
		'method': 'get',
		'handler': fetchForecast
	}

];

module.exports = { logger, routes, name };
