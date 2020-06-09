import * as Themes from './themes.js';
import * as WeatherUtil from './weather_util.js';
import * as Util from './util.js';
import * as View from './view.js';
import { get as getLogger } from './logger.js';
const logger = getLogger('app');

const DEFAULT_PLACE = 'Salt Lake City';
const DEFAULT_UNITS = 'imperial'
// for testing
const BROKEN_PLACE = 'sldkjl sldl sljfkd j';

const sanitizePlace = (place) => {
	place = place
		.replace(/[\(\)\{\}~!@#$%^&*_+<>?/:;,.\\"`]/g, ' ')
		.replace(/ +/g, ' ')
		.toLocaleLowerCase();
	return place;
};

const requestAllWeather = async (place) => {
	logger.debug(`Requesting all weather for ${place}`);
	const uri = `/api/v1/owm?q=${encodeURIComponent(place)}&u=${View.getUnits()}`;
	const options = {
		'Accept-Encoding': '*'
	};
	return fetch(uri, options);
};

const convertTimes = (data) => {
	const convert = (timestamp) => new Date(1000*(timestamp));
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

const loadWeather = async (place) => {
	place = sanitizePlace(place);
	logger.debug(`Loading weather for ${place}`);
	let data = await requestAllWeather(place).then(res => res.json());
	console.log(data);
	if(data.current.status.ok) {
		cleanWeatherData(data);
		displayWeather(data);
	} else {
		displayError(data.current.status);
	}
};

export const init = () => {
	logger.info('Starting Weatherboi');
	View.setUnits(DEFAULT_UNITS);
	loadWeather(DEFAULT_PLACE);
	loadWeather(BROKEN_PLACE);
};
