import * as Util from './util.js';
import * as WeatherUtil from './weather_util.js';
import * as View from './view.js';
import { fetch_cache } from './cache.js';
import { get as getLogger } from './logger.js';
const logger = getLogger('app');

const Settings = {
	defaults: {
		place: 'Salt Lake City',
		units: 'imperial'
	},
	cache: {
		cache_enabled: true,
		aggressive_prefetch: true,
		prefetch_min_query_length: 4
	}
};

const initSettings = () => {
	let queryString = Util.parseQueryString(location.search);
	if(queryString.q) Settings.place = queryString.q;
	if(queryString.u) Settings.units = queryString.u;
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
	return res.then(res => res.json());
};

const prefetch = async (place, units) => {
	if(place && place.length >= Settings.cache.prefetch_min_query_length) {
		logger.debug(`Prefetching ${place} with ${units} units`);
		requestAllWeather(place, units);
	}
};

const convertTimes = (data) => {
	const convert = (timestamp) => new Date(1000*(timestamp));
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
				record.time[evt].setDate(record.time.timestamp.getDate());
			});
			record.time.daytime =
					record.time.sunrise <= record.time.timestamp
					&& record.time.timestamp <= record.time.sunset;
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

const chooseTheme = (current, forecast) => {
	return 'unimplemented';
};

const summarizeForecast = (forecast) => {
	let workingSet = forecast.filter(record => record.time.daytime);
	if(workingSet.length < 1) workingSet = forecast;
	const temps = workingSet.map(record => record.weather.temp);
	const wind_speeds = workingSet.map(record => record.weather.wind.speed);
	const conditions = workingSet.map(record => record.weather.short);
	return {
		"status": {
			"type": "summary"
		},
		"time": {
			"timestamp": forecast[0].time.timestamp
		},
		"weather": {
			"short": WeatherUtil.getMostInterestingCondition(conditions),
			"temp": Math.round(Util.mean(temps)),
			"wind": {
				"speed": Math.round(Util.mean(wind_speeds))
			}
		}
	};
};

const partitionForecast = (current, forecast) => {
	const days = {};
	forecast.weather.forEach(record => {
		const day = Util.getTodayTomorrowDayName(record.time.timestamp);
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
	View.setTheme(chooseTheme(data.current, data.forecast));
	data.forecast = partitionForecast(data.current, data.forecast);
	View.populate(data.forecast);
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

export const init = () => {
	logger.info('Starting Weatherboi');
	initSettings();
	View.init({
		onEnter: loadWeather,
		onType: Settings.cache.aggressive_prefetch ? prefetch : undefined,
		onSelectUnits: loadWeather
	});
	View.setUnits(Settings.defaults.units);
	loadWeather(Settings.defaults.place);
};
