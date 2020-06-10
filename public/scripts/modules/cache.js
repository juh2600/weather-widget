import { get as getLogger } from './logger.js';
const logger = getLogger('cache');

const CACHE_VERSION = `1`;
const CACHE_ORIGIN  = location.origin;
const CACHE_NAME    = `${CACHE_ORIGIN}-${CACHE_VERSION}`;
const CACHE_TIMEOUT = 60 * 5; // s

// Attempt to fetch the given url from the cache.
// If we don't have the url OR the response is expired:
//  Fetch the url
//  Store the response
//  Return the response
// Otherwise:
//  Return the response
export const fetch_cache = async (url, options) => {
	logger.debug('Opening cache');
	return caches.open(CACHE_NAME).then(cache => {
		logger.debug(`Searching for URL ${url}`);
		return cache.match(url).then(async res => {
			let data = null;
			if(res)
				data = await res.clone().json();
			if(!res
					|| res.status !== 200
					|| (data.time.timestamp + CACHE_TIMEOUT)
						< (new Date().getTime()/1000)
			) {
				logger.warn(`Cached response for ${url} was not found, not ok, or expired`);
				logger.debug(`Requesting fresh response for ${url}`);
				return fetch(url, options)
					.then(newres => {
						logger.debug(`Updating cache for ${url}`)
						cache.put(url, newres.clone());
						return newres;
					});
			}
			logger.debug(`Cached response for ${url} was ok`);
			return res;
		});
	});
};
