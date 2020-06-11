// https://openweathermap.org/weather-conditions
// has some relevant information

const Settings = {
	time_epsilon: 1 * 60 * 60 // s
	, cloudy_threshold: 30 // percent of the sky i guess?
	, high_wind_threshold: {
		'imperial': 20 // mi/h
		, 'metric': 32 // km/h
		, 'si': 9 // m/s
	}
	, special_cases: [
		'thunderstorm'
		, 'mist'
		, 'smoke'
		, 'haze'
		, 'dust'
		, 'fog'
		, 'sand'
		, 'ash'
		, 'squall'
		, 'tornado'
	]
	, horizon: 8 // measurement periods to look ahead
};

const timeIsNear = (a, b) => {
	let left  = (a.constructor.name === 'Date') ? a : new Date(a);
	let right = (b.constructor.name === 'Date') ? b : new Date(b);
	left  =  left.getTime()/1000;
	right = right.getTime()/1000;
	return Math.abs(left-right) < Settings.time_epsilon;
};

// 10 special cases
// 5 * 4 * 3 * 2 * 2 = 240 regular cases
export const chooseTheme = (current, forecast) => {
	// condition is one of
	// drizzle, rain, snow, clear, clouds, or some special case
	let condition = current.weather.short.toLocaleLowerCase();

	// special cases
	if(Settings.special_cases.includes(condition)) return condition;

	// time is day, night, morning, or evening
	let time = current.time.daytime?'day':'night';
	if(timeIsNear(current.time.timestamp, current.time.sunrise))
		time = 'morning';
	if(timeIsNear(current.time.timestamp, current.time.sunset))
		time = 'evening';

	let recentRain = current.weather.rain > 0;
	let recentSnow = current.weather.snow > 0;
	let recentPrecip = null;
	if(recentRain) recentPrecip = 'rain';
	if(recentSnow) recentPrecip = 'snow';
	let upcomingClouds = forecast.weather.slice(0,Settings.horizon)
		.map(record => record.weather.clouds >= Settings.cloudy_threshold)
		.reduce((x,y) => x||y);
	let windy = current.weather.wind.speed
		>= Settings.high_wind_threshold[current.status.units];

	let state = {
		condition, time
		, windy
		, upcomingClouds
		, recentPrecip
	};
	console.log(state);

	let names = [
		state.time
		, state.condition
		, state.windy ? 'windy' : 'calm'
		, state.upcomingClouds ? 'soon-cloudy' : 'soon-clear'
	];
	if(state.recentPrecip) names.push('-was-' + state.recentPrecip);
	console.log(names);
	return names;
};

