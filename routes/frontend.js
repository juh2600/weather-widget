const logger = require('logger').get('HTTP::Frontend');

const index = (req, res) => {
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
