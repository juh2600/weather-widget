const logger = require('logger').get('API::OpenWeatherMap::Cache');
const fetch_http = require('node-fetch');
const cache_config = require('./cache_config');

const cache = {};

module.exports = async (url) => {
	let record = cache[url];
	if(!record || record.cache.expiry < new Date()) {
		return fetch_http(url)
			.then(res => res.json())
			.then(data => {
				cache[url] = Object.assign({}, data, {cache: {url, expiry: new Date(new Date().getTime() + cache_config.ttl)}});
				return {json: function() {return data;}};
			});
	} else {
		//logger.debug(`Returning cached result for name ${url}, expiring ${record.cache.expiry}`);
		return {json: function() {return record;}};
	}
};
