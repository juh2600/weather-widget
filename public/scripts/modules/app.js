import * as Util from './util.js';
import * as WeatherUtil from './weather_util.js';
import * as View from './view.js';
import { chooseTheme } from './theme_selector.js';
import { fetch_cache } from './cache.js';
import { get as getLogger } from './logger.js';
const logger = getLogger('app');

const Settings = {
	defaults: {
		place: 'Moscow',
		units: 'imperial'
	},
	cache: {
		cache_enabled: true,
		aggressive_prefetch: false,
		prefetch_min_query_length: 4, // minimum length of entire query
		prefetch_min_token_length: 2, // minimum length of the last token
		prefetch_ignore_last_char: [' '] // ignore queries ending in these
	},
	reinterpret: {
		guess_us: true
	}
};

const initSettings = () => {
	let queryString = Util.parseQueryString(location.search);
	if(queryString.q) Settings.defaults.place = queryString.q;
	if(queryString.u) Settings.defaults.units = queryString.u;
};

const sanitizePlace = (place) => {
	place = place
		.replace(/[\(\)\{\}~!@#$%^&*_+<>?/:;\\"`]/g, ' ')
		.replace(/ +/g, ' ')
		.toLocaleLowerCase();
	return place;
};

const requestAllWeather = async (place, units) => {
	logger.debug(`Requesting all weather for ${place}`);
	const uri = `/api/v1/owm?q=${encodeURIComponent(place)}&u=${units}`;
	const options = {
		'Accept-Encoding': '*'
	};
	let res = (Settings.cache.cache_enabled ? fetch_cache(uri, options) : fetch(uri, options));
	let data = await res.then(res => res.json());
	if(data.status.code === 404 && Settings.reinterpret.guess_us) {
		let possibleState = place.split(' ').slice(-1)[0];
		if(possibleState.length === 2 && possibleState.toLocaleLowerCase() !== 'us') {
			return requestAllWeather(place + ' us', units);
		}
	}
	return data;
};

const prefetch = async (place, units) => {
	if(
		place
		&& place.length >= Settings.cache.prefetch_min_query_length
		&& !Settings.cache.prefetch_ignore_last_char.includes(place.slice(-1))
		&& place.split(' ').slice(-1)[0].length >= Settings.cache.prefetch_min_token_length
	) {
		logger.debug(`Prefetching ${place} with ${units} units`);
		requestAllWeather(place, units);
	}
};

// Convert unix timestamps to Date objects, and add the timezone to each.
// After this operation, what the computer thinks is Zulu time will
// actually be local to the weather location. Use the UTC methods on the
// Date object after this point.
const convertTimes = (data) => {
	const convert = (timestamp) => new Date(1000*(timestamp + data.time.timezone));
	if(data.time) {
		data.time.timestamp = convert(data.time.timestamp);
	}
	if(data.current) {
		data.current.time.timestamp = convert(data.current.time.timestamp);
		data.current.time.sunrise = convert(data.current.time.sunrise);
		data.current.time.sunset = convert(data.current.time.sunset);
	}

	if(data.forecast) {
		data.forecast.time.sunrise = convert(data.forecast.time.sunrise);
		data.forecast.time.sunset = convert(data.forecast.time.sunset);
		data.forecast.weather.forEach(record => {
			record.time.timestamp = convert(record.time.timestamp);
			['sunrise', 'sunset'].forEach(evt => {
				record.time[evt] = new Date(data.forecast.time[evt]);
				record.time[evt].setUTCDate(record.time.timestamp.getUTCDate());
				record.time[evt].setUTCMonth(record.time.timestamp.getUTCMonth());
				record.time[evt].setUTCFullYear(record.time.timestamp.getUTCFullYear());
			});
			record.time.daytime = WeatherUtil.isDaytime(record);
		});
	}
	return data;
};

const cleanWeatherData = (data) => {
	if(data.current) {
		data.current.weather.temp = Math.round(data.current.weather.temp);
		data.current.weather.wind.speed = Math.round(data.current.weather.wind.speed);
	}

	if(data.forecast) {
		data.forecast.weather.forEach(record => {
			record.weather.temp = Math.round(record.weather.temp);
			record.weather.wind.speed = Math.round(record.weather.wind.speed);
		});
	}
	convertTimes(data);
	return data;
};

const summarizeForecast = (forecast) => {
	let workingSet = forecast.filter(record => record.time.daytime);
	if(workingSet.length < 1) workingSet = forecast;
	const temps = workingSet.map(record => record.weather.temp);
	const wind_speeds = workingSet.map(record => record.weather.wind.speed);
	const conditions = workingSet.map(record => record.weather.short);
	const summary = {
		"status": {
			"type": "summary"
		},
		"time": {
			"timestamp": forecast[0].time.timestamp,
			"daytime": workingSet.some(record => record.time.daytime)
		},
		"weather": {
			"short": WeatherUtil.getMostInterestingCondition(conditions),
			"temp": Math.round(Util.mean(temps)),
			"wind": {
				"speed": Math.round(Util.mean(wind_speeds))
			}
		}
	};
	console.log('Summary:', summary, workingSet);
	return summary;
};

const partitionForecast = (current, forecast) => {
	const days = {};
	forecast.weather.forEach(record => {
		const day = Util.getTodayTomorrowDayName(record.time.timestamp, current.time.timestamp);
		if(days[day]) days[day].push(record);
		else days[day] = [record];
	});
	Object.keys(days).forEach(day => {
		days[day].unshift(summarizeForecast(days[day]));
	});
	if(days['Today'])
		days['Today'][0] = current;
	return days;
};

const displayWeather = (data) => {
	View.setPlace(data.current.place);
	View.clearSearchError();
	const dailyForecast = partitionForecast(data.current, data.forecast);
	View.populate(dailyForecast);
	View.setTheme(chooseTheme(data.current, data.forecast));
};

const displayError = (status) => {
	let message = '';
	switch(status.code) {
		case 404:
			message = 'Location not found'; break;
		default:
			message = Util.capitalizeFirst(status.message);
	}
	View.setSearchError(message);
};

const loadWeather = async (place, units) => {
	place = sanitizePlace(place);
	logger.debug(`Loading weather for ${place}`);
	let data = await requestAllWeather(place, units);
	if(data.status.ok) {
		cleanWeatherData(data);
		displayWeather(data);
		View.savePlace(`${data.place.coordinates.lat},${data.place.coordinates.long}`);
	} else {
		displayError(data.status);
	}
};

const attemptGeolocation = () => {
	if('geolocation' in navigator)
		navigator.geolocation.getCurrentPosition(
			pos => { loadWeather(pos.coords.latitude + ',' + pos.coords.longitude, Settings.defaults.units); }
		);
};

const loadFirstWeather = () => {
	loadWeather(Settings.defaults.place, Settings.defaults.units);
	if(!Util.parseQueryString(location.search).q)
		attemptGeolocation();
};

export const init = () => {
	logger.info('Starting Weatherboi');
	initSettings();
	View.init({
		onEnter: loadWeather,
		onSelectUnits: loadWeather,
		onType: Settings.cache.aggressive_prefetch ? prefetch : undefined,
		onHoverUnits: Settings.cache.aggressive_prefetch ? prefetch : undefined
	});
	View.setUnits(Settings.defaults.units);
	loadFirstWeather();
};
